import { ContentRepository, ContentType, DynamicContent, Folder, Hub, HttpMethod, HttpRequest, HttpResponse, ContentItem, WorkflowState } from "dc-management-sdk-js"
import logger, { logComplete } from "./logger"
import chalk from "chalk"
import { paginator } from "./paginator"
import { logUpdate } from "./logger"
import async from 'async'
import _, { Dictionary } from 'lodash'
import { ContentItemHandler } from "./handlers/content-item-handler"
import { AxiosHttpClient } from "dc-management-sdk-js"
import { Context } from '../common/handlers/resource-handler';
import { currentEnvironment } from '../common/environment-manager'
import fs from 'fs-extra'
import { DAMService } from "./dam/dam-service"

let dcUrl = `https://api.amplience.net/v2/content`

export class DynamicContentCredentials {
    clientId: string
    clientSecret: string
    hubId: string
}

let accessToken: any = undefined
let axiosClient = new AxiosHttpClient({})

let client: DynamicContent
let hub: Hub

const login = async (dc: DynamicContentCredentials) => {
    let oauthResponse = await axiosClient.request({
        method: HttpMethod.POST,
        url: `https://auth.amplience.net/oauth/token?client_id=${dc.clientId}&client_secret=${dc.clientSecret}&grant_type=client_credentials`,
        headers: { 
            'content-type': 'application/x-www-form-urlencoded' 
        }
    })

    client = new DynamicContent({
        client_id: dc.clientId,
        client_secret: dc.clientSecret
    })

    hub = await client.hubs.get(dc.hubId)

    accessToken = (oauthResponse.data as any).access_token

    axiosClient = new AxiosHttpClient({
        baseURL: dcUrl,
        headers: { authorization: `bearer ${accessToken}`, 'content-type': 'application/json' }
    })

    logger.debug(`${chalk.green('logged in')} to dynamic content at ${chalk.yellow(new Date().valueOf())}`)
    setTimeout(() => { login(dc) }, (oauthResponse.data as any).expires_in * 1000)
}

const createAndPublishContentItem = async (item: any, repo: ContentRepository) => {
    let response = await axiosClient.request({
        method: HttpMethod.POST,
        url: `/content-repositories/${repo.id}/content-items`, 
        data: item
    })
    await publishContentItem(response.data)
    await cacheContentMapForRepository(repo)
    return response.data
}

const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))
const retriable = (method: HttpMethod = HttpMethod.GET) => (count: number) => async (url: string, data: any = {}) => {
    let retryCount = 0
    while (retryCount < count) {
        try {
            return await axiosClient.request({ method, url, data })
        } catch (error) {
            if (error.response.status === 429) { // rate limited            
                retryCount++
                await sleep(30000)
            }
            else {
                throw error
            }
        }
    }
}
const retriablePost = retriable(HttpMethod.POST)
const retrier = retriablePost(3)

const publishContentItem = async (item: any) => await retrier(`/content-items/${item.id}/publish`)

const synchronizeContentType = async (contentType: ContentType) => await axiosClient.request({
    method: HttpMethod.PATCH,
    url: `/content-types/${contentType.id}/schema`
})

export const deleteFolder = async (folder: Folder) => await axiosClient.request({
    method: HttpMethod.DELETE,
    url: `/folders/${folder.id}`
})

export const publishUnpublished = async () => {
    let publishedItemCount = 0
    let unpublishedItemCount = 1
    let oldUnpublishedItemCount = 0

    while (unpublishedItemCount > 0) {
        let { published, unpublished } = await waitForPublishingQueue()

        unpublishedItemCount = unpublished
        publishedItemCount = published

        if (oldUnpublishedItemCount === unpublishedItemCount) {
            logComplete(`${new ContentItemHandler().getDescription()}: [ ${chalk.green(publishedItemCount)} published ]`)
            return await publishAll()
        }
        else {
            oldUnpublishedItemCount = unpublishedItemCount
            if (unpublishedItemCount > 0) {
                for (let index = 5; index > 0; index--) {
                    logUpdate(`${chalk.red(unpublishedItemCount)} unpublished items remain, waiting ${chalk.blueBright(index)} seconds...`)
                    await sleep(1000)
                }
            }
        }
    }
}

