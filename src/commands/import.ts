import _ from 'lodash'
import { Argv } from 'yargs';
import { currentEnvironment } from '../common/environment-manager'
import chalk from 'chalk'
import logger, { logHeadline, logRunEnd } from '../common/logger';

import { ContentTypeSchemaHandler } from '../common/handlers/content-type-schema-handler';
import { ContentTypeHandler } from '../common/handlers/content-type-handler';
import { ContentItemHandler } from '../common/handlers/content-item-handler';
import { ExtensionHandler } from '../common/handlers/extension-handler';
import { SearchIndexHandler } from '../common/handlers/search-index-handler';
import { SettingsHandler } from '../common/handlers/settings-handler';

import amplience from '../common/amplience-helper';
import { Context } from '../common/handlers/resource-handler';
import { copyTemplateFilesToTempDir } from '../common/import-helper';

export const builder = (yargs: Argv): Argv =>
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
            },
            publishDelay: {
                alias: 'd',
                describe: 'milliseconds to wait between consecutive publishes',
                type: 'number',
                default: 750
            },
        })
        .array('include')
        .help();

export const command = 'import';
export const desc = "Import hub data";

export const handler = async (argv: Context): Promise<void> => {
    try {
        logger.info(`${chalk.green(command)}: ${desc} started at ${chalk.magentaBright(argv.startTime)}`)

        // get DC & DAM configuration
        let { env } = currentEnvironment()

        logHeadline(`Phase 1: preparation`)

        // we need the URL for viz
        let mapping: any = { app: { url: env.url } }

        // set up our mapping template
        argv.mapping = mapping
        argv.importSourceDir = `${global.tempDir}/content`

        copyTemplateFilesToTempDir(argv)

        // process step 2: npm run automate:schemas
        await new ContentTypeSchemaHandler().import(argv)
        await new ContentTypeHandler().import(argv)
    
        // caching a map of current content items. this appears to obviate the issue of archived items
        // hanging out on published delivery keys
        await amplience.cacheContentMap(argv)

        // read the configuration content
        let envConfig = await amplience.readEnvConfig(argv)

        argv.mapping = mapping = {
            ...mapping,
            ...envConfig
        }

        // read the automation content
        await amplience.initAutomation(argv)

        copyTemplateFilesToTempDir(argv)

        logHeadline(`Phase 2: import/update`)

        // process step 1: npm run automate:settings
        await new SettingsHandler().import(argv)

        // process step 4: npm run automate:extensions
        await new ExtensionHandler().import(argv)

        // process step 5: npm run automate:indexes
        await new SearchIndexHandler().import(argv)

        if (!argv.skipContentImport) {
            // process step 6: npm run automate:content-with-republish
            await new ContentItemHandler().import(argv)

            // recache
            await amplience.cacheContentMap(argv)

            logHeadline(`Phase 3: update automation`)

            // update the automation content item with any new mapping content generated
            await amplience.updateAutomation(argv)

            logHeadline(`Phase 4: reentrant import`)

            // process step 7: npm run automate:schemas
            // now that we've installed the core content, we need to go through again for content types
            // that point to a specific hierarchy node
            mapping.contentMap = amplience.getContentMap()

            // recopy template files with new mappings
            copyTemplateFilesToTempDir(argv)

            // reimport content types that have been updated
            await new ContentTypeSchemaHandler().import(argv)
            await new ContentTypeHandler().import(argv)
        }
    } catch (error) {
        if (error.message) {
            logger.error(error.message);
        }

        _.each(error.response?.data?.errors, error => {
            logger.error(`\t* ${chalk.bold.red(error.code)}: ${error.message}`)
        })

        logger.error(error.stack)
    } finally {
        logRunEnd(argv)
    }
}