import axios from "axios"
import fetch from 'isomorphic-unfetch'
import { ContentRepository, ContentType, DynamicContent, Folder, Hub } from "dc-management-sdk-js"
import { CDN } from "./interfaces"
import logger, { logComplete } from "./logger"
import chalk from "chalk"
import { paginator } from "./paginator"
import { logUpdate } from "./logger"
import async from 'async'
import _ from 'lodash'

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
    let oauthResponse = await axios.post(
        `https://auth.amplience.net/oauth/token?client_id=${dc.clientId}&client_secret=${dc.clientSecret}&grant_type=client_credentials`,
        {}, loginHeaders)

    client = new DynamicContent({
        client_id: dc.clientId,
        client_secret: dc.clientSecret
    })

    hub = await client.hubs.get(dc.hubId)

    accessToken = oauthResponse.data.access_token
    dcHeaders = { headers: { authorization: `bearer ${accessToken}` } }

    logger.debug(`${chalk.green('logged in')} to dynamic content at ${chalk.yellow(new Date().valueOf())}`)
    setTimeout(() => { login(dc) }, oauthResponse.data.expires_in * 1000)
}

const createAndPublishContentItem = async (item: any, repo: ContentRepository) => {
    let response = await axios.post(`${dcUrl}/content-repositories/${repo.id}/content-items`, item, dcHeaders)
    await publishContentItem(response.data)
    return response.data
}

const publishContentItem = async (item: any) => await axios.post(`${dcUrl}/content-items/${item.id}/publish`, {}, dcHeaders)
const unpublishContentItem = async (item: any) => await axios.post(`${dcUrl}/content-items/${item.id}/unpublish`, {}, dcHeaders)

const synchronizeContentType = async (contentType: ContentType) => {
    return await axios.patch(`${dcUrl}/content-types/${contentType.id}/schema`, {}, dcHeaders)
}

export const deleteFolder = async (folder: Folder) => {
    return await axios.delete(`${dcUrl}/folders/${folder.id}`, dcHeaders)
}

const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))
export const publishUnpublished = async() => {
    let unpublishedItemCount = 1
    let oldUnpublishedItemCount = 0

    while (unpublishedItemCount > 0) {
        unpublishedItemCount = await waitForPublishingQueue()

        if (oldUnpublishedItemCount === unpublishedItemCount) {
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
    let unpublishedCount = 0

    await async.eachSeries(repositories, async (repo, callback) => {
        let contentItems = await paginator(repo.related.contentItems.list, { status: 'ACTIVE' })
        await async.eachSeries(contentItems, async (contentItem, cb) => {
            if (!(contentItem as any).lastPublishedDate) {
                unpublishedCount++
            }
            cb()
        })
        callback()
    })

    return unpublishedCount
}


const publishAll = async () => {
    let repositories = await paginator(hub.related.contentRepositories.list)
    let publishedCount = 0

    await async.eachSeries(repositories, async (repo, callback) => {
        logUpdate(`${chalk.greenBright('publish')} repo ${repo.label}`)
        let contentItems = await paginator(repo.related.contentItems.list, { status: 'ACTIVE' })
        await async.eachSeries(contentItems, async (contentItem, cb) => {
            if (!(contentItem as any).lastPublishedDate) {
                logUpdate(`${chalk.greenBright('publish')} content item ${contentItem.id}`)
                await publishContentItem(contentItem)
                await sleep(500)
            }
            publishedCount++
            cb()
        })
        callback()
    })
    logComplete(`${chalk.blueBright('content items')}: [ ${chalk.green(publishedCount)} published ]`)
}

const unpublishAll = async () => {
    logger.info(`looking for published items...`)
    let repositories = await paginator(hub.related.contentRepositories.list)
    let unpublishedCount = 0

    await async.eachSeries(repositories, async (repo, callback) => {
        logUpdate(`${chalk.redBright('unpublish')} repo ${repo.label}`)
        let contentItems = await paginator(repo.related.contentItems.list, { status: 'ACTIVE' })
        await async.eachSeries(contentItems, async (contentItem, cb) => {
            if ((contentItem as any).lastPublishedDate) {
                unpublishedCount++
                logUpdate(`${chalk.redBright('unpublish')} content item ${contentItem.id} ${contentItem.label}`)
                await unpublishContentItem(contentItem)
                await sleep(500)
            }
            cb()
        })
        callback()
    })
    logComplete(`${chalk.blueBright('content items')}: [ ${chalk.red(unpublishedCount)} unpublished ]`)
}

const cdn = (hub: Hub): CDN => {
    const get = async (path: string) => {
        let url = `https://${hub.name}.cdn.content.amplience.net/content/${path}?depth=all&format=inlined`
        // logger.info(`get ${url}`)
        let response = await fetch(url)
        let data = await response.json()
        return data.content
    }

    return {
        getById: async (id: string) => await get(`id/${id}`),
        getByKey: async (key: string) => await get(`key/${key}`),
        getSearchKey: async (indexId: string, keyId: string) => await get(`algolia-search/${hub.id}/indexes/${indexId}/keys/${keyId}`)
    }
}

export default {
    login,
    createAndPublishContentItem,
    publishContentItem,
    cdn,
    synchronizeContentType,
    publishAll,
    unpublishAll,
    waitForPublishingQueue
}