import { Argv } from "yargs";
import { LoggableContext } from "../handlers/resource-handler";

import { loginDC, setupLogging } from './middleware';
import _ from "lodash";

import { nanoid } from 'nanoid'
import { cacheContentMap } from "./amplience-helper";
import { useEnvironment } from "./environment-manager";

export default (yargs: Argv): Argv =>
    yargs
        .options({
            logRequests: {
                alias: 'r',
                describe: 'log HTTP requests and responses',
                type: 'boolean',
                default: false
            },
            tempDir: {
                alias: 't',
                describe: 'temporary directory for all run files',
                default: `/tmp/amprsa/amprsa-${nanoid()}`
            },
            matchingSchema: {
                alias: 'm',
                describe: 'apply to content items matching schema name',
                type: 'array'
            }
        })
        .middleware([
            setupLogging, 
            async (c: LoggableContext) => await loginDC(c),
            async (context: LoggableContext) => {
                if (!_.includes(context._, 'show')) {
                    await useEnvironment(context.environment)

                    // caching a map of current content items. this appears to obviate the issue of archived items
                    // hanging out on published delivery keys
                    await cacheContentMap(context)
                }
            },
        ])
