import { Arguments } from 'yargs';
import { builder as commonBuilder } from './common';
import { selectEnvironment } from '../../common/environment-manager';
import connectionMiddleware from '../../common/connection-middleware'
import { ContentRepository, Hub } from 'dc-management-sdk-js';
import { paginator, searchIndexPaginator } from '../../common/paginator';
import _ from 'lodash';
import Table from 'cli-table'
import chalk from 'chalk';
import { logComplete, logUpdate } from '../../common/logger';

export const builder = commonBuilder

export const command = 'show [env]';
export const desc = "Show environment status";

export const handler = async (argv: Arguments): Promise<void> => {
    let env = await selectEnvironment(argv)
    await connectionMiddleware(argv)

    if (argv.hub) {
        let hub = argv.hub as Hub

        let repositories = await paginator(hub.related.contentRepositories.list)
        let contentTypeSchemas = await paginator(hub.related.contentTypeSchema.list, { status: 'ACTIVE' })
        let contentTypes = await paginator(hub.related.contentTypes.list, { status: 'ACTIVE' })

        // dave you can take this out later
        // let csv = _.map(contentTypeSchemas, schema => {
        //     let contentType = _.find(contentTypes, ct => ct.contentTypeUri === schema.schemaId)
        //     let str = `${schema.schemaId},${schema.validationLevel}`
        //     if (contentType) {
        //         str += `,${contentType.settings?.label}`
        //     }
        //     return str
        // }).join('\n')

        // const fs = require('fs-extra')
        // console.log(csv)

        // process.exit(0)

        let count: any = _.zipObject(_.map(repositories, r => r.name || ''), await Promise.all(repositories.map(async repo => {
            logUpdate(`reading repository ${repo.name}...`)
            return (await paginator(repo.related.contentItems.list, { status: 'ACTIVE' })).length
        })))

        logUpdate(`reading contentTypes...`)
        count.contentTypes = contentTypes.length

        logUpdate(`reading contentTypeSchemas...`)
        count.contentTypeSchemas = contentTypeSchemas.length

        logUpdate(`reading searchIndexes...`)
        count.searchIndexes = (await paginator(searchIndexPaginator(hub), { status: 'ACTIVE' })).length

        logUpdate(`reading extensions...`)
        count.extensions = (await paginator(hub.related.extensions.list, { status: 'ACTIVE' })).length

        logUpdate(`reading webhooks...`)
        count.webhooks = (await paginator(hub.related.webhooks.list, { status: 'ACTIVE' })).length

        logUpdate(`reading events...`)
        count.events = (await paginator(hub.related.events.list, { status: 'ACTIVE' })).length

        logComplete('')

        let table = new Table()
        _.each(count, (value, key) => {
            table.push({ [chalk.yellow(key)]: value })
        })
        console.log(table.toString())
    }

    process.exit(0)
};
