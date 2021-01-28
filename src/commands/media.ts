import { Argv } from 'yargs';
import YargsCommandBuilderOptions from '../common/yargs/yargs-command-builder-options';

export const command = 'media';

export const desc = 'Media';

export const builder = (yargs: Argv): Argv =>
  yargs
    .commandDir('media', YargsCommandBuilderOptions)
    .demandCommand()
    .help();

export const handler = (): void => {
  /* do nothing */
};
