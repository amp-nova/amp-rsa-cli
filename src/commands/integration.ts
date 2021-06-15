import { Argv } from 'yargs';
import YargsCommandBuilderOptions from '../common/yargs/yargs-command-builder-options';

export const command = 'integration';

export const desc = 'Integration';

export const builder = (yargs: Argv): Argv =>
  yargs
    .commandDir('integration', YargsCommandBuilderOptions)
    .demandCommand()
    .help();

export const handler = (): void => {
  /* do nothing */
};
