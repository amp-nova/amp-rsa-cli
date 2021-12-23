import _, { Dictionary } from 'lodash'
import { Arguments, Argv, boolean } from 'yargs';
// import { fstat, readFileSync, writeFileSync, existsSync } from 'fs';
import fs from 'fs-extra'
import axios from 'axios'
import { currentEnvironment } from '../common/environment-manager'
import { DynamicContent, ContentRepository, ContentItem, Status, WorkflowState, ContentType } from 'dc-management-sdk-js'
import chalk from 'chalk'
import logger from './logger'

import { ContentTypeSchemaImportHandler } from './handlers/content-type-schema-handler';
import { ContentTypeImportHandler } from './handlers/content-type-handler';

import { paginator, searchIndexPaginator } from './paginator';

import amplience from './amplience-helper';
import { Context } from './handlers/resource-handler';
import { HubOptions, Mapping, MappingOptions } from './interfaces';
import { ContentItemImportHandler } from './handlers/content-item-handler';
import { copyTemplateFilesToTempDir } from './import-helper';
import { ExtensionImportHandler } from './handlers/extension-handler';
import { SearchIndexImportHandler } from './handlers/search-index-handler';
import { SettingsImportHandler } from './handlers/settings-handler';
import { Stats } from 'fs';
import { DAMService } from './dam/dam-service';
import { logRunEnd } from './status-helper';
import { logHeadline } from './logger';

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
const installContent = async (argv: HubSettingsOptions) => {
    let contentItemHandler = new ContentItemImportHandler(`${global.tempDir}/content`)
    await contentItemHandler.import(argv)
}

const installContentTypes = async (argv: HubSettingsOptions) => {
    await installContentTypeSchemas(argv)
    let contentTypeHandler = new ContentTypeImportHandler(`${global.tempDir}/content`)
    await contentTypeHandler.import(argv)
}

const installContentTypeSchemas = async (argv: HubSettingsOptions) => {
    let contentTypeSchemaHandler = new ContentTypeSchemaImportHandler(`${global.tempDir}/content`)
    await contentTypeSchemaHandler.import(argv)
}

const getDAMAssets = async (argv: Context) => {
    let assets = await argv.damService.getAssetsListForBucket('Assets')
    return _.filter(assets, asset => asset.status === 'active')
}

const readDAMMapping = async (argv: Context) => {
    let assets = await getDAMAssets(argv)
    return _.zipObject(_.map(assets, x => _.camelCase(x.name)), _.map(assets, 'id'))
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

const readAutomation = async (argv: Context) => {
    let { env } = currentEnvironment()
    let deliveryKey = `aria/automation/${argv.ariaKey}`

    let automation = contentMap[deliveryKey]?.body as any
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

        let a = await amplience.createAndPublishContentItem(automationItem, argv.repositories.content)
        automation = a.body
        automation._meta.deliveryId = a.id
    }

    fs.writeJsonSync(`${global.tempDir}/mapping.json`, {
        contentItems: _.map(automation.contentItems, ci => [ci.from, ci.to]),
        workflowStates: _.map(automation.workflowStates, ws => [ws.from, ws.to])
    })
    logger.info(`wrote mapping file at ${global.tempDir}/mapping.json`)

    return automation
}

const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))
const updateAutomation = async (automation: any, mappingStats: Stats, argv: Context) => {
    // read the mapping file and update if necessary
    let newMappingStats = fs.statSync(`${global.tempDir}/mapping.json`)
    if (newMappingStats.size !== mappingStats.size) {
        logger.info(`updating mapping...`)

        // update the object
        let newMapping = fs.readJsonSync(`${global.tempDir}/mapping.json`)

        logger.info(`saving mapping...`)

        let automationItem = await argv.client.contentItems.get(automation._meta.deliveryId)
        automationItem.body = {
            ...automationItem.body,
            contentItems: _.map(newMapping.contentItems, x => ({ from: x[0], to: x[1] })),
            workflowStates: _.map(newMapping.workflowStates, x => ({ from: x[0], to: x[1] }))
        }

        automationItem = await automationItem.related.update(automationItem)
        await amplience.publishContentItem(automationItem)
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

export const settingsHandler = async (argv: Context, desc: string, command: string, callback: any) => {
    try {
        logger.info(`${chalk.green(command)}: ${desc} started at ${chalk.magentaBright(argv.startTime)}`)

        // get DC & DAM configuration
        let { env } = currentEnvironment()
        let { hub, damService } = argv

        logHeadline(chalk.greenBright(`Phase 1: preparation`))

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
            dam: {
                imagesMap: await readDAMMapping(argv)
            }
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
            ...envConfig
        }

        mapping.cms = {
            ...mapping.cms,
            repositories: _.zipObject(_.map(repositories, r => r.name || ''), _.map(repositories, 'id')),
            workflowStates: _.zipObject(_.map(workflowStates, ws => _.camelCase(ws.label)), _.map(workflowStates, 'id')),
            hubs: _.keyBy(mapping.cms.hubs, 'key')
        }

        // read the automation content
        let automation = await readAutomation(argv)
        let mappingStats = fs.statSync(`${global.tempDir}/mapping.json`)

        copyTemplateFilesToTempDir(argv.automationDir as string, mapping)

        logHeadline(chalk.greenBright(`Phase 2: import/update`))

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

            logHeadline(chalk.greenBright(`Phase 3: reentrant import`))

            // process step 7: npm run automate:schemas
            // now that we've installed the core content, we need to go through again for content types
            // that point to a specific hierarchy node
            await readHierarchies(argv)

            // recopy template files with new mappings
            copyTemplateFilesToTempDir(argv.automationDir as string, mapping)
            await installContentTypes(argv)

            logHeadline(chalk.greenBright(`Phase 4: cleanup`))

            // update the automation content item with any new mapping content generated
            await updateAutomation(automation, mappingStats, argv)
        }
    } catch (error) {
        logger.error(error.message);
        logger.error(JSON.stringify(error));
    } finally {
        logRunEnd(argv)
    }
}

