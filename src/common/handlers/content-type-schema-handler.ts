import { CleanableResourceHandler, Context } from "./resource-handler"
import { ContentTypeSchema } from "dc-management-sdk-js"
import { paginator } from "../paginator"
import _ from 'lodash'
import chalk from 'chalk'
import { loadJsonFromDirectory } from "../importer"
import { resolveSchemaBody } from "../schema-helper"
import fs from 'fs-extra'
import { logUpdate, logComplete } from '../logger'

export class ContentTypeSchemaHandler extends CleanableResourceHandler {
    sortPriority = 1.09
    icon = '🗄'

    constructor() {
        super(ContentTypeSchema, 'contentTypeSchema')
    }

    async import(context: Context): Promise<any> {
        let { hub, importSourceDir } = context
        let baseDir = importSourceDir || `${context.tempDir}/content/core`
        let sourceDir = `${baseDir}/content-type-schemas`

        if (!fs.existsSync(sourceDir)) {
            return
        }

        const schemas = loadJsonFromDirectory<ContentTypeSchema>(sourceDir, ContentTypeSchema);
        const [resolvedSchemas, resolveSchemaErrors] = await resolveSchemaBody(schemas, sourceDir);

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

        const storedSchemas: ContentTypeSchema[] = await paginator(hub.related.contentTypeSchema.list);
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

        logComplete(`${this.getDescription()}: [ ${chalk.green(archiveCount)} unarchived ] [ ${chalk.green(updateCount)} updated ] [ ${chalk.green(createCount)} created ]`)
    }
}