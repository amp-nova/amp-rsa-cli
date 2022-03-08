import _ from 'lodash'
import { Argv } from 'yargs';
import chalk from 'chalk'
import logger, { logHeadline, logUpdate } from '../common/logger';

import { ContentTypeSchemaHandler } from '../handlers/content-type-schema-handler';
import { ContentTypeHandler } from '../handlers/content-type-handler';
import { timed } from "../handlers/typed-result";
import { ContentItemHandler } from '../handlers/content-item-handler';
import { ExtensionHandler } from '../handlers/extension-handler';
import { SearchIndexHandler } from '../handlers/search-index-handler';
import { SettingsHandler } from '../handlers/settings-handler';

import amplience, { getEnvConfig, initAutomation, readDAMMapping } from '../common/amplience-helper';
import { ImportContext } from '../handlers/resource-handler';
import { copyTemplateFilesToTempDir } from '../helpers/import-helper';
import { contextHandler, loginDAM } from '../common/middleware';
import amplienceBuilder from '../common/amplience-builder';
import { AMPRSAConfig } from '../common/types';
import { WorkflowState } from 'dc-management-sdk-js';
import { paginator } from '../helpers/paginator';
import fs from 'fs-extra'
import { CONFIG_PATH } from '../common/environment-manager';
import simpleGit from 'simple-git'

export const command = 'import';
export const desc = "Import hub data";

const automationDirPath = `${CONFIG_PATH}/amp-rsa-automation`
export const builder = (yargs: Argv): Argv => {
    return amplienceBuilder(yargs).options({
        automationDir: {
            alias: 'a',
            describe: 'path to automation directory',
            default: automationDirPath
        },
        skipContentImport: {
            alias: 's',
            describe: 'skip content import',
            type: 'boolean'
        },
        latest: {
            alias: 'l',
            describe: 'use latest automation files',
            type: 'boolean'
        }
    }).middleware([
        async (c: ImportContext) => await loginDAM(c),
        async (context: ImportContext) => {
            // delete the cached automation files if --latest was used
            if (context.latest) {
                await fs.rm(automationDirPath, { recursive: true })
            }

            // set up the automation dir if it does not exist and download the latest automation files
            if (!fs.existsSync(automationDirPath)) {
                logger.info(`downloading latest automation files...`)
                await simpleGit().clone('https://github.com/amp-nova/amp-rsa-automation', automationDirPath)
            }

            if (!_.isEmpty(context.matchingSchema)) {
                context.matchingSchema.push('https://amprsa.net/site/config')                    
                context.matchingSchema.push('https://amprsa.net/site/automation')                    
            }
        }
    ])
}

export const handler = contextHandler(async (context: ImportContext): Promise<void> => {
    logger.info(`${chalk.green(command)}: ${desc} started at ${chalk.magentaBright(context.startTime)}`)

    logHeadline(`Phase 1: preparation`)

    context.mapping = {
        ...context.mapping,
        url: context.environment.url
    }

    await copyTemplateFilesToTempDir(context)
    await timed('content-type-schema import', async () => { await new ContentTypeSchemaHandler().import(context) })
    await timed('content-type import', async () => { await new ContentTypeHandler().import(context) })
    context.config = await getEnvConfig(context)
    await copyTemplateFilesToTempDir(context)

    // create mapping
    let workflowStates: WorkflowState[] = await paginator(context.hub.related.workflowStates.list)
    context.mapping = {
        ...context.mapping,
        cms: {
            hub: context.config.cms.hub,
            hubs: context.config.cms.hubs,
            repositories: _.zipObject(_.map(Object.keys(context.hub.repositories)), _.map(Object.values(context.hub.repositories), 'id')),
            workflowStates: _.zipObject(_.map(workflowStates, ws => _.camelCase(ws.label)), _.map(workflowStates, 'id'))
        },
        algolia: context.config.algolia,
        dam: await readDAMMapping(context)
    }
    
    // await timed('content-type-schema import', async () => { await new CLIContentTypeSchemaHandler().import(context) })
    // await timed('content-type import', async () => { await new CLIContentTypeHandler().import(context) })

    logHeadline(`Phase 2: import/update`)

    await copyTemplateFilesToTempDir(context)

    // process step 1: npm run automate:settings
    await new SettingsHandler().import(context)

    // process step 4: npm run automate:extensions
    await new ExtensionHandler().import(context)

    // process step 5: npm run automate:indexes
    let algolia = await new SearchIndexHandler().import(context)

    if (algolia) {
        context.config.algolia.appId = algolia.appId
        context.config.algolia.apiKey = algolia.apiKey
        context.mapping.algolia = algolia
    }

    // save the env config here, since we've just gotten the app id and api key from algolia
    await amplience.updateEnvConfig(context)

    if (!context.skipContentImport) {
        await initAutomation(context)
        logger.debug(JSON.stringify(context.mapping, null, 4))

        // process step 6: npm run automate:content-with-republish
        await new ContentItemHandler().import(context)

        // recache
        await amplience.cacheContentMap(context)
        context.mapping.contentMap = amplience.getContentMap()

        logHeadline(`Phase 3: update automation`)

        // update the automation content item with any new mapping content generated
        await amplience.updateAutomation(context)
        
        logHeadline(`Phase 4: reentrant import`)

        // process step 7: npm run automate:schemas
        // now that we've installed the core content, we need to go through again for content types
        // that point to a specific hierarchy node
        logger.debug(JSON.stringify(context.mapping, null, 4))

        // recopy template files with new mappings
        await copyTemplateFilesToTempDir(context)

        // reimport content types that have been updated
        await new ContentTypeSchemaHandler().import(context)
        await new ContentTypeHandler().import(context)
    }
})