const damAutomation = async (argv: Context) => {
    if (false) { // remove DAM automation for now
        // process step 0: npm run automate:media
        let assetsBucket = await argv.damService.getBucketByName('Assets')
        const damFolders = await argv.damService.getFoldersList(assetsBucket.id);
        let damAssets = await getDAMAssets(argv)
        let damFilesList = fs.readFileSync(`${argv.automationDir}/dam-images/list.txt`, { encoding: 'utf-8' }).split('\n')
        let unpublishedDAMAssets = _.filter(damFilesList, fileName => fileName.indexOf('/') === 0 || !_.includes(_.map(damAssets, 'srcName'), fileName))

        // Extract folders
        const folders = damFilesList
            .filter((value: any) => (value.Size === 0 && value.Key[value.Key.length - 1] === '/'))
            .map((item: any) => item.Key.substr(0, item.Key.length - 1))
            .sort();

        // Create folders
        const folderMap: any = {};
        for (let i = 0; i < folders.length; i++) {
            const key = folders[i];
            const label = key.split('/').slice(-1)[0];
            const folder = damFolders.find((y: any) => y.label === label);
            if (folder) {
                // console.log(`Found folder ${folder.label} with ID ${folder.id}`);
                folderMap[folder.label] = folder.id;
            } else {
                // console.log(`No folder found for label ${label}`);
                // console.log(`Creating folder ${label}`);
                const folderArray = key.split('/');
                let parentId: any;
                if (folderArray.length > 1) {
                    const parent = folderArray[folderArray.length - 2];
                    if (parent && folderMap[parent]) {
                        // console.log(`Parent ${parent} found with ID ${folderMap[parent]}`)
                        parentId = folderMap[parent];
                    }
                }

                const payload: any = [{
                    label,
                    bucketId: assetsBucket.id
                }];

                if (parentId) payload[0].parentId = parentId;
                // console.log(payload);

                folderMap[label] = await argv.damService.createFolder(payload);
            }
        };

        const imagesMap = _.map(unpublishedDAMAssets, filepath => {
            const folderArray = filepath.split('/');
            let folderID: any;
            if (folderArray.length > 1) {
                const parent = folderArray[folderArray.length - 2];
                if (parent && folderMap[parent]) {
                    // console.log(`Parent ${parent} found with ID ${folderMap[parent]}`)
                    folderID = folderMap[parent];
                }
            }

            const path = filepath.split('/');
            const filename = path[path.length - 1];
            const name = filename.split('.').slice(0, -1).join('.')

            // Check type
            let type = name.endsWith('.html') || name.endsWith('.htm') || name.endsWith('.hbs') ? 'text' : 'image';
            const payload: any = {
                srcName: filename,
                src: `https://nova-dam-assets-anyafinn.s3.eu-west-3.amazonaws.com/${filename}`,
                label: name,
                name: name,
                type,
                bucketID: assetsBucket.id
            };
            if (folderID) payload.folderID = folderID;
            return payload;
        })

        logger.info(`uploading ${imagesMap.length} images to DAM...`)

        argv.damService.createAssets({
            mode: "overwrite",
            assets: imagesMap
        });

        damAssets = await getDAMAssets(argv)

        _.each(damAssets, da => {
            if (da.name === 'desktop-3-coatsblog') {
                console.log(da)
            }
        })

        let unpublishedAssets = _.filter(damAssets, da => da.publishStatus !== 'PUBLISHED')

        console.log(`unpublished: ${unpublishedAssets}`)

        // await damService.publishAssets({
        //     prefix: "publish",
        //     assets: unpublishedAssets.map((item: any) => item.id)
        // });
    }

}