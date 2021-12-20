import { settingsBuilder } from '../common/settings-handler';
import { Cleanable, Context } from '../common/handlers/resource-handler';
import _ from 'lodash'
import { Cleanables } from '../common/resource-handlers';
import chalk from "chalk";
import async from 'async'
import logger from '../common/logger';
import { ResourceHandler } from '../common/handlers/resource-handler';

const { Confirm, MultiSelect } = require('enquirer');

export const command = 'cleanup';
export const desc = "Clean up hub";

export const builder = settingsBuilder
export const handler = async (argv: Context): Promise<void> => {
    let choices: Cleanable[] = []
    if (argv.include) {
        choices = _.compact(_.map(argv.include, inc => _.find(Cleanables, handler => handler.resourceTypeDescription === inc)))
    }
    else {
        choices = await new MultiSelect({
            message: 'select categories to clean',
            choices: _.map(Cleanables, (h: ResourceHandler) => ({ name: h.getDescription(), value: h })),
            result(names: string[]) { return this.map(names) }
        }).run()
    }

    // sort by import priority
    choices = _.sortBy(choices, 'sortPriority')

    if (!argv.skipConfirmation) {
        console.log(`${chalk.redBright('warning:')} this will perform the following actions on hub [ ${chalk.cyanBright(argv.hub.name)} ]`)
        _.each(choices, (choice: Cleanable) => { console.log(`\t* ${choice.getLongDescription()}`) })
    }

    if (argv.skipConfirmation || await new Confirm({ message: `${chalk.bold(chalk.greenBright('proceed?'))}` }).run()) {
        await async.eachSeries(choices, async choice => { await choice.action(argv) })
    }

    let duration = new Date().valueOf() - argv.startTime.valueOf()
    let minutes = Math.floor((duration / 1000) / 60)
    let seconds = Math.floor((duration / 1000) - (minutes * 60))
    logger.info(`logs and temp files stored in ${chalk.blueBright(global.tempDir)}`)
    logger.info(`run completed in [ ${chalk.green(`${minutes}m${seconds}s`)} ]`)
    process.exit(0)
}