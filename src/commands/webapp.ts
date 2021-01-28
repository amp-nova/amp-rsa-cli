import { Argv } from 'yargs';
import YargsCommandBuilderOptions from '../common/yargs/yargs-command-builder-options';

export const command = 'webapp';

export const desc = 'Web Application';

export const builder = (yargs: Argv): Argv =>
  yargs
    .commandDir('webapp', YargsCommandBuilderOptions)
    .demandCommand()
    .help();

export const handler = (): void => {
  /* do nothing */
};
