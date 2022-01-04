import { CleanableResourceHandler, Importable, ImportableResourceHandler, Context, ResourceHandler } from "./resource-handler"
import { ContentTypeSchema } from "dc-management-sdk-js"
import { paginator } from "../paginator"
import _ from 'lodash'
import logger from "../logger"
import chalk from 'chalk'
import { HubOptions, MappingOptions } from "../interfaces"
import { Arguments } from "yargs"
import { loadJsonFromDirectory } from "../importer"
import { resolveSchemaBody } from "../schema-helper"
import { HubSettingsOptions } from "../../commands/import"
import fs from 'fs-extra'
import { logUpdate, logComplete } from '../logger'
import { prompts } from '../prompts'

export class ContentTypeSchemaImportHandler extends ImportableResourceHandler {
    sourceDir?: string

    constructor(sourceDir?: string) {
        super(ContentTypeSchema, 'contentTypeSchema', sourceDir)
        this.sortPriority = 0.01
        this.icon = '🗄'
    }

    async import(context: Context): Promise<any> {
        let { hub } = context
        let baseDir = this.sourceDir || `${global.tempDir}/content/core`
        this.sourceDir = `${baseDir}/content-type-schemas`

        if (!fs.existsSync(this.sourceDir)) {
            return
        }

        const schemas = loadJsonFromDirectory<ContentTypeSchema>(this.sourceDir, ContentTypeSchema);
        const [resolvedSchemas, resolveSchemaErrors] = await resolveSchemaBody(schemas, this.sourceDir);

        if (Object.keys(resolveSchemaErrors).length > 0) {
            const errors = Object.entries(resolveSchemaErrors)
                .map(value => {
                    const [filename, error] = value;
                    return `* ${filename} -> ${error}`;
                })
                .join('\n');
            throw new Error(`Unable to resolve the body for the following files:\n${errors}`);
        }

        let archiveCount = 0
        let updateCount = 0
        let createCount = 0

        const storedSchemas = await paginator(hub.related.contentTypeSchema.list);
        await Promise.all(Object.values(resolvedSchemas).map(async schema => {
            let stored = _.find(storedSchemas, s => s.schemaId === schema.schemaId)
            if (stored) {
                if (stored.status === 'ARCHIVED') {
                    archiveCount++
                    stored = await stored.related.unarchive()
                    logUpdate(`${chalk.green('unarch')} schema [ ${chalk.gray(schema.schemaId)} ]`)
                }

                if (!_.isEqual(stored.body, schema.body)) {
                    updateCount++
                    stored = await stored.related.update(schema)
                    logUpdate(`${chalk.green('update')} schema [ ${chalk.gray(schema.schemaId)} ]`)
                }
            }
            else {
                createCount++
                stored = await hub.related.contentTypeSchema.create(schema)
                logUpdate(`${chalk.green('create')} schema [ ${chalk.gray(schema.schemaId)} ]`)
            }
        }))

        logComplete(`${chalk.blueBright(`contentTypeSchema`)}: [ ${chalk.green(archiveCount)} unarchived ] [ ${chalk.green(updateCount)} updated ] [ ${chalk.green(createCount)} created ]`)
    }
}

export class ContentTypeSchemaCleanupHandler extends CleanableResourceHandler {
    constructor() {
        super(ContentTypeSchema, 'contentTypeSchema')
        this.icon = '🗄'
        this.sortPriority = 1.09
    }
}
