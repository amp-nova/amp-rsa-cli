import { createEnvironment, deleteEnvironment, listEnvironments, useEnvironmentFromArgs } from '../common/environment-manager';
import { Argv } from 'yargs';
import _ from 'lodash';

export const command = 'env'
export const description = 'Manage amprsa environments'

export const envBuilder = (yargs: Argv): Argv =>
  yargs.positional('env', {
    describe: 'env name',
    type: 'string',
    demandOption: false
  })

export const builder = (yargs: Argv): Argv =>
  yargs
    .demandCommand()
    .command("add", "Add an amprsa environment", createEnvironment)
    .command("delete [env]", "Delete an amprsa environment", envBuilder, deleteEnvironment)
    .command("list", "List amprsa environments", listEnvironments)
    .command("use [env]", "Use amprsa environment", envBuilder, useEnvironmentFromArgs)
    .help();