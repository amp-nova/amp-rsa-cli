import _, { Dictionary } from 'lodash'
import { Argv } from 'yargs';
import fs from 'fs-extra'
import { currentEnvironment } from '../common/environment-manager'
import { ContentRepository, ContentItem, WorkflowState } from 'dc-management-sdk-js'
import chalk from 'chalk'
import logger, { logHeadline, logRunEnd } from '../common/logger';

import { ContentTypeSchemaImportHandler } from '../common/handlers/content-type-schema-handler';
import { ContentTypeImportHandler } from '../common/handlers/content-type-handler';

import { paginator, searchIndexPaginator } from '../common/paginator';

import amplience from '../common/amplience-helper';
import { Context } from '../common/handlers/resource-handler';
import { HubOptions, Mapping, MappingOptions } from '../common/interfaces';
import { ContentItemImportHandler } from '../common/handlers/content-item-handler';
import { copyTemplateFilesToTempDir } from '../common/import-helper';
import { ExtensionImportHandler } from '../common/handlers/extension-handler';
import { SearchIndexImportHandler } from '../common/handlers/search-index-handler';
import { SettingsImportHandler } from '../common/handlers/settings-handler';
import { Stats } from 'fs';
import { DAMService } from '../common/dam/dam-service';

const { Input } = require('enquirer');

const childProcess = require('child_process');
if (!childProcess._execSync) {
    childProcess._execSync = childProcess.execSync
    childProcess.execSync = (cmd: any) => {
        logger.info(`${chalk.greenBright(cmd)}`)
        return childProcess._execSync(cmd)
    }
}

export const settingsBuilder = (yargs: Argv): Argv =>
    yargs
        .options({
            automationDir: {
                alias: 'a',
                describe: 'path to automation directory',
                default: '.'
            },
            ariaKey: {
                alias: 'k',
                describe: 'key to an aria configuration object',
                default: 'default'
            },
            include: {
                alias: 'i',
                describe: 'types to include'
            },
            skipConfirmation: {
                alias: 'c',
                describe: 'skip confirmation prompt',
                type: 'boolean'
            },
            skipContentImport: {
                describe: 'skip content import',
                type: 'boolean'
            }
        })
        .array('include')
        .help();

export type HubSettingsOptions = HubOptions & MappingOptions
const installContent = async (context: Context) => {
    let contentItemHandler = new ContentItemImportHandler(`${global.tempDir}/content`)
    await contentItemHandler.import(context)
}

const installContentTypes = async (context: Context) => {
    await installContentTypeSchemas(context)
    let contentTypeHandler = new ContentTypeImportHandler(`${global.tempDir}/content`)
    await contentTypeHandler.import(context)
}

const installContentTypeSchemas = async (context: Context) => {
    let contentTypeSchemaHandler = new ContentTypeSchemaImportHandler(`${global.tempDir}/content`)
    await contentTypeSchemaHandler.import(context)
}

const getDAMAssets = async (argv: Context) => {
    let assets = await argv.damService.getAssetsListForBucket('Assets')
    return _.filter(assets, asset => asset.status === 'active')
}

const readDAMMapping = async (argv: Context) => {
    let assets = await getDAMAssets(argv)
    let endpoints = await argv.damService.getEndpoints()
    let endpoint: any = _.first(endpoints)!
    return {
        mediaEndpoint: endpoint.tag,
        imagesMap: _.zipObject(_.map(assets, x => _.camelCase(x.name)), _.map(assets, 'id'))
    }
}

let contentMap: Dictionary<ContentItem> = {}
const cacheContentMap = async (repo: ContentRepository) => {
    let oldContentItemCount = Object.values(contentMap).length
    let contentItems = await paginator(repo.related.contentItems.list, { status: 'ACTIVE' })
    contentMap = _.keyBy(contentItems, 'body._meta.deliveryKey')

    if (contentItems.length - oldContentItemCount > 0) {
        logger.info(`${chalk.blueBright('contentItems')}: [ ${chalk.green(contentItems.length - oldContentItemCount)} created ]`)
    }
}

