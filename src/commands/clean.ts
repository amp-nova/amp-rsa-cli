import { Cleanable, Context } from '../common/handlers/resource-handler';
import _ from 'lodash'
import { Cleanables } from '../common/resource-handlers';
import chalk from "chalk";
import async from 'async'
import logger, { logRunEnd } from '../common/logger';
import { ResourceHandler } from '../common/handlers/resource-handler';
import { Argv } from 'yargs';

const { Confirm, MultiSelect } = require('enquirer');

export const command = 'cleanup';
export const desc = "Clean up hub";

export const builder = (yargs: Argv): Argv =>
    yargs
        .options({
            include: {
                alias: 'i',
                describe: 'types to include'
            },
            skipConfirmation: {
                alias: 'c',
                describe: 'skip confirmation prompt',
                type: 'boolean'
            },
            all: {
                alias: 'a',
                describe: 'clean up all resource types',
                type: 'boolean'
            },
        })
        .array('include')
        .help();

export const handler = async (argv: Context): Promise<void> => {
    try {
        let choices: Cleanable[] = []
        if (argv.all) {
            choices = Cleanables
        }
        else if (argv.include) {
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
            await async.eachSeries(choices, async (choice, callback) => { 
                await choice.cleanup(argv) 
                callback()
            })
        }
    } catch (error) {
        logger.error(error.message);
    } finally {
        logRunEnd(argv)
    }
}