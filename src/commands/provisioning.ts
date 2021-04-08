import { Argv } from 'yargs';
import YargsCommandBuilderOptions from '../common/yargs/yargs-command-builder-options';

export const command = 'provisioning';

export const desc = 'Provisioning';

export const builder = (yargs: Argv): Argv =>
  yargs
    .commandDir('provisioning', YargsCommandBuilderOptions)
    .demandCommand()
    .help();

export const handler = (): void => {
  /* do nothing */
};
