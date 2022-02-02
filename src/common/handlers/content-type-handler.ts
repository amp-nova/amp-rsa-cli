import { CleanableResourceHandler, Context, CleanupContext, ImportContext, Cleanable } from "./resource-handler"
import { ContentType, ContentRepository, HalResource } from "dc-management-sdk-js"
import { paginator } from "../paginator"
import _ from 'lodash'
import logger, { logHeadline, logSubheading } from "../logger"
import chalk from 'chalk'
import { loadJsonFromDirectory } from "../importer"
import { ContentTypeWithRepositoryAssignments } from '../schema-helper'
import fs from 'fs-extra'
import { logUpdate, logComplete } from '../logger'
import { prompts } from '../prompts'
import { ContentTypeSchemaHandler } from "./content-type-schema-handler"
import { CLIJob } from "../exec-helper"
import { AnnotatedFile, fileIterator } from "../utils"

export const validateNoDuplicateContentTypeUris = (importedContentTypes: { [filename: string]: ContentType }): void | never => {
    const uriToFilenameMap = new Map<string, string[]>(); // map: uri x filenames
    for (const [filename, contentType] of Object.entries(importedContentTypes)) {
        if (contentType.contentTypeUri) {
            const otherFilenames: string[] = uriToFilenameMap.get(contentType.contentTypeUri) || [];
            if (filename) {
                uriToFilenameMap.set(contentType.contentTypeUri, [...otherFilenames, filename]);
            }
        }
    }
    const uniqueDuplicateUris: [string, string[]][] = [];
    uriToFilenameMap.forEach((filenames, uri) => {
        if (filenames.length > 1) {
            uniqueDuplicateUris.push([uri, filenames]);
        }
    });

    if (uniqueDuplicateUris.length > 0) {
        throw new Error(
            `Content Types must have unique uri values. Duplicate values found:-\n${uniqueDuplicateUris
                .map(([uri, filenames]) => `  uri: '${uri}' in files: [${filenames.map(f => `'${f}'`).join(', ')}]`)
                .join('\n')}`
        );
    }
};

export class ContentTypeHandler extends CleanableResourceHandler {
    sortPriority = 1.1
    icon = '🗂'

    constructor() {
        super(ContentType, 'contentTypes')
    }

