import { Argv } from 'yargs';
import YargsCommandBuilderOptions from '../common/yargs/yargs-command-builder-options';

export const command = 'env';
export const desc = 'Manage environments';

export const builder = (yargs: Argv): Argv =>
  yargs
    .commandDir('env', YargsCommandBuilderOptions)
    .demandCommand()
    .help();

export const handler = (): void => {
  /* do nothing */
};
