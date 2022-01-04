import { builder as commonBuilder } from './common';
import _ from 'lodash';
import amplienceHelper from '../../common/amplience-helper';
import { Arguments } from 'yargs';
import { selectEnvironment } from '../../common/environment-manager';
import connectionMiddleware from '../../common/connection-middleware'

export const command = 'unpublish [env]';
export const desc = "Unpublish published content items";

export const builder = commonBuilder
export const handler = async (argv: Arguments): Promise<void> => {
    await selectEnvironment(argv)
    await connectionMiddleware(argv)
    await amplienceHelper.unpublishAll()
    process.exit(0)
};