const initAutomation = async (argv: Context) => {
    let automation = await readAutomation(argv)

    fs.writeJsonSync(`${global.tempDir}/mapping.json`, {
        contentItems: _.map(automation.contentItems, ci => [ci.from, ci.to]),
        workflowStates: _.map(automation.workflowStates, ws => [ws.from, ws.to])
    })

    // copy so we can compare later after we do an import
    fs.copyFileSync(`${global.tempDir}/mapping.json`, `${global.tempDir}/old_mapping.json`)
    logger.info(`wrote mapping file at ${global.tempDir}/mapping.json`)
}

const readAutomation = async (argv: Context) => {
    let { env } = currentEnvironment()
    let deliveryKey = `aria/automation/${argv.ariaKey}`

    let automation = contentMap[deliveryKey] as any
    if (!automation) {
        logger.info(`${deliveryKey} not found, creating...`)
        let automationItem = {
            label: `${env.name} AMPRSA automation`,
            folderId: null,
            body: {
                _meta: {
                    name: `${env.name} AMPRSA automation`,
                    schema: `https://amprsa.net/amprsa/automation`,
                    deliveryKey
                },
                contentItems: [],
                workflowStates: []
            }
        }
        automation = await amplience.createAndPublishContentItem(automationItem, argv.repositories.content)
    }

    return automation
}

const updateAutomation = async (argv: Context) => {
    // read the mapping file and update if necessary
    let mappingStats = fs.statSync(`${global.tempDir}/old_mapping.json`)
    let newMappingStats = fs.statSync(`${global.tempDir}/mapping.json`)

    if (newMappingStats.size !== mappingStats.size) {
        logger.info(`updating mapping...`)

        // update the object
        let newMapping = fs.readJsonSync(`${global.tempDir}/mapping.json`)

        logger.info(`saving mapping...`)

        let automation = await readAutomation(argv)
        automation.body = {
            ...automation.body,
            contentItems: _.map(newMapping.contentItems, x => ({ from: x[0], to: x[1] })),
            workflowStates: _.map(newMapping.workflowStates, x => ({ from: x[0], to: x[1] }))
        }

        automation = await automation.related.update(automation)
        await amplience.publishContentItem(automation)
    }
}

const readHierarchies = async (argv: HubSettingsOptions) => {
    let { mapping } = argv
    let taxonomies = contentMap['hierarchy/taxonomies'] as any
    let configuration = contentMap['hierarchy/configuration'] as any
    mapping.cms.hierarchies = {
        taxonomies: taxonomies?._meta.deliveryId,
        configuration: configuration?._meta.deliveryId
    }
}

const readEnvConfig = async (argv: Context) => {
    let { env } = currentEnvironment()
    let { hub, mapping, ariaKey } = argv
    let deliveryKey = `aria/env/${ariaKey}`

    logger.info(`read settings for key ${chalk.blueBright(deliveryKey)} on hub ${chalk.magentaBright(hub.name)} `)

    const stagingApi = await hub.settings?.virtualStagingEnvironment?.hostname || ''

    let envConfig = contentMap[deliveryKey]?.body
    if (!envConfig) {
        logger.info(`${deliveryKey} not found, creating...`)

        const name = env.name

        let config = {
            label: `${env.name} AMPRSA config`,
            folderId: null,
            body: {
                ...mapping,
                _meta: {
                    name: `${env.name} AMPRSA config`,
                    schema: `https://amprsa.net/amprsa/config`,
                    deliveryKey
                },
                environment: name,
                algolia: {
                    indexes: [{
                        key: 'blog',
                        prod: `${name}.blog-production`,
                        staging: `${name}.blog-staging`
                    }, {
                        key: 'ruleBased',
                        prod: `${name}.rule-based-production`,
                        staging: `${name}.rule-based-staging`
                    }, {
                        key: 'productListSearch',
                        prod: 'prod_willow_products',
                        staging: ''
                    }]
                },
                cms: {
                    hub: {
                        name,
                        stagingApi,
                        socketIoServer: 'https://socketio.prod.nova.amprsa.net'
                    },
                    hubs: [{
                        key: 'productImages',
                        name: 'willow'
                    }]
                }
            }
        }

        // process step 8: npm run automate:webapp:configure
        envConfig = (await amplience.createAndPublishContentItem(config, argv.repositories.content)).body
    }
    return envConfig
}

