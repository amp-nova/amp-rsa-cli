import Yargs from 'yargs/yargs';
import YargsCommandBuilderOptions from './common/yargs/yargs-command-builder-options';
import { Arguments, Argv } from 'yargs';
import chalk from 'chalk'
import { currentEnvironment } from './common/environment-manager';
import { DynamicContent, Hub } from 'dc-management-sdk-js';
import amplienceHelper from './common/amplience-helper';

import connectionMiddleware from './common/connection-middleware'

import logger from './common/logger';
import { prompts } from './common/prompts';
import { DAMService } from './common/dam/dam-service';
import _ from 'lodash';

const punycode = require('punycode')

//This regex requires Node > 10 (or Babel) as it's ES2018 
const regexSymbolWithCombiningMarks = /(\P{Mark})(\p{Mark}+)/gu;

const countSymbolsIgnoringCombiningMarks = (string: string) => {
  // Remove any combining marks, leaving only the symbols they belong to:
  const stripped = string.replace(regexSymbolWithCombiningMarks, ($0, symbol, combiningMarks) => {
    return symbol
  })

  // Account for astral symbols / surrogates, just like we did before:
  return punycode.ucs2.decode(stripped).length
}

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
        .fail(failFn).argv;
      resolve(argv);
    }
  );
};

export default async (yargInstance = Yargs(process.argv.slice(2))): Promise<Arguments | void> => {
  return await configureYargs(yargInstance);
};