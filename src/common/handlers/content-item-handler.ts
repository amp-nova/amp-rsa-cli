import { CleanableResourceHandler, ImportableResourceHandler, Context } from "./resource-handler"
import { ContentItem, ContentRepository } from "dc-management-sdk-js"
import { paginator } from "../paginator"
import _ from 'lodash'
import logger from "../logger"
import chalk from 'chalk'
import { prompts } from "../prompts"
import { execWithOutput } from "../exec-helper"
import { HubSettingsOptions } from "../settings-handler"
import fs from 'fs-extra'

export class ContentItemImportHandler extends ImportableResourceHandler {
    constructor(sourceDir?: string) {
        super(ContentItem, 'contentItems', sourceDir)
        this.sortPriority = 0.03
        this.icon = '📁'
    }

    async import(argv: HubSettingsOptions) {
        let baseDir = this.sourceDir || `${global.tempDir}/content/core`
        this.sourceDir = `${baseDir}/content-items`
        if (!fs.existsSync(this.sourceDir)) {
            return
        }

        logger.info(`${prompts.import} content items...`)
        await execWithOutput(`npx @amp-nova/dc-cli content-item import ${this.sourceDir} -f --mapFile ${global.tempDir}/mapping.json --republish`)
    }
}

export class ContentItemCleanupHandler extends CleanableResourceHandler {
    constructor() {
        super(ContentItem, 'contentItems')
        this.icon = '📁'
    }

    async cleanup(argv: Context): Promise<any> {
        let repositories = await paginator(argv.hub.related.contentRepositories.list)
        await Promise.all(repositories.map(async (repository: ContentRepository) => {
            let contentItems: ContentItem[] = await paginator(repository.related.contentItems.list, { status: 'ACTIVE' })

            logger.info(`${prompts.archive} [ ${contentItems.length} ] content-items in repository ${chalk.cyanBright(repository.name)}...`)
            await Promise.all(contentItems.map(async (contentItem: ContentItem) => {
                if (contentItem.body._meta.deliveryKey?.length > 0) {
                    if (contentItem.status === 'ARCHIVED') {
                        // console.log(`updating ARCHIVED content item ${contentItem.body._meta.deliveryKey}`)
                        contentItem = await contentItem.related.unarchive()
                    }

                    contentItem.body._meta.deliveryKey = null
                    contentItem = await contentItem.related.update(contentItem)
                }
                await contentItem.related.archive()
            }))
        }))
    }
}