import { ContentRepository, ContentType, DynamicContent, Folder, Hub, HttpMethod, HttpRequest, FacetQuery, HttpResponse, ContentItem, WorkflowState, HalResource, ContentTypeSchema, Status } from "dc-management-sdk-js"
import logger, { logComplete } from "./logger"
import chalk from "chalk"
import { facetPaginator, paginator, StatusQuery } from "../helpers/paginator"
import { logUpdate } from "./logger"
import async from 'async'
import _, { Dictionary } from 'lodash'
import { ContentItemHandler } from "../handlers/content-item-handler"
import { AxiosHttpClient } from "dc-management-sdk-js"
import { AmplienceContext, ImportContext, LoggableContext } from '../handlers/resource-handler';
import fs from 'fs-extra'
import { sleep } from "./utils"
import { AMPRSAConfig } from './types'
import { ContentTypeHandler } from "../handlers/content-type-handler"
import { ContentTypeSchemaHandler } from "../handlers/content-type-schema-handler"
import { currentEnvironment } from "./environment-manager"

let dcUrl = `https://api.amplience.net/v2/content`

let accessToken: any = undefined
let axiosClient = new AxiosHttpClient({})

const login = async (context: LoggableContext) => {
    let oauthResponse = await axiosClient.request({
        method: HttpMethod.POST,
        url: `https://auth.amplience.net/oauth/token?client_id=${context.environment.dc.clientId}&client_secret=${context.environment.dc.clientSecret}&grant_type=client_credentials`,
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        }
    })

    accessToken = (oauthResponse.data as any).access_token

    axiosClient = new AxiosHttpClient({
        baseURL: dcUrl,
        headers: { authorization: `bearer ${accessToken}`, 'content-type': 'application/json' }
    })

    logger.debug(`${chalk.green('logged in')} to dynamic content at ${chalk.yellow(new Date().valueOf())}`)
    setTimeout(() => { accessToken = undefined }, (oauthResponse.data as any).expires_in * 1000)
}


let ax = {
    get: async (url: string) => await axiosClient.request({ method: HttpMethod.GET, url }),
    post: async (url: string) => await axiosClient.request({ method: HttpMethod.POST, url }),
    patch: async (url: string) => await axiosClient.request({ method: HttpMethod.PATCH, url }),
    delete: async (url: string) => await axiosClient.request({ method: HttpMethod.DELETE, url })
}
const synchronizeContentType = async (contentType: ContentType) => await ax.patch(`/content-types/${contentType.id}/schema`)
export const deleteFolder = async (folder: Folder) => await ax.delete(`/folders/${folder.id}`)
export const get = ax.get

const publishContentItem = async (item: any) => {
    await ax.post(`/content-items/${item.id}/publish`)
    updateCache(item)
    return item
}

export const getContentItemFromCDN = async (id: string): Promise<any> => {
    const environment = await currentEnvironment()
    return await (await ax.get(`https://${environment.name}.cdn.content.amplience.net/content/id/${id}`)).data
}

export const PublishingQueue = (postProcess: (item: ContentItem) => Promise<void> = async x => {}) => {
    let queue: ContentItem[] = []

    return {
        add: (item: ContentItem) => queue.push(item),
        length: () => queue.length,
        publish: async (): Promise<number> => {
            let count = 0

            // we are rate limited to 100 publish requests per minute. so once we've flushed through all of the publishes for each
            // 100-item chunk, we'll have to wait to publish more
            let chunks = _.reverse(_.chunk(queue, 100))
            while (chunks.length > 0) {
                let chunk = chunks.pop()
                if (chunk) {
                    // set timer for one minute
                    const start = new Date().valueOf()

                    logUpdate(`publishing ${chalk.blueBright(chunk.length)} items...`)
                    await Promise.all(chunk.map(async item => {
                        await publishContentItem(item)
                        await postProcess(item)
                        count++
                    }))

                    if (chunks.length > 0) {
                        const current = new Date().valueOf()
                        const remainder = Math.ceil((60000 - (current - start)) / 1000)
                        for (let index = remainder; index > 0; index--) {
                            logUpdate(`sleeping ${chalk.blueBright(index)} seconds before next chunk...`)
                            await sleep(1000)
                        }
                    }
                }
            }

            return count
        }
    }
}

