import { Argv } from 'yargs';
import YargsCommandBuilderOptions from '../common/yargs/yargs-command-builder-options';

export const command = 'repositories';

export const desc = 'Repositories';

export const builder = (yargs: Argv): Argv =>
  yargs
    .commandDir('repositories', YargsCommandBuilderOptions)
    .demandCommand()
    .help();

export const handler = (): void => {
  /* do nothing */
};