    async import(context: ImportContext): Promise<any> {
        logSubheading(`[ import ] content-types`)

        let { hub } = context
        let sourceDir = `${context.tempDir}/content/content-types`
        if (!fs.existsSync(sourceDir)) {
            return
        }

        const jsonTypes = loadJsonFromDirectory<ContentTypeWithRepositoryAssignments>(sourceDir, ContentTypeWithRepositoryAssignments);

        if (Object.keys(jsonTypes).length === 0) {
            throw new Error(`No content types found in ${sourceDir}`);
        }
        validateNoDuplicateContentTypeUris(jsonTypes);

        const activeContentTypes: ContentType[] = await paginator(hub.related.contentTypes.list, { status: 'ACTIVE' });
        const archivedContentTypes: ContentType[] = await paginator(hub.related.contentTypes.list, { status: 'ARCHIVED' });
        const storedContentTypes = [...activeContentTypes, ...archivedContentTypes];

        let synchronizedCount = 0
        let archiveCount = 0
        let updateCount = 0
        let createCount = 0

        let fileContentTypes = _.map(Object.entries(jsonTypes), x => x[1])
        await Promise.all(fileContentTypes.map(async fileContentType => {
            let stored = _.find(storedContentTypes, ct => ct.contentTypeUri === fileContentType.contentTypeUri) as ContentTypeWithRepositoryAssignments
            if (stored) {
                if (stored.status === 'ARCHIVED') {
                    stored = await stored.related.unarchive()
                    archiveCount++
                    logUpdate(`${prompts.unarchive} content type [ ${chalk.gray(fileContentType.contentTypeUri)} ]`)
                }

                if (!_.isEqual(stored.settings, fileContentType.settings)) {
                    stored.settings = fileContentType.settings

                    try {
                        stored = await stored.related.update(stored)                        
                        updateCount++
                        logUpdate(`${prompts.update} content type [ ${chalk.gray(fileContentType.contentTypeUri)} ]`)
                    } catch (error) {
                        // don't update this one for now, we'll catch it on the next content type import
                    }
                }
            }
            else {
                stored = await hub.related.contentTypes.register(fileContentType) as ContentTypeWithRepositoryAssignments
                createCount++
                logUpdate(`${prompts.create} content type [ ${chalk.gray(fileContentType.contentTypeUri)} ]`)
            }
        }))

        let repos: ContentRepository[] = await paginator(hub.related.contentRepositories.list)
        let activeTypes: ContentType[] = await paginator(hub.related.contentTypes.list, { status: 'ACTIVE' });

        let unassignedCount = 0
        let assignedCount = 0
        await Promise.all(repos.map(async repo => {
            // unassign content types that do not exist in our import
            await Promise.all(repo.contentTypes!.map(async type => {
                let activeType = _.find(fileContentTypes, ft => ft.contentTypeUri === type.contentTypeUri)
                if (!activeType) {
                    unassignedCount++
                    logUpdate(`${prompts.unassign} content type [ ${chalk.grey(type.contentTypeUri)} ]`)
                    await repo.related.contentTypes.unassign(type.hubContentTypeId!)
                }
            }))

            // reassign new content types
            await Promise.all(fileContentTypes.map(async fileContentType => {
                let activeType = _.find(activeTypes, type => type.contentTypeUri === fileContentType.contentTypeUri)
                if (activeType && 
                        _.includes(fileContentType.repositories, repo.name) && 
                        !_.includes(repo.contentTypes!.map(x => x.contentTypeUri), fileContentType.contentTypeUri)) {
                    assignedCount++
                    logUpdate(`${prompts.assign} content type [ ${chalk.grey(fileContentType.contentTypeUri)} ]`)
                    await repo.related.contentTypes.assign(activeType.id!)
                }
            }))
        }))

        // sync the content type
        await Promise.all(_.filter(activeTypes, t => _.includes(_.map(fileContentTypes, 'contentTypeUri'), t.contentTypeUri)).map(async type => {
            synchronizedCount++
            await type.related.contentTypeSchema.update()
            logUpdate(`${prompts.sync} content type [ ${chalk.gray(type.contentTypeUri)} ]`)
        }))

        logComplete(`${this.getDescription()}: [ ${chalk.green(archiveCount)} unarchived ] [ ${chalk.green(updateCount)} updated ] [ ${chalk.green(createCount)} created ] [ ${chalk.green(synchronizedCount)} synced ]`)
        logger.info(`${chalk.cyan('📦  repositories')}: [ ${chalk.green(assignedCount)} content types assigned ] [ ${chalk.red(unassignedCount)} content types unassigned ]`)
    }

    async cleanup(context: CleanupContext): Promise<any> {
        logSubheading(`[ cleanup ] content-types`)
        let repos: ContentRepository[] = await paginator(context.hub.related.contentRepositories.list)

        let unassignedCount = 0
        await Promise.all(repos.map(async repo => {
            // unassign all current content types
            let repoTypes = repo.contentTypes
            if (repoTypes) {
                await Promise.all(repoTypes.map(async type => {
                    unassignedCount++
                    logUpdate(`${prompts.unassign} content type [ ${chalk.grey(type.contentTypeUri)} ]`)
                    await repo.related.contentTypes.unassign(type.hubContentTypeId!)
                }))
            }
        }))

        logComplete(`${chalk.cyan(`📦  repositories`)}: [ ${chalk.red(unassignedCount)} content types unassigned ]`)

        // now clean up the content types
        await super.cleanup(context)
    }
}