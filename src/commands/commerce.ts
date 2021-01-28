import { Argv } from 'yargs';
import YargsCommandBuilderOptions from '../common/yargs/yargs-command-builder-options';

export const command = 'commerce';

export const desc = 'Commerce';

export const builder = (yargs: Argv): Argv =>
  yargs
    .commandDir('commerce', YargsCommandBuilderOptions)
    .demandCommand()
    .help();

export const handler = (): void => {
  /* do nothing */
};
