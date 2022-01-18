import logger, { setLogDirectory } from './logger'
import { currentEnvironment } from "./environment-manager";
import { DynamicContent, Hub } from "dc-management-sdk-js";
import { DAMService } from "./dam/dam-service";
import amplienceHelper from "./amplience-helper";
import _ from 'lodash'

import { AxiosHttpClient, HttpRequest, HttpResponse } from 'dc-management-sdk-js'
import fs from 'fs-extra'
import { nanoid } from 'nanoid'
import { StatusCodes } from 'http-status-codes'
import chalk from 'chalk'
import { prompts } from './prompts';
import { Context } from './handlers/resource-handler';

const handler = async (context: Context) => {
    global.tempDir = context.tempDir as string || `/tmp/amprsa/amprsa-${nanoid()}`
    setLogDirectory(global.tempDir)
    
    fs.rmSync(global.tempDir, { recursive: true, force: true })
    fs.mkdirpSync(global.tempDir)
    logger.info(`${prompts.created} temp dir: ${chalk.blue(global.tempDir)}`)
    
    let requestLogDir = `${global.tempDir}/requests`
    
    // monkey patch the AxiosHttpClient that dc-management-sdk-js uses to capture requests and responses
    let origRequest = AxiosHttpClient.prototype.request
    AxiosHttpClient.prototype.request = async function (request: HttpRequest): Promise<HttpResponse> {
        let requestId = nanoid(4)
        let start = new Date()
        let response: HttpResponse = await origRequest.call(this, request)
        let duration = new Date().valueOf() - start.valueOf()
    
        // let's log this request and response
        logger.debug(`[ ${requestId} ] ${request.method} ${request.url} ${response.status} ${StatusCodes[response.status]} ${duration}ms`)
    
        if (context.logRequests) {
            fs.mkdirpSync(`${requestLogDir}/${requestId}`)
            fs.writeJSONSync(`${requestLogDir}/${requestId}/request.json`, request)
            fs.writeJSONSync(`${requestLogDir}/${requestId}/response.json`, response)
        }
    
        return response
    }
        
    // get DC & DAM configuration
    let { dc, dam } = currentEnvironment()

    // log in to DC
    let client = new DynamicContent({
        client_id: dc.clientId,
        client_secret: dc.clientSecret
    })

    let hub: Hub = await client.hubs.get(dc.hubId)
    if (!hub) {
        throw new Error(`hubId not found: ${dc.hubId}`)
    }

    let damService = new DAMService()
    await damService.init(dam)
    context.damService = damService

    await amplienceHelper.login(dc)
    context.client = client
    context.hub = hub
}
export default handler