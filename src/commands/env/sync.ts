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
import { Context } from '../../common/handlers/resource-handler';

export const builder = commonBuilder

export const command = 'sync [env]';
export const desc = "Sync content types";

export const handler = async (argv: Arguments): Promise<void> => {
    await selectEnvironment(argv)
    await connectionMiddleware(argv)

    let context = argv as Context
    let { hub } = context
    let synchronizedCount = 0

    let activeTypes = await paginator(hub.related.contentTypes.list, { status: 'ACTIVE' });
    await Promise.all(activeTypes.map(async type => {
        synchronizedCount++
        logUpdate(`${prompts.sync} content type [ ${chalk.gray(type.contentTypeUri)} ]`)
        await amplienceHelper.synchronizeContentType(type)
    }))

    logComplete(`${chalk.blueBright(`contentTypes`)}: [ ${chalk.green(synchronizedCount)} synced ]`)
    process.exit(0)
};
