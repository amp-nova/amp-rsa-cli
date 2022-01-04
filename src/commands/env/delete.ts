import { Arguments } from 'yargs';
import { builder as commonBuilder } from './common';
import { deleteEnvironment, selectEnvironment } from '../../common/environment-manager';

export const command = 'delete [env]';
export const desc = "Delete an aria environment configuration";

export const builder = commonBuilder
export const handler = async (argv: Arguments): Promise<void> => await deleteEnvironment(await selectEnvironment(argv))