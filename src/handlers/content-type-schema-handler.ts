import { CleanableResourceHandler, CleanupContext, ImportContext } from "./resource-handler"
import { ContentTypeSchema } from "dc-management-sdk-js"
import { paginator } from "../helpers/paginator"
import _ from 'lodash'
import chalk from 'chalk'
import { loadJsonFromDirectory } from "../helpers/importer"
import { resolveSchemaBody } from "../helpers/schema-helper"
import fs from 'fs-extra'
import { logUpdate, logComplete, logHeadline, logSubheading } from '../common/logger'
import { CLIJob } from "../helpers/exec-helper"
import { AnnotatedFile, fileIterator } from "../common/utils"
import { ContentTypeSchemaDescriptor, ContentTypeSchemaPointer } from "../common/types"

export class ContentTypeSchemaHandler extends CleanableResourceHandler {
    sortPriority = 1.09
    icon = '🗄'

    constructor() {
        super(ContentTypeSchema, 'contentTypeSchema')
    }

    async import(context: ImportContext): Promise<any> {
        logSubheading(`[ import ] content-type-schemas`)

        let { hub } = context
        let baseDir = `${context.tempDir}/content`
        let sourceDir = `${baseDir}/content-type-schemas`
        let schemaDir = `${sourceDir}/schemas`

        if (!fs.existsSync(sourceDir)) {
            return
        }

        // // preprocess
        // await fileIterator<ContentTypeSchemaPointer>({ dir: sourceDir, deep: false }, context).iterate(async file => {
        //     if (!_.isEmpty(context.matchingSchema) && !_.includes(context.matchingSchema, file.object?.schemaId)) {
        //         fs.unlinkSync(file.path)
        //     }
        // })

        // // preprocess
        // await fileIterator<ContentTypeSchemaDescriptor>({ dir: schemaDir, deep: false }, context).iterate(async file => {
        //     if (!_.isEmpty(context.matchingSchema) && !_.includes(context.matchingSchema, file.object?.['$id'])) {
        //         fs.unlinkSync(file.path)
        //     }
        // })
        
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

export class CLIContentTypeSchemaHandler extends ContentTypeSchemaHandler {
    command: string = `npx @dlillyatx/dc-cli`
    async import(context: ImportContext): Promise<any> {
        logSubheading(`[ import ] content-type-schemas`)
        let sourceDir = `${context.tempDir}/content/content-type-schemas`
        await new CLIJob(`${this.command} content-type-schema import ${sourceDir}`).exec()
    }

    async cleanup(context: CleanupContext): Promise<any> {
        logSubheading(`[ cleanup ] content-type-schemas`)
        await new CLIJob(`${this.command} hub clean --force --step schema`).exec()
    }
}

export class LocalCLIContentTypeSchemaHandler extends CLIContentTypeSchemaHandler {
    command: string = `dc-cli`
}