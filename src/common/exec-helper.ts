import _ from 'lodash'
import logger from './logger'
import childProcess from "child_process"
import { onExit } from '@rauschma/stringio'
import chalk from 'chalk'

export const execWithOutput = async (cmd: any) => {
    logger.info(`${chalk.greenBright(cmd)}`)

    let child = childProcess.exec(cmd)
    child.stdout?.on('data', (message: string) => {
        _.each(message.split('\n'), line => {
            logger.info(`${line.trim()}`)
        })
    })

    child.stderr?.on('data', (message: string) => {
        _.each(message.split('\n'), line => {
            logger.error(`${line.trim()}`)
        })
    })

    await onExit(child)
}