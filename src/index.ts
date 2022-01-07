#!/usr/bin/env node

import { AxiosHttpClient, HttpRequest, HttpResponse } from 'dc-management-sdk-js'
import fs from 'fs-extra'
import { nanoid } from 'nanoid'
import { StatusCodes } from 'http-status-codes'
import Yargs from 'yargs/yargs'
import chalk from 'chalk'

global.tempDir = `/tmp/amprsa/amprsa-${nanoid()}`
fs.mkdirpSync(global.tempDir as string)

let requestLogDir = `${global.tempDir}/requests`

let { argv } = Yargs(process.argv.slice(2))

let origRequest = AxiosHttpClient.prototype.request
AxiosHttpClient.prototype.request = async function (request: HttpRequest): Promise<HttpResponse> {
    let requestId = nanoid(4)
    let start = new Date()
    let response: HttpResponse = await origRequest.call(this, request)
    let duration = new Date().valueOf() - start.valueOf()

    // let's log this request and response
    logger.debug(`[ ${requestId} ] ${request.method} ${request.url} ${response.status} ${StatusCodes[response.status]} ${duration}ms`)

    if (argv.logRequests) {
        fs.mkdirpSync(`${requestLogDir}/${requestId}`)
        fs.writeJSONSync(`${requestLogDir}/${requestId}/request.json`, request)
        fs.writeJSONSync(`${requestLogDir}/${requestId}/response.json`, response)
    }

    return response
}

const childProcess = require('child_process');
if (!childProcess._execSync) {
    childProcess._execSync = childProcess.execSync
    childProcess.execSync = (cmd: any) => {
        logger.info(`${chalk.greenBright(cmd)}`)
        return childProcess._execSync(cmd)
    }
}

import logger from './common/logger'
import cli from './cli';
cli();