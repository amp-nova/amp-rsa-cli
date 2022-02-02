import logger, { logRunEnd, setLogDirectory } from './logger'
import { AxiosHttpClient, ContentItem, DynamicContent, HalResource, HttpRequest, HttpResponse, Hub, Page, Pageable, Sortable, Status } from "dc-management-sdk-js";
import { DAMService } from "../dam/dam-service";
import amplienceHelper from "./amplience-helper";
import _, { Dictionary } from 'lodash'

import fs from 'fs-extra'
import chalk from 'chalk'
import { prompts } from './prompts';
import { ImportContext, LoggableContext } from '../handlers/resource-handler';
import { paginator, StatusQuery } from '../helpers/paginator';
import { AugmentedHub } from './types';
import { timed } from "../handlers/typed-result";
import { nanoid } from 'nanoid';
import { StatusCodes } from 'http-status-codes';

type HubResult = Page<HalResource> | HalResource
export interface HubOperationResult {
    element: string
    operation: string
    duration: number
    result: HubResult
}

type HubOperationListener = (result: HubOperationResult) => any
export interface InstrumentedHub extends AugmentedHub {
    on: (fn: HubOperationListener) => void
    contentItemIterator: (fn: (item: ContentItem) => void, opts?: Pageable & Sortable & StatusQuery) => void
}

export const instrumentHub = (hub: InstrumentedHub): InstrumentedHub => {
    let listeners: HubOperationListener[] = []

    const instrument = (object: any, name: string) => {
        _.each(object, (fn: any, op) => {
            (object as any)[op] = async (args: any) => {
                let { duration, result } = await timed<HubResult>(`${name} ${op}`, async () => {
                    let page = await fn.call(object, args);
                    if (page instanceof Page) {
                        _.each((page as Page<HalResource>).getItems(), resource => {
                            _.each((resource as any).related, instrument)
                        })
                    }
                    return page
                });

                _.each(listeners, l => l({
                    element: name,
                    operation: op,
                    duration,
                    result
                }))

                return result;
            };
        });
    };

    _.each(hub.related, instrument)

    hub.on = (fn: HubOperationListener) => { listeners.push(fn) }
    hub.contentItemIterator = async (fn: (item: ContentItem) => void, opts: Pageable & Sortable & StatusQuery = { status: Status.ACTIVE }) => {
        await Promise.all((await paginator(hub.related.contentRepositories.list)).map(async repo => {
            await Promise.all((await paginator(repo.related.contentItems.list, opts)).map(fn))
        }))
    }

    return hub
}

export const loginDC = async (context: LoggableContext): Promise<LoggableContext> => {
    // log in to Dynamic Content
    let client = new DynamicContent({
        client_id: context.environment.dc.clientId,
        client_secret: context.environment.dc.clientSecret
    })

    context.hub = instrumentHub(await client.hubs.get(context.environment.dc.hubId) as InstrumentedHub)

    context.hub.on((result) => {
        logger.debug(`[ hub ] ${result.element} ${result.operation} ${result.duration} ms`)
    })

    let repositories = await paginator(context.hub.related.contentRepositories.list)
    context.hub.repositories = _.keyBy(repositories, 'name')
    context.hub.repositoryIdMap = _.zipObject(_.map(repositories, r => r.name!), _.map(repositories, 'id'))

    let workflowStates = await paginator(context.hub.related.workflowStates.list)
    context.hub.workflowStatesMap = _.zipObject(_.map(workflowStates, ws => _.camelCase(ws.label)), _.map(workflowStates, 'id'))

    if (!context.hub) {
        throw new Error(`hubId not found: ${context.environment.dc.hubId}`)
    }
    else {
        logger.info(`connected to hub ${chalk.blueBright(`[ ${context.hub.name} ]`)}`)
    }
    // end log in to DC

    await amplienceHelper.login(context)
    return context
}

export const loginDAM = async (context: ImportContext): Promise<ImportContext> => {
    context.damService = new DAMService()
    await context.damService.init(context.environment.dam)
    logger.info(`connected to dam with user ${chalk.cyanBright(`[ ${context.environment.dam.username} ]`)}`)
    return context
}

export const setupLogging = (context: LoggableContext): LoggableContext => {
    setLogDirectory(context.tempDir)
    fs.rmSync(context.tempDir, { recursive: true, force: true })
    fs.mkdirpSync(context.tempDir)
    logger.info(`${prompts.created} temp dir: ${chalk.blue(context.tempDir)}`)

    // monkey patch the AxiosHttpClient that dc-management-sdk-js uses to capture requests and responses
    let _request = AxiosHttpClient.prototype.request
    AxiosHttpClient.prototype.request = async function (request: HttpRequest): Promise<HttpResponse> {
        try {
            let start = new Date()
            let startString = start.valueOf()
            let requestId = `${startString}-${request.method}-${request.url.split('/').pop()?.split('?')?.[0]}`
            let response: HttpResponse = await _request.call(this, request)
            let duration = new Date().valueOf() - start.valueOf()
    
            // let's log this request and response
            logger.debug(`[ ${startString} ] ${request.method} | ${request.url} | ${response.status} | ${StatusCodes[response.status]} | ${duration}ms`)
    
            if (context.logRequests) {
                let subDir = response.status > 400 ? `error` : `success`
                let requestLogDir = `${context.tempDir}/requests/${subDir}/${requestId}`
                fs.mkdirpSync(requestLogDir)
                fs.writeJSONSync(`${requestLogDir}/request.json`, request)
                fs.writeJSONSync(`${requestLogDir}/response.json`, response)
            }
            return response
        } catch (error) {
            logger.info(error)
            throw error                
        }
    }


    return context
}

export const contextHandler = (handler: any) => async (context: LoggableContext) => {
    try {
        await handler(context)
    } catch (error) {
        console.log(error)
        logger.error(chalk.bold.red(error.message || error));
        _.each(error.response?.data?.errors, error => logger.error(`\t* ${chalk.bold.red(error.code)}: ${error.message}`))
        if (error.stack) {
            logger.error(error.stack)
        }
    } finally {
        logRunEnd(context)
    }
}

export default {
    loginDAM,
    loginDC,
    contextHandler
}