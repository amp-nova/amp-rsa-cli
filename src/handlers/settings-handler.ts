import { ResourceHandler, ImportContext } from "./resource-handler"
import fs from 'fs-extra'
import _ from 'lodash'
import { paginator } from "../helpers/paginator"
import { CLIJob } from "../helpers/exec-helper"
import logger, { logSubheading } from "../common/logger"
import chalk from "chalk"

export class SettingsHandler extends ResourceHandler {
    icon = '🛠'
    
    constructor() {
        super(undefined, 'settings')
    }

    async import(context: ImportContext) {
        let { hub } = context

        logSubheading(`[ import ] settings`)
        let settingsJSONFile = `${context.tempDir}/content/settings/settings.json`

        if (!fs.existsSync(settingsJSONFile)) {
            logger.info(`skipped, no settings.json found`)
            return
        }

        let hubWorkflowStates = await paginator(hub.related.workflowStates.list)
        let { settings, workflowStates } = fs.readJsonSync(settingsJSONFile)
        
        // if the values in the settings object from the file match those that are on the hub, we don't need to update
        settings = _.isEqualWith(_.pick(hub.settings, Object.keys(settings)), settings, (a: any, b: any) => {
            return Array.isArray(a) && Array.isArray(b) ? _.isEqual(_.sortBy(a), _.sortBy(b)) : undefined
        }) ? {} : settings

        // enforcing a uniqueness check in the importer since the platform doesn't.
        // it's really easy to run this a bunch of times and then end up with too many
        // workflow states.

        // TODO: should also factor color of the workflow state in
        workflowStates = _.reject(workflowStates, fws => _.includes(_.map(_.uniqBy(hubWorkflowStates, 'label'), 'label'), fws.label))

        if (!_.isEmpty(settings) || !_.isEmpty(workflowStates)) {
            fs.writeJsonSync(settingsJSONFile, { settings, workflowStates })
            await new CLIJob(`npx @amplience/dc-cli@latest settings import ${settingsJSONFile}`).exec()
        }
        else {
            logger.info(`settings are ${chalk.green('up-to-date')}`)
        }
    }
}