import { CleanableResourceHandler, ImportableResourceHandler, Context } from "./resource-handler"
import { ContentItem, ContentRepository, Folder } from "dc-management-sdk-js"
import { paginator } from "../paginator"
import logger from "../logger"
import chalk from 'chalk'
import { prompts } from "../prompts"
import fs from 'fs-extra'
import { deleteFolder, publishUnpublished } from '../amplience-helper'
import { logUpdate, logComplete } from "../logger"
import { CLIJob } from "../exec-helper"

const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))
export class ContentItemImportHandler extends ImportableResourceHandler {
    constructor(sourceDir?: string) {
        super(ContentItem, 'contentItems', sourceDir)
        this.sortPriority = 0.03
        this.icon = '📁'
    }

    async import(context: Context) {
        let baseDir = this.sourceDir || `${global.tempDir}/content`
        this.sourceDir = `${baseDir}/content-items`
        if (!fs.existsSync(this.sourceDir)) {
            return
        }

        logger.info(`${prompts.import} content items...`)

        let importLogFile = `${global.tempDir}/item-import.log`
        let importJob = new CLIJob(`npx @amp-nova/dc-cli content-item import ${this.sourceDir} -f --republish --publish --mapFile ${global.tempDir}/mapping.json --logFile ${importLogFile}`)
        await importJob.exec()
        await publishUnpublished()
    }
}

export class ContentItemCleanupHandler extends CleanableResourceHandler {
    constructor() {
        super(ContentItem, 'contentItems')
        this.icon = '📁'
    }

    async cleanup(argv: Context): Promise<any> {
        let repositories = await paginator(argv.hub.related.contentRepositories.list)
        let archiveCount = 0
        let folderCount = 0
        await Promise.all(repositories.map(async (repository: ContentRepository) => {
            logUpdate(`${prompts.archive} content-items in repository ${chalk.cyanBright(repository.name)}...`)
            let contentItems: ContentItem[] = await paginator(repository.related.contentItems.list, { status: 'ACTIVE' })
            await Promise.all(contentItems.map(async (contentItem: ContentItem) => {
                if (contentItem.body._meta.deliveryKey?.length > 0) {
                    if (contentItem.status === 'ARCHIVED') {
                        contentItem = await contentItem.related.unarchive()
                    }

                    contentItem.body._meta.deliveryKey = null
                    contentItem = await contentItem.related.update(contentItem)
                }
                archiveCount++
                await contentItem.related.archive()
            }))

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
        logComplete(`${chalk.blueBright(`contentItems`)}: [ ${chalk.yellow(archiveCount)} items archived ] [ ${chalk.red(folderCount)} folders deleted ]`)
    }
}