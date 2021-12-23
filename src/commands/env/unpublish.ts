import { builder as commonBuilder } from './common';
import { paginator } from '../../common/paginator';
import _ from 'lodash';
import chalk from 'chalk';
import { logComplete, logUpdate } from '../../common/logger';
import { prompts } from '../../common/prompts';
import amplienceHelper from '../../common/amplience-helper';
import { Arguments } from 'yargs';
import { selectEnvironment } from '../../common/environment-manager';
import connectionMiddleware from '../../common/connection-middleware'
import { Hub, ContentType } from 'dc-management-sdk-js';
import { Context } from '@lib/common/handlers/resource-handler';
import logger from '../../common/logger';

export const builder = commonBuilder

export const command = 'unpublish [env]';
export const desc = "Unpublish published content items";

export const handler = async (argv: Arguments): Promise<void> => {
    await selectEnvironment(argv)
    await connectionMiddleware(argv)
    await amplienceHelper.unpublishAll()

    process.exit(0)
};
