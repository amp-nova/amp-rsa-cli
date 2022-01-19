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
import { sleep } from "./utils"

let dcUrl = `https://api.amplience.net/v2/content`

export class DynamicContentCredentials {
    clientId: string
    clientSecret: string
    hubId: string
}

let accessToken: any = undefined
let axiosClient = new AxiosHttpClient({})

let client: DynamicContent

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

export const publishUnpublished = async (context: Context) => {
    let publishedItemCount = 0
    let unpublishedItemCount = 1
    let oldUnpublishedItemCount = 0

    while (unpublishedItemCount > 0) {
        let { published, unpublished } = await waitForPublishingQueue(context)

        unpublishedItemCount = unpublished
        publishedItemCount = published

        if (oldUnpublishedItemCount === unpublishedItemCount) {
            logComplete(`${new ContentItemHandler().getDescription()}: [ ${chalk.green(publishedItemCount)} published ]`)
            return await publishAll(context)
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

export const waitForPublishingQueue = async (context: Context) => {
    logUpdate(`wait for publishing queue to complete...`)
    let repositories = await paginator(context.hub.related.contentRepositories.list)
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

const publishAll = async (context: Context) => {
    let repositories: ContentRepository[] = await paginator(context.hub.related.contentRepositories.list)
    let publishedCount = 0

    await async.eachSeries(repositories, async (repo, callback) => {
        logUpdate(`${chalk.greenBright('publish')} repo ${repo.label}`)
        let contentItems: any[] = await paginator(repo.related.contentItems.list, { status: 'ACTIVE' })
        await async.eachOfSeries(contentItems, async (contentItem, index, cb) => {
            if (!contentItem.lastPublishedDate) {
                logUpdate(`${chalk.greenBright('publish')} content item ${contentItem.id} (${index}/${contentItems.length})`)
                publishedCount++
                await publishContentItem(contentItem)
                await sleep(context.publishDelay)
            }
            cb()
        })
        callback()
    })
    logComplete(`${new ContentItemHandler().getDescription()}: [ ${chalk.green(publishedCount)} published ]`)
}

let contentMap: Dictionary<ContentItem> = {}
export const cacheContentMap = async (context: Context) =>
    await Promise.all((await paginator(context.hub.related.contentRepositories.list, { status: 'ACTIVE' })).map(cacheContentMapForRepository))

const cacheContentMapForRepository = async (repo: ContentRepository) => {
    _.each(_.filter(await paginator(repo.related.contentItems.list, { status: 'ACTIVE' }), ci => ci.body._meta?.deliveryKey), (ci: ContentItem) => {
        contentMap[ci.body._meta.deliveryKey] = ci
    })
}

export const getContentItemByKey = (key: string) => {
    return contentMap[key]
}

export const getContentMap = () => _.zipObject(_.map(contentMap, (__, key) => key.replace(/\//g, '-')), _.map(contentMap, 'deliveryId'))

const getEnvConfig = async (context: Context) => {
    let { env } = await currentEnvironment()
    let { hub, ariaKey } = context
    let deliveryKey = `aria/env/${ariaKey}`

    logger.info(`environment lookup [ hub ${chalk.magentaBright(hub.name)} ] [ key ${chalk.blueBright(deliveryKey)} ]`)

    const stagingApi = await hub.settings?.virtualStagingEnvironment?.hostname || ''

    let envConfig = await getContentItemByKey(deliveryKey) as any
    if (!envConfig) {
        logger.info(`${deliveryKey} not found, creating...`)

        let fileCredsDefault = {
            label: `File config credentials`,
            folderId: null,
            body: {
                _meta: {
                    name: `File config credentials`,
                    schema: `https://amprsa.net/credentials/file`
                },
                use_local_file: true
            }
        }

        let fileCreds = await createAndPublishContentItem(fileCredsDefault, await findRepository(context, 'sitestructure'))

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
                commerce: {
                    _meta: {
                        schema: "http://bigcontent.io/cms/schema/v1/core#/definitions/content-reference"
                    },
                    contentType: "https://amprsa.net/credentials/file",
                    id: (fileCreds as any).id
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
        envConfig = await createAndPublishContentItem(config, await findRepository(context, 'sitestructure'))
    }

    return envConfig
}

export const readEnvConfig = async (context: Context) => {
    let envConfig = await getEnvConfig(context)
    let workflowStates: WorkflowState[] = await paginator(context.hub.related.workflowStates.list)
    let repositories: ContentRepository[] = await paginator(context.hub.related.contentRepositories.list)
    return {
        ...envConfig.body,
        dam: await readDAMMapping(context),
        cms: {
            hub: envConfig.body.cms.hub,
            repositories: _.zipObject(_.map(repositories, r => r.name || ''), _.map(repositories, 'id')),
            workflowStates: _.zipObject(_.map(workflowStates, ws => _.camelCase(ws.label)), _.map(workflowStates, 'id')),
            hubs: _.keyBy(envConfig.body.cms.hubs, 'key')
        }
    }
}

export const updateEnvConfig = async (context: Context) => {
    let { mapping } = context
    let envConfig = await getEnvConfig(context)

    // undo the transforms on these two values. need to fix
    mapping.algolia.indexes = _.values(mapping.algolia.indexes)
    mapping.cms.hubs = _.values(mapping.cms.hubs)

    envConfig.body = {
        ...envConfig.body,
        ..._.omit(mapping, 'dam', 'repositories', 'workflowStates')
    }
    envConfig = await envConfig.related.update(envConfig)
    await publishContentItem(envConfig)
}

export const initAutomation = async (context: Context) => {
    let automation = await readAutomation(context)

    fs.writeJsonSync(`${context.tempDir}/mapping.json`, {
        contentItems: _.map(automation.contentItems, ci => [ci.from, ci.to]),
        workflowStates: _.map(automation.workflowStates, ws => [ws.from, ws.to])
    })

    // copy so we can compare later after we do an import
    fs.copyFileSync(`${context.tempDir}/mapping.json`, `${context.tempDir}/old_mapping.json`)
    logger.info(`wrote mapping file at ${context.tempDir}/mapping.json`)
}

export const readAutomation = async (context: Context) => {
    let { env } = await currentEnvironment()
    let deliveryKey = `aria/automation/${context.ariaKey}`

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
        automation = await createAndPublishContentItem(automationItem, await findRepository(context, 'sitestructure'))
    }

    return automation
}

export const updateAutomation = async (context: Context) => {
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

const findRepository = async (context: Context, name: string) => {
    let repositories: ContentRepository[] = await paginator(context.hub.related.contentRepositories.list)
    let repo = _.find(repositories, repo => repo.name === name)
    if (!repo) {
        throw new Error(`repository '${name}' not found, please make sure it exists`)
    }
    return repo
}

const readDAMMapping = async (context: Context) => {
    const { dam } = await currentEnvironment()
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
    updateEnvConfig,
    getContentMap,
    initAutomation,
    updateAutomation
}