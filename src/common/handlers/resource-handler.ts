import { paginator } from "../paginator"
import _ from 'lodash'
import chalk from 'chalk'
import { Arguments } from "yargs"
import { prompts } from "../prompts"
import { logComplete } from "../logger"
import { Options } from "../types"

export type Context = Arguments<Options>

const takeAction = async (related: any, key: string, action: string) => {
    let pageables = await paginator(related[key].list, { status: 'ACTIVE' })
    let actionCount = 0
    await Promise.all(pageables.map(async (y: any) => {
        actionCount++
        await y.related[action]()
    }))
    let color = action === 'delete' ? chalk.red : chalk.yellow
    logComplete(`${chalk.blueBright(key)}: [ ${color(actionCount)} ${action}d ]`)
}

export interface Importable extends ResourceHandler {
    import(argv: Context): Promise<any>
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
        this.resourceTypeDescription = chalk.cyan(resourceTypeDescription)
        this.sortPriority = 1
        this.icon = '🧩'
        this.resourceType = resourceType

        if (resourceType) {
            let x = new resourceType()
            this.resourceAction = _.get(x, 'related.delete') ? 'delete' : 'archive'
        }
    }

    getDescription() {
        return `${this.icon} ${this.resourceTypeDescription}`
    }

    abstract getLongDescription(): string
}

export class CleanableResourceHandler extends ResourceHandler implements Cleanable {
    async cleanup(argv: Context): Promise<any> {
        await takeAction(argv.hub.related, this.resourceType, this.resourceAction)
    }

    getLongDescription(): string {
        return `${this.icon} ${prompts[this.resourceAction]} all ${this.resourceTypeDescription}`
    }
}

export abstract class ImportableResourceHandler extends ResourceHandler implements Importable {
    sourceDir?: string
    abstract import(argv: Context): Promise<any>

    constructor(resourceType: any, resourceTypeDescription: any, sourceDir?: string) {
        super(resourceType, resourceTypeDescription)
        this.sourceDir = sourceDir
    }

    getLongDescription(): string {
        return `${this.icon} ${chalk.green('import')} all ${this.resourceTypeDescription}`
    }
}