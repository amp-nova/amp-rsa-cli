import { Argv } from 'yargs';
import YargsCommandBuilderOptions from '../common/yargs/yargs-command-builder-options';

export const command = 'serverless';

export const desc = 'Serverless';

export const builder = (yargs: Argv): Argv =>
  yargs
    .commandDir('serverless', YargsCommandBuilderOptions)
    .demandCommand()
    .help();

export const handler = (): void => {
  /* do nothing */
};