export const builder = (yargs: Argv): void => { settingsBuilder(yargs).array('include') }

export const command = 'import';
export const desc = "Import hub data";

export const handler = async (argv: Context): Promise<void> => {
    try {
        logger.info(`${chalk.green(command)}: ${desc} started at ${chalk.magentaBright(argv.startTime)}`)

        // get DC & DAM configuration
        let { env } = currentEnvironment()
        let { hub, damService } = argv

        logHeadline(`Phase 1: preparation`)

        let workflowStates: WorkflowState[] = await paginator(hub.related.workflowStates.list)
        let repositories: ContentRepository[] = await paginator(hub.related.contentRepositories.list)

        let content = _.find(repositories, repo => repo.name === 'content')
        let siteComponents = _.find(repositories, repo => repo.name === 'sitestructure')

        if (!content) {
            throw new Error(`repository 'content' not found, please make sure it exists`)
        }

        if (!siteComponents) {
            throw new Error(`repository 'sitestructure' not found, please make sure it exists`)
        }

        // add the content repository to our context
        argv.repositories = {
            content,
            siteComponents
        }

        // caching a map of current content items. this appears to obviate the issue of archived items
        // hanging out on published delivery keys
        await cacheContentMap(content)

        let mapping: any = {
            app: { url: env.url },
            dam: await readDAMMapping(argv)
        }

        // set up our mapping template
        argv.mapping = mapping
        copyTemplateFilesToTempDir(argv.automationDir as string, mapping)

        // process step 2: npm run automate:schemas
        await installContentTypes(argv)

        // read the configuration content
        let envConfig = await readEnvConfig(argv)
        argv.mapping = mapping = {
            ...mapping,
            ...envConfig,
            dam: await readDAMMapping(argv),
            cms: {
                ...envConfig.cms,
                repositories: _.zipObject(_.map(repositories, r => r.name || ''), _.map(repositories, 'id')),
                workflowStates: _.zipObject(_.map(workflowStates, ws => _.camelCase(ws.label)), _.map(workflowStates, 'id')),
                hubs: _.keyBy(envConfig.cms.hubs, 'key')
            }
        }

        // read the automation content
        await initAutomation(argv)

        copyTemplateFilesToTempDir(argv.automationDir as string, mapping)

        logHeadline(`Phase 2: import/update`)

        // process step 1: npm run automate:settings
        await new SettingsImportHandler().import(argv)

        // process step 4: npm run automate:extensions
        await new ExtensionImportHandler().import(argv)

        // process step 5: npm run automate:indexes
        await new SearchIndexImportHandler().import(argv)

        if (!argv.skipContentImport) {
            // process step 6: npm run automate:content-with-republish
            await installContent(argv)

            // recache
            await cacheContentMap(content)

            logHeadline(`Phase 3: reentrant import`)

            // process step 7: npm run automate:schemas
            // now that we've installed the core content, we need to go through again for content types
            // that point to a specific hierarchy node
            await readHierarchies(argv)

            // recopy template files with new mappings
            copyTemplateFilesToTempDir(argv.automationDir as string, mapping)
            await installContentTypes(argv)

            logHeadline(`Phase 4: cleanup`)

            // update the automation content item with any new mapping content generated
            await updateAutomation(argv)
        }
    } catch (error) {
        logger.error(error.message);
    } finally {
        logRunEnd(argv)
    }    
}