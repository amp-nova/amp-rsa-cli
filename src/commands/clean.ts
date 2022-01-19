import { Cleanable, Context } from '../common/handlers/resource-handler';
import _ from 'lodash'
import { Cleanables } from '../common/resource-handlers';
import chalk from "chalk";
import async from 'async'
import { ResourceHandler } from '../common/handlers/resource-handler';
import { Argv } from 'yargs';
import { withTempDir } from '../common/connection-middleware';

const { Confirm, MultiSelect } = require('enquirer');

export const command = 'cleanup';
export const desc = "Clean up hub";

export const builder = (yargs: Argv): Argv =>
    yargs
        .options({
            include: {
                alias: 'i',
                describe: 'types to include',
                type: 'array'
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
            excludeDeliveryKey: {
                alias: 'e',
                describe: 'delivery key(s) to exclude from clean up',
                type: 'array'
            },
            deliveryKey: {
                alias: 'd',
                describe: 'delivery key(s) to clean up',
                type: 'array'
            }
        })
        .help();

export const handler = withTempDir(async (context: Context): Promise<void> => {
    let choices: Cleanable[] = []
    if (context.all) {
        choices = Cleanables
    }
    else if (context.include) {
        choices = _.compact(_.map(context.include, inc => _.find(Cleanables, handler => handler.resourceTypeDescription === inc)))
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

    if (!context.skipConfirmation) {
        console.log(`${chalk.redBright('warning:')} this will perform the following actions on hub [ ${chalk.cyanBright(context.hub.name)} ]`)
        _.each(choices, (choice: Cleanable) => { console.log(`\t* ${choice.getLongDescription()}`) })
    }

    if (context.skipConfirmation || await new Confirm({ message: `${chalk.bold(chalk.greenBright('proceed?'))}` }).run()) {
        await async.eachSeries(choices, async (choice, callback) => {
            await choice.cleanup(context)
            callback()
        })
    }
})