import { CleanableResourceHandler, ImportableResourceHandler, Context } from "./resource-handler"
import { ContentType, ContentRepository } from "dc-management-sdk-js"
import { paginator } from "../paginator"
import _ from 'lodash'
import logger from "../logger"
import chalk from 'chalk'
import { loadJsonFromDirectory } from "../importer"
import { ContentTypeWithRepositoryAssignments } from '../schema-helper'
import fs from 'fs-extra'
import { logUpdate, logComplete } from '../logger'
import { prompts } from '../prompts'

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

export class ContentTypeImportHandler extends ImportableResourceHandler {
    constructor(sourceDir?: string) {
        super(ContentType, 'content types', sourceDir)
        this.sortPriority = 0.02
        this.icon = '🗂'
    }

    async import(context: Context): Promise<any> {
        let { hub } = context
        let baseDir = this.sourceDir || `${global.tempDir}/content`
        this.sourceDir = `${baseDir}/content-types`
        if (!fs.existsSync(this.sourceDir)) {
            return
        }

        const jsonTypes = loadJsonFromDirectory<ContentTypeWithRepositoryAssignments>(this.sourceDir, ContentTypeWithRepositoryAssignments
        );

        if (Object.keys(jsonTypes).length === 0) {
            throw new Error(`No content types found in ${this.sourceDir}`);
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
                    stored = await stored.related.update(stored)
                    updateCount++
                    logUpdate(`${prompts.update} content type [ ${chalk.gray(fileContentType.contentTypeUri)} ]`)
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
        await Promise.all(activeTypes.map(async type => {
            synchronizedCount++
            await type.related.contentTypeSchema.update()
            logUpdate(`${prompts.sync} content type [ ${chalk.gray(type.contentTypeUri)} ]`)
        }))

        logComplete(`${this.resourceTypeDescription}: [ ${chalk.green(archiveCount)} unarchived ] [ ${chalk.green(updateCount)} updated ] [ ${chalk.green(createCount)} created ] [ ${chalk.green(synchronizedCount)} synced ]`)
        logger.info(`${chalk.cyan('repositories')}: [ ${chalk.green(assignedCount)} content types assigned ] [ ${chalk.red(unassignedCount)} content types unassigned ]`)
    }
}

export class ContentTypeCleanupHandler extends CleanableResourceHandler {
    constructor() {
        super(ContentType, 'content types')
        this.icon = '🗂'
        this.sortPriority = 1.1
    }

    async cleanup(argv: Context): Promise<any> {
        let { hub } = argv
        let repos: ContentRepository[] = await paginator(hub.related.contentRepositories.list)

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

        logComplete(`${chalk.cyan(`repositories`)}: [ ${chalk.red(unassignedCount)} content types unassigned ]`)
        return super.cleanup(argv)
    }
}
