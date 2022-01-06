import axios from "axios"
import { ContentRepository, ContentType, DynamicContent, Folder, Hub } from "dc-management-sdk-js"
import logger, { logComplete } from "./logger"
import chalk from "chalk"
import { paginator } from "./paginator"
import { logUpdate } from "./logger"
import async from 'async'
import _ from 'lodash'
import fetch from "node-fetch"
import { ContentItemHandler } from "./handlers/content-item-handler"
import stringify from 'json-stringify-safe'

let request = (method: string = 'get') => async (url: string, data: any = {}, config: any = dcHeaders) => {
    try {
        logger.debug(`${method.toUpperCase()} ${url}`)
        if (method === 'post' || method === 'patch') {
            logger.debug(JSON.stringify(data))
        }

        return await (axios as any)[method](url, data, config)
    } catch (error) {
        if (error.response?.data?.errors) {
            logger.error(`${method.toUpperCase()} ${url}`)
            _.each(error.response?.data?.errors, error => {
                logger.error(`\t* ${chalk.bold.red(error.code)}: ${error.message}`)
            })
        }
        throw error
    }
}

let http = {
    post: request('post'),
    patch: request('patch'),
    get: request('get'),
    delete: request('delete')
}

export class DynamicContentCredentials {
    clientId: string
    clientSecret: string
    hubId: string
}

let dcUrl = `https://api.amplience.net/v2/content`

let accessToken = undefined
let dcHeaders = {}
let loginHeaders = {
    headers: {
        'content-type': 'application/x-www-form-urlencoded'
    }
}

let client: DynamicContent
let hub: Hub
const login = async (dc: DynamicContentCredentials) => {
    let oauthResponse = await http.post(
        `https://auth.amplience.net/oauth/token?client_id=${dc.clientId}&client_secret=${dc.clientSecret}&grant_type=client_credentials`,
        {}, loginHeaders)

    client = new DynamicContent({
        client_id: dc.clientId,
        client_secret: dc.clientSecret
    })

    hub = await client.hubs.get(dc.hubId)

    accessToken = oauthResponse.data.access_token
    dcHeaders = { headers: { authorization: `bearer ${accessToken}`, 'content-type': 'application/json' } }

    logger.debug(`${chalk.green('logged in')} to dynamic content at ${chalk.yellow(new Date().valueOf())}`)
    setTimeout(() => { login(dc) }, oauthResponse.data.expires_in * 1000)
}

const createAndPublishContentItem = async (item: any, repo: ContentRepository) => {
    let response = await http.post(`${dcUrl}/content-repositories/${repo.id}/content-items`, item, dcHeaders)
    await publishContentItem(response.data)
    return response.data
}

const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))
const retriablePost = (count: number) => async (url: string, data: any = {}, headers: any = dcHeaders) => {
    let retryCount = 0
    while (retryCount < count) {
        try {
            return await http.post(url, data, headers)
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
const retrier = retriablePost(3)

const publishContentItem = async (item: any) => await retrier(`${dcUrl}/content-items/${item.id}/publish`)
const unpublishContentItem = async (item: any) => await http.post(`${dcUrl}/content-items/${item.id}/unpublish`)

const synchronizeContentType = async (contentType: ContentType) => await http.patch(`${dcUrl}/content-types/${contentType.id}/schema`)
export const deleteFolder = async (folder: Folder) => await http.delete(`${dcUrl}/folders/${folder.id}`)

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

const unpublishAll = async () => {
    logger.info(`looking for published items...`)
    let repositories = await paginator(hub.related.contentRepositories.list)
    let unpublishedCount = 0

    await async.eachSeries(repositories, async (repo, callback) => {
        logUpdate(`${chalk.redBright('unpublish')} repo ${repo.label}`)
        let contentItems: any[] = await paginator(repo.related.contentItems.list, { status: 'ACTIVE' })
        await async.eachSeries(contentItems, async (contentItem, cb) => {
            if (contentItem.lastPublishedDate) {
                unpublishedCount++
                logUpdate(`${chalk.redBright('unpublish')} content item ${contentItem.id} ${contentItem.label}`)
                await unpublishContentItem(contentItem)
                await sleep(500)
            }
            cb()
        })
        callback()
    })
    logComplete(`${new ContentItemHandler().getDescription()}: [ ${chalk.red(unpublishedCount)} unpublished ]`)
}

export default {
    login,
    createAndPublishContentItem,
    publishContentItem,
    synchronizeContentType,
    publishAll,
    unpublishAll,
    waitForPublishingQueue
}