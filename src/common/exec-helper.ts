import _ from 'lodash'
import logger, { logComplete } from './logger'
import childProcess from "child_process"
import { onExit } from '@rauschma/stringio'
import chalk from 'chalk'
import { logUpdate } from './logger'
import { prompts } from './prompts'

export const execWithOutput = async (cmd: any) => {
    logger.info(`${chalk.greenBright(cmd)}`)

    let startTime = new Date().valueOf()
    let child = childProcess.exec(cmd)
    child.stdout?.on('data', (message: string) => {
        _.each(message.split('\n'), line => {
            if (line.length > 0) {
                logUpdate(`${line.trim()}`)
            }
        })
    })

    child.stderr?.on('data', (message: string) => {
        _.each(message.split('\n'), line => {
            logger.error(`${line.trim()}`)
        })
    })

    await onExit(child)

    let duration = new Date().valueOf() - startTime
    logComplete(`${prompts.done} in ${chalk.green(duration)} ms`)
}