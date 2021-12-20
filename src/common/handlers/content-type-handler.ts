import { CleanableResourceHandler, Importable, ImportableResourceHandler, Context, ResourceHandler } from "./resource-handler"
import { ContentType, ContentRepository } from "dc-management-sdk-js"
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

let synchronizeContentType = async (contentType: ContentType, namedRepositories: MappedContentRepositories) => {
    logger.info(`${chalk.green('sync  ')} content type [ ${chalk.gray(contentType.contentTypeUri)} ]`)
    await synchronizeContentTypeRepositories(
        new ContentTypeWithRepositoryAssignments(contentType),
        namedRepositories
    )    
}

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

        for (const [filename, contentType] of Object.entries(contentTypes)) {
            let stored = _.find(storedContentTypes, ct => ct.contentTypeUri === contentType.contentTypeUri)
            if (stored) {
                if (stored.status === 'ARCHIVED') {
                    stored = await stored.related.unarchive()
                    logger.info(`${chalk.green('unarch')} content type [ ${chalk.gray(contentType.contentTypeUri)} ]`)
                }

                if (!_.isEqual(stored.settings, contentType.settings)) {
                    stored = await stored.related.update(contentType)
                    logger.info(`${chalk.green('update')} content type [ ${chalk.gray(contentType.contentTypeUri)} ]`)
                    await synchronizeContentType(contentType, namedRepositories)
                }
            }
            else {
                stored = await hub.related.contentTypes.register(contentType)
                logger.info(`${chalk.green('create')} content type [ ${chalk.gray(contentType.contentTypeUri)} ]`)
                await synchronizeContentType(contentType, namedRepositories)
            }
        }
    }
}

export class ContentTypeCleanupHandler extends CleanableResourceHandler {
    constructor() {
        super(ContentType, 'contentTypes')
        this.icon = '🗂'
    }
}
