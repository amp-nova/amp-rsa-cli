import { ResourceHandler, Cleanable, ImportContext, CleanupContext } from "./resource-handler"
import { ContentItem, ContentRepository, Folder } from "dc-management-sdk-js"
import { paginator } from "../helpers/paginator"
import chalk from 'chalk'
import { prompts } from "../common/prompts"
import fs from 'fs-extra'
import amplienceHelper, { get, deleteFolder, publishAll, updateAutomationContentItems, PublishingQueue } from '../common/amplience-helper'
import { logUpdate, logComplete } from "../common/logger"
import { CLIJob } from "../helpers/exec-helper"
import _ from "lodash"
import { fileIterator } from "../common/utils"

export class ContentItemHandler extends ResourceHandler implements Cleanable {
    sortPriority = 0.03
    icon = '📄'

    constructor() {
        super(ContentItem, 'contentItems')
    }

    async import(context: ImportContext) {
        let sourceDir = `${context.tempDir}/content/content-items`
        if (!fs.existsSync(sourceDir)) {
            throw new Error(`source dir not found: ${sourceDir}`)
        }

        await fileIterator(sourceDir, context).iterate(async file => {
            let mapping = _.find(context.automation?.contentItems, map => map.from === file.object.id)
            if (mapping) {
                let contentItem = await amplienceHelper.getContentItemById(mapping.to)
                if (_.isEqual(contentItem.body, file.object.body)) {
                    fs.unlinkSync(file.path)
                }
            }
        })

        let importLogFile = `${context.tempDir}/item-import.log`
        let importJob = new CLIJob(`npx @dlillyatx/dc-cli@latest content-item import ${sourceDir} --force --mapFile ${context.tempDir}/mapping.json --logFile ${importLogFile}`)
        await importJob.exec()

        // read the log file
        let logFile = fs.readFileSync(importLogFile, { encoding: "utf-8" })
        let createdCount = _.filter(logFile.split('\n'), l => l.startsWith('CREATE ')).length
        let updatedCount = _.filter(logFile.split('\n'), l => l.startsWith('UPDATE ')).length

        logComplete(`${this.getDescription()}: [ ${chalk.green(createdCount)} created ] [ ${chalk.blue(updatedCount)} updated ]`)
        await publishAll(context)
    }

    shouldCleanUpItem(item: ContentItem, context: CleanupContext): boolean {
        return (!_.isEmpty(context.matchingSchema) && !item.body._meta.schema.startsWith('https://amprsa.net/site')) ||
            _.includes(context.matchingSchema, item.body._meta.schema) || _.isEmpty(context.matchingSchema)
    }

    async cleanup(context: CleanupContext): Promise<any> {
        let repositories = await paginator(context.hub.related.contentRepositories.list)
        let contentTypes = await paginator(context.hub.related.contentTypes.list)

        let archiveCount = 0
        let folderCount = 0
 
        let publishingQueue = PublishingQueue()
        await Promise.all(repositories.map(async (repository: ContentRepository) => {
            logUpdate(`${prompts.archive} content items in repository ${chalk.cyanBright(repository.name)}...`)
            let contentItems: ContentItem[] = _.filter(await paginator(repository.related.contentItems.list, { status: 'ACTIVE' }), ci => this.shouldCleanUpItem(ci, context))

            await Promise.all(contentItems.map(async (contentItem: ContentItem) => {
                let contentType = _.find(contentTypes, ct => ct.contentTypeUri === contentItem.body._meta.schema)

                // get the effective content type
                let effectiveContentTypeLink = _.get(contentType, '_links.effective-content-type.href')
                if (!effectiveContentTypeLink) {
                    return
                }

                let effectiveContentType: any = await (await get(effectiveContentTypeLink)).data
                if (effectiveContentType.properties?.filterActive) {
                    contentItem.body.filterActive = false
                    contentItem = await contentItem.related.update(contentItem)
                    await amplienceHelper.publishContentItem(contentItem)
                }

                if (contentItem.body._meta.deliveryKey?.length > 0) {
                    if (contentItem.status === 'ARCHIVED') {
                        contentItem = await contentItem.related.unarchive()
                    }

                    contentItem.body._meta.deliveryKey = null
                    contentItem = await contentItem.related.update(contentItem)
                }

                archiveCount++
                await contentItem.related.archive()
                _.remove(context.automation?.contentItems, ci => contentItem.id === ci.to)
            }))

            await publishingQueue.publish()

            const cleanupFolder = (async (folder: Folder) => {
                let subfolders = await paginator(folder.related.folders.list)
                await Promise.all(subfolders.map(cleanupFolder))
                logUpdate(`${prompts.delete} folder ${folder.name}`)
                folderCount++
                return await deleteFolder(folder)
            })

            // also clean up folders
            let folders = await paginator(repository.related.folders.list)
            await Promise.all(folders.map(cleanupFolder))
        }))

        if (!_.isEmpty(context.matchingSchema)) {
            await updateAutomationContentItems(context)
        }
        logComplete(`${this.getDescription()}: [ ${chalk.yellow(archiveCount)} items archived ] [ ${chalk.red(folderCount)} folders deleted ]`)
    }
}
