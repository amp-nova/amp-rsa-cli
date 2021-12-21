import { Context } from "./handlers/resource-handler";
import chalk from "chalk";
import logger from "./logger";

export const logRunEnd = (argv: Context) => {
    let duration = new Date().valueOf() - argv.startTime.valueOf()
    let minutes = Math.floor((duration / 1000) / 60)
    let seconds = Math.floor((duration / 1000) - (minutes * 60))
    logger.info(`logs and temp files stored in ${chalk.blueBright(global.tempDir)}`)
    logger.info(`run completed in [ ${chalk.green(`${minutes}m${seconds}s`)} ]`)
    process.exit(0)
}