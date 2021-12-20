import { Hub } from "dc-management-sdk-js"
import { paginator } from "../paginator"
import _ from 'lodash'
import logger from "../logger"
import chalk from 'chalk'
import { HubOptions, IncludeOptions, RunOptions, MappingOptions } from "../interfaces"
import { Arguments } from "yargs"
import { prompts } from "../prompts"
import { HubSettingsOptions } from "../settings-handler"

export type Context = Arguments<HubOptions & MappingOptions & IncludeOptions & RunOptions>

const takeAction = async (related: any, key: string, action: string) => {
    let pageables = await paginator(related[key].list, { status: 'ACTIVE' })
    logger.info(`${prompts[action]} [ ${pageables.length} ] ${chalk.cyan(key)}...`)
    await Promise.all(pageables.map(async (y: any) => await y.related[action]()))
}

export interface Importable extends ResourceHandler {
    import(argv: HubSettingsOptions): Promise<any>
}

export interface Exportable extends ResourceHandler {

}

export interface Cleanable extends ResourceHandler {
    cleanup(argv: Context): Promise<any>
}

export abstract class ResourceHandler {
    resourceType: any
    resourceAction: string
    resourceTypeDescription: string
    sortPriority: number
    icon: string

    constructor(resourceType: any, resourceTypeDescription: string) {
        this.resourceType = resourceType
        this.resourceTypeDescription = resourceTypeDescription
        this.sortPriority = 1
        this.icon = '🧩'
        this.resourceType = resourceType

        if (resourceType) {
            let x = new resourceType()
            this.resourceAction = _.get(x, 'related.delete') ? 'delete' : 'archive'
        }
    }

    getDescription() {
        return `${this.icon} ${chalk.cyanBright(this.resourceTypeDescription)}`
    }

    abstract action(argv: Context): Promise<any>
    abstract getLongDescription(): string
}

export class CleanableResourceHandler extends ResourceHandler implements Cleanable {
    async cleanup(argv: Context): Promise<any> {
        await takeAction(argv.hub.related, this.resourceTypeDescription, this.resourceAction)
    }

    async action(argv: Context): Promise<any> {
        return await this.cleanup(argv)
    }

    getLongDescription(): string {
        return `${this.icon} ${prompts[this.resourceAction]} all ${chalk.cyanBright(this.resourceTypeDescription)}`
    }
}

export abstract class ImportableResourceHandler extends ResourceHandler implements Importable {
    sourceDir?: string
    abstract import(argv: HubSettingsOptions): Promise<any>

    async action(argv: Context): Promise<any> {
        return await this.import(argv)
    }

    constructor(resourceType: any, resourceTypeDescription: any, sourceDir?: string) {
        super(resourceType, resourceTypeDescription)
        this.sourceDir = sourceDir
    }

    getLongDescription(): string {
        return `${this.icon} ${chalk.green('import')} all ${chalk.cyanBright(this.resourceTypeDescription)}`
    }
}