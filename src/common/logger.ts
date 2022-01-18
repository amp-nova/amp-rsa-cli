import winston, { format } from 'winston'
import chalk from 'chalk';
import { Console } from 'winston/lib/winston/transports';

const decolorizeString = (str: string) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
const decolorize = format((info, opts) => ({
  ...info,
  message: info.message && decolorizeString(info.message)
}))

let _log = Console.prototype.log
Console.prototype.log = function (info: any, callback: any) {
  if (process.env.NODE_ENV !== 'production') {
    _log.call(this, info, callback)
  }
}

const getLogger = (dir: string) => {
  return winston.createLogger({
    level: 'info',
    format: format.simple(),
    transports: [
      new winston.transports.File({
        filename: `${dir}/error.log`,
        level: 'error',
        format: format.combine(decolorize(), format.simple())
      }),
      new winston.transports.File({
        filename: `${dir}/combined.log`,
        level: 'debug',
        format: format.combine(decolorize(), format.simple())
      }),
      new winston.transports.Console({
        format: winston.format.simple(),
      })
    ]
  })
}

let logger = getLogger('')
export const setLogDirectory = (dir: string) => {
  logger = getLogger(dir)
}

export const logHeadline = (headline: string) => {
  logger.info('')
  logger.info('---------------------------------------------------')
  logger.info(chalk.green.bold(headline))
  logger.info('---------------------------------------------------')
  logger.info('')
}

let lineLength = process.stdout.columns - 6 // -6 for the 'exec  ' piece
export const logUpdate = (message: string) => {
  // debug log the string
  logger.debug(message)

  if (logger.level !== 'debug') {
    // trim the message in case it is too long
    message = message.substring(0, lineLength)

    let numSpaces = lineLength - decolorizeString(message).length
    process.stdout.write(`\r\r${chalk.bgWhite.black.bold('exec')}  ${message}${' '.repeat(numSpaces)}`)
  }
}

export const logComplete = (message: string) => {
  if (logger.level !== 'debug') {
    process.stdout.write(`\r\r${' '.repeat(lineLength)}`)
    process.stdout.write(`\r\r`)
  }
  logger.info(message)
}

import { Context } from "./handlers/resource-handler";
import _ from 'lodash';

export const logRunEnd = (argv: Context) => {
  let duration = new Date().valueOf() - argv.startTime.valueOf()
  let minutes = Math.floor((duration / 1000) / 60)
  let seconds = Math.floor((duration / 1000) - (minutes * 60))
  logger.info(`logs and temp files stored in ${chalk.blueBright(global.tempDir)}`)
  logger.info(`run completed in [ ${chalk.green(`${minutes}m${seconds}s`)} ]`)
  process.exit(0)
}

export default logger