export const waitForPublishingQueue = async () => {
    logUpdate(`wait for publishing queue to complete...`)
    let repositories = await paginator(hub.related.contentRepositories.list)
    let count = {
        published: 0,
        unpublished: 0
    }

    await async.eachSeries(repositories, async (repo, callback) => {
        let contentItems = await paginator(repo.related.contentItems.list, { status: 'ACTIVE' })
        await async.eachSeries(contentItems, async (contentItem, cb) => {
            if (!(contentItem as any).lastPublishedDate) {
                count.unpublished++
            }
            else {
                count.published++
            }
            cb()
        })
        callback()
    })

    return count
}

const publishAll = async () => {
    let repositories: ContentRepository[] = await paginator(hub.related.contentRepositories.list)
    let publishedCount = 0

    await async.eachSeries(repositories, async (repo, callback) => {
        logUpdate(`${chalk.greenBright('publish')} repo ${repo.label}`)
        let contentItems: any[] = await paginator(repo.related.contentItems.list, { status: 'ACTIVE' })
        await async.eachSeries(contentItems, async (contentItem, cb) => {
            if (!contentItem.lastPublishedDate) {
                logUpdate(`${chalk.greenBright('publish')} content item ${contentItem.id}`)
                publishedCount++
                await publishContentItem(contentItem)
                await sleep(500)
            }
            cb()
        })
        callback()
    })
    logComplete(`${new ContentItemHandler().getDescription()}: [ ${chalk.green(publishedCount)} published ]`)
}

let contentMap: Dictionary<ContentItem> = {}
export const cacheContentMap = async (argv: Context) => 
    await Promise.all((await paginator(argv.hub.related.contentRepositories.list, { status: 'ACTIVE' })).map(cacheContentMapForRepository))

const cacheContentMapForRepository = async (repo: ContentRepository) => {
    _.each(_.filter(await paginator(repo.related.contentItems.list, { status: 'ACTIVE' }), ci => ci.body._meta?.deliveryKey), (ci: ContentItem) => {
        contentMap[ci.body._meta.deliveryKey] = ci
    })
}

export const getContentItemByKey = (key: string) => {
    return contentMap[key]
}

