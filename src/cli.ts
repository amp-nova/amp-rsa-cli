import Yargs from 'yargs/yargs';
import YargsCommandBuilderOptions from './common/yargs/yargs-command-builder-options';
import { Arguments, Argv } from 'yargs';
import chalk from 'chalk'

import connectionMiddleware from './common/connection-middleware'

import logger from './common/logger';
import { prompts } from './common/prompts';
import _ from 'lodash';

const configureYargs = (yargInstance: Argv): Promise<Arguments> => {
  return new Promise(
    async (resolve): Promise<void> => {
      let failInvoked = false;
      const isYError = (err?: Error | string): boolean => err instanceof Error && err.name === 'YError';
      const failFn = (msg: string, err?: Error | string): void => {
        // fail should only be invoked once
        if (failInvoked) {
          return;
        }
        failInvoked = true;
        if ((msg && !err) || isYError(err)) {
          yargInstance.showHelp('error');
        }
      };
      const argv = yargInstance
        .scriptName('amprsa')
        .usage('Usage: $0 <command> [options]')
        .commandDir('./commands', YargsCommandBuilderOptions)
        .strict()
        .demandCommand(1, 'Please specify at least one command')
        .exitProcess(false)
        .showHelpOnFail(false)
        .middleware([async (argv) => {
          logger.info(`run [ ${chalk.green(argv._)} ]`)

          // don't run this middleware for 'env' commands
          if (!_.includes(argv._, 'env')) {
            logger.info(`${prompts.created} temp dir: ${chalk.blue(global.tempDir)}`)
            await connectionMiddleware(argv)
            argv.startTime = new Date()
          }
        }])
        .options({
          logRequests: {
            alias: 'l',
            describe: 'log HTTP requests and responses',
            default: false
          },
        })
        .fail(failFn).argv;
      resolve(argv);
    }
  );
};

export default async (yargInstance = Yargs(process.argv.slice(2))): Promise<Arguments | void> => {
  return await configureYargs(yargInstance);
};