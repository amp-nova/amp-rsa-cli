import { CleanableResourceHandler, ImportableResourceHandler, Context } from "./resource-handler"
import { SearchIndex, Webhook } from "dc-management-sdk-js"
import { paginator, searchIndexPaginator, replicaPaginator } from "../paginator"
import _, { keyBy } from 'lodash'
import logger from "../logger"
import chalk from 'chalk'
import { prompts } from "../prompts"
import fs from 'fs-extra'
import async from 'async'
import { HubSettingsOptions } from "../settings-handler"

export class SearchIndexImportHandler extends ImportableResourceHandler {
    constructor() {
        super(SearchIndex, 'searchIndexes')
        this.icon = '🔍'
        this.sortPriority = 1.09
    }

    async import(argv: HubSettingsOptions) {
        const { hub, mapping } = argv

        let testIndexes = fs.readJsonSync(`${global.tempDir}/content/indexes/test-index.json`)
        let importIndexes = fs.readJsonSync(`${global.tempDir}/content/indexes/indexes.json`)

        const indexes = importIndexes.concat(testIndexes)

        let publishedIndexes = await paginator(searchIndexPaginator(hub))
        let unpublishedIndexes = _.filter(indexes, idx => !_.includes(_.map(publishedIndexes, 'name'), idx.indexDetails.name))

        await async.each(unpublishedIndexes, async item => {
            // Remove ID and replica count for creation
            delete item.indexDetails.id;
            delete item.indexDetails.replicaCount;

            // Create index
            logger.info(`create index: ${chalk.cyanBright(item.indexDetails.name)}`);
            let createdIndex = await hub.related.searchIndexes.create(item.indexDetails)

            // update the index with its settings
            logger.info(`apply settings: ${chalk.cyanBright(item.indexDetails.name)}`);
            await createdIndex.related.settings.update(item.settings)

            // reload published indexes
            publishedIndexes = await paginator(searchIndexPaginator(hub))

            // Get list of replicas settings
            const replicasSettings: any[] = item.replicasSettings;
            const replicasIndexes = _.map(replicasSettings, (item: any) => _.find(publishedIndexes, i => i.name === item.name))

            await Promise.all(replicasIndexes.map(async (replicaIndex: SearchIndex, index: number) => {
                logger.info(`apply replica settings: ${chalk.cyanBright(replicaIndex.name)}`);
                await replicaIndex.related.settings.update(replicasSettings[index].settings)
            }))

            const types: any[] = await paginator(createdIndex.related.assignedContentTypes.list)

            // Get active and archive webhooks
            if (types.length > 0) {
                const type = types[0];

                const activeContentWebhookId = type._links['active-content-webhook'].href.split('/').slice(-1)[0];
                const archivedContentWebhookId = type._links['archived-content-webhook'].href.split('/').slice(-1)[0];

                const webhooks: any[] = await paginator(hub.related.webhooks.list)
                const activeContentWebhook: Webhook = _.find(webhooks, hook => hook.id === activeContentWebhookId)
                const archivedContentWebhook: Webhook = _.find(webhooks, hook => hook.id === archivedContentWebhookId)

                if (activeContentWebhook && archivedContentWebhook) {
                    logger.info(`update webhook: ${chalk.cyanBright(activeContentWebhook.label)}`);
                    activeContentWebhook.customPayload = {
                        type: 'text/x-handlebars-template',
                        value: item.activeContentWebhook
                    }
                    await activeContentWebhook.related.update(activeContentWebhook)

                    logger.info(`update webhook: ${chalk.cyanBright(archivedContentWebhook.label)}`);
                    activeContentWebhook.customPayload = {
                        type: 'text/x-handlebars-template',
                        value: item.archivedContentWebhook
                    }
                    await archivedContentWebhook.related.update(archivedContentWebhook)
                }
            }
        })

        publishedIndexes = await paginator(searchIndexPaginator(hub))

        let algolia: any = {}

        // grab the algolia app key and id off of a search index
        const index = _.first(publishedIndexes)
        if (index) {
            let key = await index!.related.keys.get()
            algolia.appId = key.applicationId
            algolia.apiKey = key.key
        }

        algolia.indexes = _.keyBy(mapping.algolia.indexes, 'key')
        mapping.algolia = algolia
    }
}

export class SearchIndexCleanupHandler extends CleanableResourceHandler {
    constructor() {
        super(SearchIndex, 'searchIndexes')
        this.icon = '🔍'
    }

    async cleanup(argv: Context): Promise<any> {
        // let searchIndexes: SearchIndex[] = await searchIndexPaginator(argv.hub.related.searchIndexes.list)
        let searchIndexes: SearchIndex[] = await paginator(searchIndexPaginator(argv.hub))

        logger.info(`${prompts.delete} [ ${searchIndexes.length} ] ${chalk.cyan('search indexes')}...`)
        await Promise.all(searchIndexes.map(async (searchIndex: SearchIndex) => {
            if (searchIndex.replicaCount && searchIndex.replicaCount > 0) {
                // get the replicas
                let replicas: SearchIndex[] = await paginator(replicaPaginator(searchIndex))
                await Promise.all(replicas.map(async (replica: SearchIndex) => {
                    logger.info(`${prompts.delete} replica index ${chalk.cyan(replica.name)}...`)
                    await replica.related.delete()
                }))
            }
            logger.info(`${prompts.delete} search index ${chalk.cyan(searchIndex.name)}...`)
            await searchIndex.related.delete()
        }))
    }
}
