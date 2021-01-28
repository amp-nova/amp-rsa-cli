import { Argv } from 'yargs';
import YargsCommandBuilderOptions from '../common/yargs/yargs-command-builder-options';

export const command = 'content';

export const desc = 'Content';

export const builder = (yargs: Argv): Argv =>
  yargs
    .commandDir('content', YargsCommandBuilderOptions)
    .demandCommand()
    .help();

export const handler = (): void => {
  /* do nothing */
};
