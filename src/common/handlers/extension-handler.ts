import { Cleanable, CleanableResourceHandler, Importable, ImportableResourceHandler, Context, ResourceHandler } from "./resource-handler"
import { Hub, Extension } from "dc-management-sdk-js"
import { paginator } from "../paginator"
import _ from 'lodash'
import logger from "../logger"
import chalk from 'chalk'
import { HubOptions, MappingOptions } from "../interfaces"
import { Arguments } from "yargs"
import fs from 'fs-extra'
import { prompts } from "../prompts"
import { HubSettingsOptions } from "../settings-handler"

import { customAlphabet } from "nanoid"
import { lowercase } from "nanoid-dictionary"
const nanoid = customAlphabet(lowercase, 50)

export class ExtensionImportHandler extends ImportableResourceHandler {
    constructor() {
        super(Extension, 'extensions')
        this.icon = '⚙️'
        this.sortPriority = 1.1
    }

    async import(argv: HubSettingsOptions): Promise<any> {
        const { hub } = argv
        let extensions = fs.readJsonSync(`${global.tempDir}/content/extensions/extensions.json`)

        const existingExtensions = await paginator(hub.related.extensions.list)
        await Promise.all(extensions.map(async (ext: any) => {
            try {
                if (!_.includes(_.map(existingExtensions, 'name'), ext.name)) {
                    logger.info(`${prompts.import} extension [ ${ext.name} ]`)
                    let extension = await hub.related.extensions.create(ext)
                }
            } catch (error) {
                if (error.message.indexOf('EXTENSION_NAME_DUPLICATE')) {
                    logger.error(`${prompts.error} importing extension [ ${ext.name} ]: duplicate name`)
                }
                else {
                    logger.error(`${prompts.error} importing extension [ ${ext.name} ]: ${error.message}`)
                }
            }
        }))
    }
}

export class ExtensionCleanupHandler extends CleanableResourceHandler {
    constructor() {
        super(Extension, 'extensions')
        this.icon = '⚙️'
    }

    async cleanup(argv: Context): Promise<any> {
        try {
            let extensions = await paginator(argv.hub.related.extensions.list)
            await Promise.all(extensions.map(async ext => {
                let oldName = ext.name
                ext.name = nanoid()
                ext = await ext.related.update(ext)
                await ext.related.delete()
                logger.info(`${chalk.red('delete')} extension [ ${oldName} ]`)
            }))
        } catch (error) {
            logger.error(error.message || error)
        }
    }
}