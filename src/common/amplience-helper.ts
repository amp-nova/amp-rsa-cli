import axios from "axios"
import fetch from 'isomorphic-unfetch'
import { ContentRepository, Folder, Hub } from "dc-management-sdk-js"
import { CDN } from "./interfaces"
import logger from "./logger"
import chalk from "chalk"

export class DynamicContentCredentials {
    clientId: string
    clientSecret: string
}

let dcUrl = `https://api.amplience.net/v2/content`

let accessToken = undefined
let dcHeaders = {}
let loginHeaders = {
    headers: {
        'content-type': 'application/x-www-form-urlencoded'
    }
}

const login = async (dc: DynamicContentCredentials) => {
    let oauthResponse = await axios.post(
        `https://auth.amplience.net/oauth/token?client_id=${dc.clientId}&client_secret=${dc.clientSecret}&grant_type=client_credentials`,
        {}, loginHeaders)

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

const publishContentItem = async (item: any) => {
    return await axios.post(`${dcUrl}/content-items/${item.id}/publish`, {}, dcHeaders)
}

export const deleteFolder = async (folder: Folder) => {
    return await axios.delete(`${dcUrl}/folders/${folder.id}`, dcHeaders)
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
    cdn
}