export const getContentMap = () => _.zipObject(_.map(contentMap, (__, key) => key.replace(/\//g, '-')), _.map(contentMap, 'deliveryId'))

export const readEnvConfig = async (argv: Context) => {
    let { env } = currentEnvironment()
    let { hub, ariaKey } = argv
    let deliveryKey = `aria/env/${ariaKey}`

    logger.info(`environment lookup [ hub ${chalk.magentaBright(hub.name)} ] [ key ${chalk.blueBright(deliveryKey)} ]`)

    const stagingApi = await hub.settings?.virtualStagingEnvironment?.hostname || ''

    let envConfig = await getContentItemByKey(deliveryKey) as any
    if (!envConfig) {
        logger.info(`${deliveryKey} not found, creating...`)

        let config = {
            label: `${env.name} AMPRSA config`,
            folderId: null,
            body: {
                _meta: {
                    name: `${env.name} AMPRSA config`,
                    schema: `https://amprsa.net/amprsa/config`,
                    deliveryKey
                },
                environment: env.name,
                app: { url: env.url },
                algolia: {
                    indexes: [{
                        key: 'blog',
                        prod: `${env.name}.blog-production`,
                        staging: `${env.name}.blog-staging`
                    }]
                },
                cms: {
                    hub: {
                        name: env.name,
                        stagingApi
                    },
                    hubs: [{
                        key: 'productImages',
                        name: 'willow'
                    }]
                }
            }
        }

        // process step 8: npm run automate:webapp:configure
        envConfig = await createAndPublishContentItem(config, await findRepository('sitestructure'))
    }

    let workflowStates: WorkflowState[] = await paginator(hub.related.workflowStates.list)
    let repositories: ContentRepository[] = await paginator(hub.related.contentRepositories.list)

    return {
        ...envConfig.body,
        dam: await readDAMMapping(argv),
        cms: {
            hub: envConfig.body.cms.hub,
            repositories: _.zipObject(_.map(repositories, r => r.name || ''), _.map(repositories, 'id')),
            workflowStates: _.zipObject(_.map(workflowStates, ws => _.camelCase(ws.label)), _.map(workflowStates, 'id')),
            hubs: _.keyBy(envConfig.body.cms.hubs, 'key')
        }
    }
}

export const initAutomation = async (argv: Context) => {
    let automation = await readAutomation(argv)

    fs.writeJsonSync(`${global.tempDir}/mapping.json`, {
        contentItems: _.map(automation.contentItems, ci => [ci.from, ci.to]),
        workflowStates: _.map(automation.workflowStates, ws => [ws.from, ws.to])
    })

    // copy so we can compare later after we do an import
    fs.copyFileSync(`${global.tempDir}/mapping.json`, `${global.tempDir}/old_mapping.json`)
    logger.info(`wrote mapping file at ${global.tempDir}/mapping.json`)
}

export const readAutomation = async (argv: Context) => {
    let { env } = currentEnvironment()
    let deliveryKey = `aria/automation/${argv.ariaKey}`

    let automation = await getContentItemByKey(deliveryKey) as any
    if (!automation) {
        logger.info(`${deliveryKey} not found, creating...`)
        let automationItem = {
            label: `${env.name} AMPRSA automation`,
            folderId: null,
            body: {
                _meta: {
                    name: `${env.name} AMPRSA automation`,
                    schema: `https://amprsa.net/amprsa/automation`,
                    deliveryKey
                },
                contentItems: [],
                workflowStates: []
            }
        }
        automation = await createAndPublishContentItem(automationItem, await findRepository('sitestructure'))
    }

    return automation
}

export const updateAutomation = async (argv: Context) => {
    // read the mapping file and update if necessary
    let mappingStats = fs.statSync(`${global.tempDir}/old_mapping.json`)
    let newMappingStats = fs.statSync(`${global.tempDir}/mapping.json`)

    if (newMappingStats.size !== mappingStats.size) {
        logger.info(`updating mapping...`)

        // update the object
        let newMapping = fs.readJsonSync(`${global.tempDir}/mapping.json`)

        logger.info(`saving mapping...`)

        let automation = await readAutomation(argv)
        automation.body = {
            ...automation.body,
            contentItems: _.map(newMapping.contentItems, x => ({ from: x[0], to: x[1] })),
            workflowStates: _.map(newMapping.workflowStates, x => ({ from: x[0], to: x[1] }))
        }

        automation = await automation.related.update(automation)
        await publishContentItem(automation)
    }
}

const findRepository = async (name: string) => {
    let repositories: ContentRepository[] = await paginator(hub.related.contentRepositories.list)
    let repo = _.find(repositories, repo => repo.name === name)
    if (!repo) {
        throw new Error(`repository '${name}' not found, please make sure it exists`)
    }
    return repo
}

const readDAMMapping = async (argv: Context) => {
    const { dam } = currentEnvironment()
    let damService = await new DAMService().init(dam)

    let assets = _.filter(await damService.getAssetsListForBucket('Assets'), asset => asset.status === 'active')
    let endpoints = await damService.getEndpoints()
    let endpoint: any = _.first(endpoints)!
    return {
        mediaEndpoint: endpoint.tag,
        imagesMap: _.zipObject(_.map(assets, x => _.camelCase(x.name)), _.map(assets, 'id'))
    }
}

export default {
    login,
    createAndPublishContentItem,
    publishContentItem,
    synchronizeContentType,
    publishAll,
    waitForPublishingQueue,
    getContentItemByKey,
    cacheContentMap,
    cacheContentMapForRepository,
    readEnvConfig,
    getContentMap,
    initAutomation,
    updateAutomation
}