import { CleanableResourceHandler, Importable, ImportableResourceHandler, Context, ResourceHandler } from "./resource-handler"
import { ContentType, ContentRepository, ContentRepositoryContentType } from "dc-management-sdk-js"
import { paginator } from "../paginator"
import _ from 'lodash'
import logger from "../logger"
import chalk from 'chalk'
import { HubOptions, MappingOptions } from "../interfaces"
import { Arguments } from "yargs"
import { loadJsonFromDirectory } from "../importer"
import { ContentTypeWithRepositoryAssignments } from '../schema-helper'
import { HubSettingsOptions } from "../settings-handler"
import fs from 'fs-extra'
import { logUpdate, logComplete } from '../logger'
import { prompts } from '../prompts'
import amplienceHelper from '../amplience-helper'

type ContentTypeUri = string;
type ContentTypeFile = string;
export const validateNoDuplicateContentTypeUris = (importedContentTypes: {
    [filename: string]: ContentType;
}): void | never => {
    const uriToFilenameMap = new Map<ContentTypeUri, ContentTypeFile[]>(); // map: uri x filenames
    for (const [filename, contentType] of Object.entries(importedContentTypes)) {
        if (contentType.contentTypeUri) {
            const otherFilenames: string[] = uriToFilenameMap.get(contentType.contentTypeUri) || [];
            if (filename) {
                uriToFilenameMap.set(contentType.contentTypeUri, [...otherFilenames, filename]);
            }
        }
    }
    const uniqueDuplicateUris: [ContentTypeUri, ContentTypeFile[]][] = [];
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

export type MappedContentRepositories = Map<string, ContentRepository>;
const validateRepositories = (repositories: unknown): boolean =>
    Array.isArray(repositories) && repositories.every(repo => typeof repo === 'string');

export const synchronizeContentTypeRepositories = async (
    contentType: ContentTypeWithRepositoryAssignments,
    namedRepositories: MappedContentRepositories
): Promise<boolean> => {
    if (!validateRepositories(contentType.repositories)) {
        throw new Error('Invalid format supplied for repositories. Please provide an array of repository names');
    }

    const assignedRepositories: MappedContentRepositories = new Map<string, ContentRepository>();
    namedRepositories.forEach(contentRepository => {
        const contentRepositoryContentTypes = contentRepository.contentTypes || [];
        contentRepositoryContentTypes.forEach(assignedContentTypes => {
            if (assignedContentTypes.hubContentTypeId === contentType.id) {
                assignedRepositories.set(contentRepository.name || '', contentRepository);
            }
        });
    });

    const contentTypeId = contentType.id || '';

    const definedContentRepository = (contentType.repositories || []).filter(
        (value, index, array) => array.indexOf(value) === index
    );

    let changedAssignment = false;
    for (const repo of definedContentRepository) {
        if (!assignedRepositories.has(repo)) {
            const contentRepository = namedRepositories.get(repo);
            if (!contentRepository) {
                throw new Error(`Unable to find a Content Repository named: ${repo}`);
            }
            await contentRepository.related.contentTypes.assign(contentTypeId);
            changedAssignment = true;
        } else {
            assignedRepositories.delete(repo);
        }
    }

    for (const assignedRepository of assignedRepositories.values()) {
        await assignedRepository.related.contentTypes.unassign(contentTypeId);
        changedAssignment = true;
    }

    return changedAssignment;
};

export class ContentTypeImportHandler extends ImportableResourceHandler {
    constructor(sourceDir?: string) {
        super(ContentType, 'contentTypes', sourceDir)
        this.sortPriority = 0.02
        this.icon = '🗂'
    }

    async import(argv: HubSettingsOptions): Promise<any> {
        let { hub } = argv
        let baseDir = this.sourceDir || `${global.tempDir}/content/core`
        this.sourceDir = `${baseDir}/content-types`
        if (!fs.existsSync(this.sourceDir)) {
            return
        }

        const contentTypes = loadJsonFromDirectory<ContentTypeWithRepositoryAssignments>(this.sourceDir, ContentTypeWithRepositoryAssignments
        );

        if (Object.keys(contentTypes).length === 0) {
            throw new Error(`No content types found in ${this.sourceDir}`);
        }
        validateNoDuplicateContentTypeUris(contentTypes);

        const activeContentTypes = await paginator(hub.related.contentTypes.list, { status: 'ACTIVE' });
        const archivedContentTypes = await paginator(hub.related.contentTypes.list, { status: 'ARCHIVED' });
        const storedContentTypes = [...activeContentTypes, ...archivedContentTypes];

        const contentRepositoryList = await paginator<ContentRepository>(hub.related.contentRepositories.list, {});
        const namedRepositories: MappedContentRepositories = new Map<string, ContentRepository>(
            contentRepositoryList.map(value => [value.name || '', value])
        );

        let synchronizedCount = 0
        let synchronizeContentType = async (contentType: ContentType, namedRepositories: MappedContentRepositories) => {
            synchronizedCount++
            logUpdate(`${prompts.sync} content type [ ${chalk.gray(contentType.contentTypeUri)} ]`)
            await synchronizeContentTypeRepositories(
                new ContentTypeWithRepositoryAssignments(contentType),
                namedRepositories
            )
        }

        let archiveCount = 0
        let updateCount = 0
        let createCount = 0

        await Promise.all(Object.entries(contentTypes).map(async ([__, contentType]) => {
            let stored = _.find(storedContentTypes, ct => ct.contentTypeUri === contentType.contentTypeUri) as ContentTypeWithRepositoryAssignments
            if (stored) {
                if (stored.status === 'ARCHIVED') {
                    stored = await stored.related.unarchive()
                    archiveCount++
                    logUpdate(`${prompts.unarchive} content type [ ${chalk.gray(contentType.contentTypeUri)} ]`)
                }

                if (!_.isEqual(stored.settings, contentType.settings)) {
                    stored.settings = contentType.settings
                    stored = await stored.related.update(stored)
                    updateCount++
                    logUpdate(`${prompts.update} content type [ ${chalk.gray(contentType.contentTypeUri)} ]`)
                }
            }
            else {
                stored = await hub.related.contentTypes.register(contentType) as ContentTypeWithRepositoryAssignments
                createCount++
                logUpdate(`${prompts.create} content type [ ${chalk.gray(contentType.contentTypeUri)} ]`)
            }
        }))

        let repos = await paginator(hub.related.contentRepositories.list)
        let activeTypes = await paginator(hub.related.contentTypes.list, { status: 'ACTIVE' });
        let file = Object.entries(contentTypes)
        let fileTypes = file.map(e => e[1])

        let unassignedCount = 0
        let assignedCount = 0
        await Promise.all(repos.map(async repo => {
            // unassign content types that do not exist in our import
            await Promise.all(repo.contentTypes!.map(async type => {
                let activeType = _.find(fileTypes, ft => ft.contentTypeUri === type.contentTypeUri)
                if (!activeType) {
                    unassignedCount++
                    logUpdate(`${prompts.unassign} content type [ ${chalk.grey(type.contentTypeUri)} ]`)
                    await repo.related.contentTypes.unassign(type.hubContentTypeId!)
                }
            }))

            // reassign new content types
            await Promise.all(fileTypes.map(async fileType => {
                let activeType = _.find(activeTypes, type => type.contentTypeUri === fileType.contentTypeUri)
                if (activeType && 
                        _.includes(fileType.repositories, repo.name) && 
                        !_.includes(repo.contentTypes!.map(x => x.contentTypeUri), fileType.contentTypeUri)) {
                    assignedCount++
                    logUpdate(`${prompts.assign} content type [ ${chalk.grey(fileType.contentTypeUri)} ]`)
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

        logComplete(`${chalk.blueBright(`contentTypes`)}: [ ${chalk.green(archiveCount)} unarchived ] [ ${chalk.green(updateCount)} updated ] [ ${chalk.green(createCount)} created ] [ ${chalk.green(synchronizedCount)} synced ]`)
        logger.info(`${chalk.blueBright('repositories')}: [ ${chalk.green(assignedCount)} content types assigned ] [ ${chalk.red(unassignedCount)} content types unassigned ]`)
    }
}

export class ContentTypeCleanupHandler extends CleanableResourceHandler {
    constructor() {
        super(ContentType, 'contentTypes')
        this.icon = '🗂'
        this.sortPriority = 1.1
    }

    async cleanup(argv: Context): Promise<any> {
        let { hub } = argv
        let repos = await paginator(hub.related.contentRepositories.list)

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

        logComplete(`${chalk.blueBright(`repositories`)}: [ ${chalk.red(unassignedCount)} content types unassigned ]`)
        return super.cleanup(argv)
    }
}
