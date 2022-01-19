import logger, { setLogDirectory, logRunEnd } from './logger'
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

const useTempDir = (context: Context): Context => {
    context.tempDir = context.tempDir as string || `/tmp/amprsa/amprsa-${nanoid()}`
    setLogDirectory(context.tempDir)

    fs.rmSync(context.tempDir, { recursive: true, force: true })
    fs.mkdirpSync(context.tempDir)

    let requestLogDir = `${context.tempDir}/requests`

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

    logger.info(`${prompts.created} temp dir: ${chalk.blue(context.tempDir)}`)
    return context
}

const dcLogIn = async (context: Context) => {
    // get DC & DAM configuration
    let { dc } = currentEnvironment()

    // log in to DC
    let client = new DynamicContent({
        client_id: dc.clientId,
        client_secret: dc.clientSecret
    })

    let hub: Hub = await client.hubs.get(dc.hubId)
    if (!hub) {
        throw new Error(`hubId not found: ${dc.hubId}`)
    }
    else {
        logger.info(`connected to hub ${chalk.blueBright(`[ ${hub.name} ]`)}`)
    }

    context.client = client
    context.hub = hub
}

const damLogIn = async (context: Context) => {
    let { dam } = currentEnvironment()
    let damService = new DAMService()
    await damService.init(dam)
    logger.info(`connected to dam with user ${chalk.cyanBright(`[ ${dam.username} ]`)}`)
    context.damService = damService
}

const amplienceLogIn = async () => {
    let { dc } = currentEnvironment()
    await amplienceHelper.login(dc)
}

const useEnv = async (context: Context): Promise<Context> => {
    await Promise.all([
        dcLogIn(context),
        damLogIn(context),
        amplienceLogIn()
    ])
    return context
}

const contextHandler = async (handler: any, context: Context) => {
    try {
        await handler(context)
    } catch (error) {
        if (error.message) {
            logger.error(error.message);
        }

        _.each(error.response?.data?.errors, error => logger.error(`\t* ${chalk.bold.red(error.code)}: ${error.message}`))
        logger.error(error.stack)
    } finally {
        logRunEnd(context)
    }
}

export const withTempDir = (handler: any) => async (context: Context) => await contextHandler(handler, await useEnv(useTempDir(context)))
export const withEnv = (handler: any) => async (context: Context) => await contextHandler(handler, await useEnv(context))