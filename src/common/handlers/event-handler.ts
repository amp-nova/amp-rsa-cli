import { CleanableResourceHandler, Context } from "./resource-handler"
import { Event, PublishingStatus } from "dc-management-sdk-js"
import { paginator } from "../paginator"
import _ from 'lodash'
import logger from "../logger"
import chalk from 'chalk'
import { prompts } from "../prompts"

export class EventCleanupHandler extends CleanableResourceHandler {
    constructor() {
        super(Event, 'events')
        this.icon = ''
    }

    async cleanup(argv: Context): Promise<any> {
        let events = await paginator(argv.hub.related.events.list, { status: 'ACTIVE' })
        await Promise.all(events.map(async event => {
            let editions = await paginator(event.related.editions.list, { status: 'ACTIVE' })
            let publishedEditions = _.filter(editions, e => e.publishingStatus === PublishingStatus.PUBLISHED)

            await Promise.all(editions.map(async edition => {
                if (edition.publishingStatus !== PublishingStatus.PUBLISHED) {
                    if (edition.publishingStatus === PublishingStatus.SCHEDULED) {
                        logger.info(`${prompts.unschedule} edition [ ${chalk.gray(edition.name)} ]`)
                        await edition.related.unschedule()
                    }
                    logger.info(`${prompts.delete} edition [ ${chalk.gray(edition.name)} ]`)
                    await edition.related.delete()
                }
            }))

            if (publishedEditions.length === 0) {
                logger.info(`${prompts.delete} event [ ${chalk.gray(event.name)} ]`)
                await event.related.delete()
            }
        }))
    }
}