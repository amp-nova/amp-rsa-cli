import _, { Dictionary } from 'lodash'
import logger, { logComplete } from './logger'
import childProcess from "child_process"
import { onExit } from '@rauschma/stringio'
import chalk from 'chalk'
import { logUpdate } from './logger'
import { prompts } from './prompts'

export class CLIJob {
    cmd: string
    reactions: Dictionary<(text: string) => void> = {}

    constructor(cmd: string) {
        this.cmd = cmd
    }

    on(text: string, handler: (text: string) => void) {
        this.reactions[text] = handler
    }

    async exec() {
        logger.info(`${chalk.greenBright(this.cmd)}`)

        let startTime = new Date().valueOf()
        let child = childProcess.exec(this.cmd)
        child.stdout?.on('data', (message: string) => {
            _.each(message.split('\n'), line => {
                if (line.length > 0) {
                    logUpdate(`${line.trim()}`)
                    _.each(this.reactions, (reaction, trigger) => {
                        if (line.indexOf(trigger) > -1) {
                            reaction(line)
                        }
                    })
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
}