export const publishAll = async (context: ImportContext) => {
    const publishingQueue = PublishingQueue()
    await context.hub.contentItemIterator(contentItem => {
        if (contentItem.version !== (contentItem as any).lastPublishedVersion) {
            publishingQueue.add(contentItem)
        }
    })

    const publishedCount = await publishingQueue.publish()
    logComplete(`${new ContentItemHandler().getDescription()}: [ ${chalk.green(publishedCount)} published ]`)
}

let contentMap: Dictionary<ContentItem> = {}
export const cacheContentMap = async (context: AmplienceContext) => await context.hub.contentItemIterator(updateCache)

const updateCache = (item: ContentItem) => {
    contentMap[item.body._meta.deliveryKey] = item
    contentMap[item.id] = item
}

export const getContentItemByKey = (key: string): ContentItem => contentMap[key]
export const getContentItemById = (id: string): ContentItem => contentMap[id]
export const getContentMap = () => _.zipObject(_.map(contentMap, (__, key) => key.replace(/\//g, '-')), _.map(contentMap, 'deliveryId'))

export const getConfigObject = async (context: AmplienceContext) => {
    let { hub, environment } = context
    let deliveryKey = `aria/env/default`
    let schema = `https://amprsa.net/site/amprsa`

    return {
        _meta: {
            name: `${environment.name} AMPRSA config`,
            schema,
            deliveryKey
        },
        environment: environment.name,
        url: environment.url,
        algolia: {
            indexes: [{
                key: 'blog',
                prod: `${environment.name}.blog-production`,
                staging: `${environment.name}.blog-staging`
            }],
            appId: '',
            apiKey: ''
        },
        cms: {
            hub: {
                name: environment.name,
                stagingApi: await hub.settings?.virtualStagingEnvironment?.hostname || ''
            },
            hubs: [{
                key: 'productImages',
                name: 'willow'
            }]
        }
    }
}

const getEnvConfig = async (context: ImportContext) => {
    let { hub, environment } = context
    let deliveryKey = `aria/env/default`

    logger.info(`environment lookup [ hub ${chalk.magentaBright(hub.name)} ] [ key ${chalk.blueBright(deliveryKey)} ]`)

    let config = await getContentItemByKey(deliveryKey)
    if (!config) {
        logger.info(`${deliveryKey} not found, creating...`)

        config = new ContentItem()
        config.label = `${environment.name} AMPRSA config`
        config.body = await getConfigObject(context)

        config = await context.hub.repositories.sitestructure.related.contentItems.create(config)
        await publishContentItem(config)
    }
    return config
}

export const readEnvConfig = async (context: ImportContext): Promise<AMPRSAConfig> => {
    return await (await getEnvConfig(context)).body
}

export const updateEnvConfig = async (context: ImportContext) => {
    let { config } = context
    let envConfig = await getEnvConfig(context)
    envConfig.body = config
    envConfig = await envConfig.related.update(envConfig)
    await publishContentItem(envConfig)
}

export const initAutomation = async (context: AmplienceContext) => {
    let automation = await readAutomation(context)
    fs.writeJsonSync(`${context.tempDir}/mapping.json`, {
        contentItems: _.map(automation.body.contentItems, ci => [ci.from, ci.to]),
        workflowStates: _.map(automation.body.workflowStates, ws => [ws.from, ws.to])
    })

    context.automation = {
        contentItems: automation.body.contentItems,
        workflowStates: automation.body.workflowStates
    }

    // copy so we can compare later after we do an import
    fs.copyFileSync(`${context.tempDir}/mapping.json`, `${context.tempDir}/old_mapping.json`)
    logger.info(`wrote mapping file at ${context.tempDir}/mapping.json`)
}

export const readAutomation = async (context: AmplienceContext) => {
    let { environment } = context
    let deliveryKey = `aria/automation/default`
    let schema = `https://amprsa.net/site/automation`

    let automation = await getContentItemByKey(deliveryKey)
    if (!automation) {
        logger.info(`${deliveryKey} not found, creating...`)
        automation = new ContentItem()
        automation.label = `${environment.name} AMPRSA automation`
        automation.body = {
            _meta: {
                name: `${environment.name} AMPRSA automation`,
                schema,
                deliveryKey
            },
            contentItems: [],
            workflowStates: []
        }

        automation = await context.hub.repositories.sitestructure.related.contentItems.create(automation)
        await publishContentItem(automation)
    }
    return automation
}

export const updateAutomationContentItems = async (context: AmplienceContext) => {
    let automation = await readAutomation(context)
    automation.body = {
        ...automation.body,
        contentItems: context.automation.contentItems
    }
    automation = await automation.related.update(automation)
    await publishContentItem(automation)
}

export const updateAutomation = async (context: ImportContext) => {
    // read the mapping file and update if necessary
    let mappingStats = fs.statSync(`${context.tempDir}/old_mapping.json`)
    let newMappingStats = fs.statSync(`${context.tempDir}/mapping.json`)

    if (newMappingStats.size !== mappingStats.size) {
        logger.info(`updating mapping...`)

        // update the object
        let newMapping = fs.readJsonSync(`${context.tempDir}/mapping.json`)

        logger.info(`saving mapping...`)

        let automation = await readAutomation(context)
        automation.body = {
            ...automation.body,
            contentItems: _.map(newMapping.contentItems, x => ({ from: x[0], to: x[1] })),
            workflowStates: _.map(newMapping.workflowStates, x => ({ from: x[0], to: x[1] }))
        }

        automation = await automation.related.update(automation)
        await publishContentItem(automation)
    }
}

export const readDAMMapping = async (context: ImportContext) => {
    let assets = _.filter(await context.damService.getAssetsListForBucket('Assets'), asset => asset.status === 'active')
    let endpoints = await context.damService.getEndpoints()
    let endpoint: any = _.first(endpoints)!
    return {
        mediaEndpoint: endpoint.tag,
        imagesMap: _.zipObject(_.map(assets, x => _.camelCase(x.name)), _.map(assets, 'id'))
    }
}

export const purgeDeliveryKeys = async (context: AmplienceContext) => {
    let publishingQueue = PublishingQueue(async item => {
        await item.related.archive()
    })

    const purge = async (status: StatusQuery) => await context.hub.contentItemIterator(async item => {
        // logUpdate(`checking item '${chalk.blueBright(item.label)}'...`)

        if (item.body._meta?.deliveryKey) {
            console.log(item.body._meta?.deliveryKey)
        }

        // let cached: any = await getContentItemFromCDN(item.id)
        // let key = item.body._meta?.deliveryKey || cached?.content?._meta?.deliveryKey
        // if (key) {
        //     item = await item.related.unarchive()
        //     item.body._meta.deliveryKey = null
        //     item = await item.related.update(item)
        //     publishingQueue.add(item)
        // }
    }, status)

    logger.info(`purging archived items...`)
    await purge({ status: Status.ARCHIVED })

    console.log(`queue: ${publishingQueue.length()}`)

    let count = await publishingQueue.publish()
    logComplete(`purged ${count} items`)
}

export default {
    login,
    publishContentItem,
    synchronizeContentType,
    publishAll,
    getContentItemByKey,
    getContentItemById,
    cacheContentMap,
    readEnvConfig,
    updateEnvConfig,
    getContentMap,
    initAutomation,
    updateAutomation
}