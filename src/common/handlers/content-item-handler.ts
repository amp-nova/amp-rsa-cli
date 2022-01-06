import { ResourceHandler, Context, Cleanable } from "./resource-handler"
import { ContentItem, ContentRepository, Folder } from "dc-management-sdk-js"
import { paginator } from "../paginator"
import chalk from 'chalk'
import { prompts } from "../prompts"
import fs from 'fs-extra'
import { deleteFolder, publishUnpublished } from '../amplience-helper'
import { logUpdate, logComplete } from "../logger"
import { CLIJob } from "../exec-helper"
import _ from "lodash"

export class ContentItemHandler extends ResourceHandler implements Cleanable {
    sortPriority = 0.03
    icon = '📄'

    constructor() {
        super(ContentItem, 'contentItems')
    }

    async import(context: Context) {
        let baseDir = context.importSourceDir || `${global.tempDir}/content`
        let sourceDir = `${baseDir}/content-items`
        if (!fs.existsSync(sourceDir)) {
            return
        }

        let importLogFile = `${global.tempDir}/item-import.log`
        let importJob = new CLIJob(`npx @amp-nova/dc-cli content-item import ${sourceDir} -f --republish --publish --mapFile ${global.tempDir}/mapping.json --logFile ${importLogFile}`)

        await importJob.exec()

        // read the log file
        let createdCount = 0
        let updatedCount = 0
        let logFile = fs.readFileSync(importLogFile, { encoding: "utf-8" })
        _.each(logFile.split('\n'), line => {
            if (line.startsWith('CREATE ')) {
                createdCount++
            }
            else if (line.startsWith('UPDATE ')) {
                updatedCount++
            }
        })

        logComplete(`${this.getDescription()}: [ ${chalk.green(createdCount)} created ] [ ${chalk.blue(updatedCount)} updated ]`)

        await publishUnpublished()
    }

    async cleanup(argv: Context): Promise<any> {
        let repositories = await paginator(argv.hub.related.contentRepositories.list)
        let archiveCount = 0
        let folderCount = 0
        await Promise.all(repositories.map(async (repository: ContentRepository) => {
            logUpdate(`${prompts.archive} content items in repository ${chalk.cyanBright(repository.name)}...`)
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
        logComplete(`${this.getDescription()}: [ ${chalk.yellow(archiveCount)} items archived ] [ ${chalk.red(folderCount)} folders deleted ]`)
    }
}
