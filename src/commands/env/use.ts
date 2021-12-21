import { Arguments } from 'yargs';
import { builder as commonBuilder } from './common';
import { selectEnvironment, useEnvironment } from '../../common/environment-manager';
export const builder = commonBuilder

export const command = 'use [env]';
export const desc = "Use aria environment";

export const handler = async (argv: Arguments): Promise<void> => await useEnvironment(await selectEnvironment(argv))