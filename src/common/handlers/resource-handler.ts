import { paginator } from "../paginator"
import _ from 'lodash'
import chalk from 'chalk'
import { Arguments } from "yargs"
import { prompts } from "../prompts"
import { logComplete } from "../logger"
import { CleanupArgs, ImportArgs, CommonArgs, AmplienceArgs, LoggableArgs } from "../types"

export type Context = Arguments<CommonArgs>
export type CommonContext = Arguments<CommonArgs>
export type AmplienceContext = Arguments<AmplienceArgs>
export type LoggableContext = Arguments<LoggableArgs>
export type ImportContext = Arguments<ImportArgs>
export type CleanupContext = Arguments<CleanupArgs>

export interface Importable extends ResourceHandler {
    import(context: ImportContext): Promise<any>
}

export interface Exportable extends ResourceHandler {

}

export interface Cleanable extends ResourceHandler {
    cleanup(context: CleanupContext): Promise<any>
}

export class ResourceHandler {
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
        this.resourceAction = 'delete'

        if (resourceType) {
            let x = new resourceType()
            this.resourceAction = _.get(x, 'related.delete') ? 'delete' : 'archive'
        }
    }

    getDescription() {
        return `${this.icon}  ${chalk.cyan(this.resourceTypeDescription)}`
    }

    getLongDescription() {
        return `${prompts[this.resourceAction]} all ${this.getDescription()}`
    }
}

export class CleanableResourceHandler extends ResourceHandler implements Cleanable {
    async cleanup(context: CleanupContext): Promise<any> {
        let type = (context.hub.related as any)[this.resourceTypeDescription]
        let pagableFn = type && type.list
        if (!pagableFn) {
            console.log(`not cleaning up for ${this.resourceTypeDescription}`)
            return
        }

        let pageables = await paginator(pagableFn, { status: 'ACTIVE' })
        let actionCount = 0
        await Promise.all(pageables.map(async (y: any) => {
            actionCount++
            await y.related[this.resourceAction]()
        }))
        let color = this.resourceAction === 'delete' ? chalk.red : chalk.yellow
        logComplete(`${this.getDescription()}: [ ${color(actionCount)} ${this.resourceAction}d ]`)
    }
}