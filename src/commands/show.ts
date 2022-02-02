import { paginator, searchIndexPaginator } from '../helpers/paginator';
import _ from 'lodash';
import Table from 'cli-table'
import chalk from 'chalk';
import { logComplete, logUpdate } from '../common/logger';
import { AmplienceContext, Context } from '../handlers/resource-handler';
import { contextHandler } from '../common/middleware';
import amplienceBuilder from '../common/amplience-builder';

export const command = 'show';
export const desc = "Show environment status";
export const builder = amplienceBuilder

export const handler = contextHandler(async (context: AmplienceContext): Promise<void> => {
    let repositories = await paginator(context.hub.related.contentRepositories.list)
    let contentTypeSchemas = await paginator(context.hub.related.contentTypeSchema.list, { status: 'ACTIVE' })
    let contentTypes = await paginator(context.hub.related.contentTypes.list, { status: 'ACTIVE' })

    let count: any = _.zipObject(_.map(repositories, r => r.name || ''), await Promise.all(repositories.map(async repo => {
        logUpdate(`reading repository ${repo.name}...`)
        let start = new Date().valueOf()
        let x = (await paginator(repo.related.contentItems.list, { status: 'ACTIVE' })).length
        logUpdate(`repo ${repo.name} read [ ${x} ] content items in ${new Date().valueOf() - start} ms`)
        return x
    })))

    logUpdate(`reading contentTypes...`)
    count.contentTypes = contentTypes.length

    logUpdate(`reading contentTypeSchemas...`)
    count.contentTypeSchemas = contentTypeSchemas.length

    logUpdate(`reading searchIndexes...`)
    count.searchIndexes = (await paginator(searchIndexPaginator(context.hub), { status: 'ACTIVE' })).length

    logUpdate(`reading extensions...`)
    count.extensions = (await paginator(context.hub.related.extensions.list, { status: 'ACTIVE' })).length

    logUpdate(`reading webhooks...`)
    count.webhooks = (await paginator(context.hub.related.webhooks.list, { status: 'ACTIVE' })).length

    logUpdate(`reading events...`)
    count.events = (await paginator(context.hub.related.events.list, { status: 'ACTIVE' })).length

    logComplete('')

    let table = new Table()
    _.each(count, (value, key) => {
        table.push({ [chalk.yellow(key)]: value })
    })
    console.log(table.toString())
    process.exit(0)
})