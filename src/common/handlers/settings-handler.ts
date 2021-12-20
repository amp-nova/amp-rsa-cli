import { ImportableResourceHandler } from "./resource-handler"
import { execWithOutput } from "../exec-helper"
import { HubSettingsOptions } from "../settings-handler"
import fs from 'fs-extra'
import _ from 'lodash'
import { paginator } from "../paginator"
import { WorkflowState } from "dc-management-sdk-js"
import logger from "../logger"
import { prompts } from "../prompts"
import chalk from "chalk"

export class SettingsImportHandler extends ImportableResourceHandler {
    constructor() {
        super(undefined, 'settings')
    }

    async import(argv: HubSettingsOptions) {
        let { hub } = argv

        let settings = hub.settings
        let workflowStates = await paginator(hub.related.workflowStates.list)

        let { 
            settings: fileSettings, 
            workflowStates: fileWorkflowStates 
        } = fs.readJsonSync(`${global.tempDir}/content/settings/settings.json`)

        if (!settings ||
            !_.isEqual(settings.devices, fileSettings.devices) ||
            !_.isEqual(settings.applications, fileSettings.applications) ||
            !_.isEqual(settings.localization, fileSettings.localization)) {
            logger.info(`${prompts.update} hub settings`)
            await hub.related.settings.update(fileSettings)
        }    

        // enforcing a uniqueness check in the importer since the platform doesn't.
        // it's really easy to run this a bunch of times and then end up with too many
        // workflow states.
        let uniqueWorkflowStates = _.uniqBy(workflowStates, 'label')
        await Promise.all(fileWorkflowStates.map(async (fws: WorkflowState) => {
            if (!_.includes(_.map(uniqueWorkflowStates, 'label'), fws.label)) {
                logger.info(`${prompts.create} workflow state ${chalk.cyan(fws.label)}`)
                await hub.related.workflowStates.create(fws)
            }
        }))
    }
}