import { ResourceHandler, Context, Cleanable, ImportContext, CleanupContext } from "./resource-handler"
import { Extension } from "dc-management-sdk-js"
import { paginator } from "../paginator"
import _ from 'lodash'
import logger, { logComplete, logSubheading, logUpdate } from "../logger"
import chalk from 'chalk'
import fs from 'fs-extra'
import { prompts } from "../prompts"

import { customAlphabet } from "nanoid"
import { lowercase } from "nanoid-dictionary"
const nanoid = customAlphabet(lowercase, 50)

export class ExtensionHandler extends ResourceHandler implements Cleanable {
    icon = '🔌'
    sortPriority = 1.1

    constructor() {
        super(Extension, 'extensions')
    }

    async import(context: ImportContext): Promise<any> {
        const { hub } = context
        logSubheading(`[ import ] extensions`)

        let extensionsFile = `${context.tempDir}/content/extensions/extensions.json`
        if (!fs.existsSync(extensionsFile)) {
            logger.info(`skipped, content/extensions/extensions.json not found`)
            return
        }

        let extensions = fs.readJsonSync(extensionsFile)

        const existingExtensions = await paginator(hub.related.extensions.list)
        let createCount = 0

        await Promise.all(extensions.map(async (ext: Extension) => {
            try {
                if (!_.includes(_.map(existingExtensions, 'name'), ext.name)) {
                    logUpdate(`${prompts.import} extension [ ${ext.name} ]`)
                    let extension = await hub.related.extensions.create(ext)
                    createCount++
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

        logComplete(`${this.getDescription()}: [ ${chalk.green(createCount)} created ]`)
    }

    async cleanup(context: CleanupContext): Promise<any> {
        logSubheading(`[ cleanup ] extensions`)
        try {
            let deleteCount = 0
            let extensions: Extension[] = await paginator(context.hub.related.extensions.list)
            await Promise.all(extensions.map(async ext => {
                let oldName = ext.name
                ext.name = nanoid()
                ext = await ext.related.update(ext)
                deleteCount++
                await ext.related.delete()
                logUpdate(`${chalk.red('delete')} extension [ ${oldName} ]`)
            }))
            logComplete(`${this.getDescription()}: [ ${chalk.red(deleteCount)} deleted ]`)
        } catch (error) {
            logger.error(error.message || error)
        }
    }
}