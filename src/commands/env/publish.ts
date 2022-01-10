import { builder as commonBuilder } from './common';
import _ from 'lodash';
import amplienceHelper from '../../common/amplience-helper';
import { Argv } from 'yargs';
import { selectEnvironment } from '../../common/environment-manager';
import connectionMiddleware from '../../common/connection-middleware'
import { Context } from '@lib/common/handlers/resource-handler';

export const command = 'publish [env]';
export const desc = "Publish unpublished content items";

export const builder = (yargs: Argv): Argv =>
    commonBuilder(yargs)
        .options({
            publishDelay: {
                alias: 'd',
                describe: 'milliseconds to wait between consecutive publishes',
                type: 'number',
                default: 750
            },
        })
        .help();

export const handler = async (argv: Context): Promise<void> => {
    await selectEnvironment(argv)
    await connectionMiddleware(argv)
    await amplienceHelper.publishAll(argv)
    process.exit(0)
};
