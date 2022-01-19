import Yargs from 'yargs/yargs';
import YargsCommandBuilderOptions from './common/yargs/yargs-command-builder-options';
import { Arguments, Argv } from 'yargs';
import chalk from 'chalk'

import logger from './common/logger';
import _ from 'lodash';
import { Context } from './common/handlers/resource-handler';

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
        .middleware([async (context: Context) => {
          logger.info(`run [ ${chalk.green(context._)} ]`)

          // monkey patch childProcess to log to the console whenever a shell command is used
          const childProcess = require('child_process');
          if (!childProcess._execSync) {
              let _execSync = childProcess.execSync
              childProcess.execSync = function (cmd: any) {
                  logger.info(`${chalk.greenBright(cmd)}`)
                  return _execSync.call(this, cmd)
              }
          }
      
          context.startTime = new Date()
        }])
        .options({
          logRequests: {
            alias: 'l',
            describe: 'log HTTP requests and responses',
            default: false
          },
          tempDir: {
            alias: 't',
            describe: 'temporary directory for all run files'
          }
        })
        .fail(failFn).argv;
      resolve(argv);
    }
  );
};

export default async (yargInstance = Yargs(process.argv.slice(2))): Promise<Arguments | void> => {
  return await configureYargs(yargInstance);
};