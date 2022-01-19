import { builder as commonBuilder } from './env/common';
import _ from 'lodash';
import amplienceHelper from '../common/amplience-helper';
import { Argv } from 'yargs';
import { withTempDir } from '../common/connection-middleware';

export const command = 'publish';
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

export const handler = withTempDir(amplienceHelper.publishAll)