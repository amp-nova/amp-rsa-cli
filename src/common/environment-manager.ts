import { join, dirname } from 'path';
import { readJsonSync, existsSync, mkdirpSync, writeJsonSync } from 'fs-extra';
import _ from 'lodash';
import chalk from 'chalk'
import { env } from 'yargs';
import childProcess from 'child_process'
const { Select } = require('enquirer');
import logger from '../common/logger'

const getConfigPath = (platform: string = process.platform): string => join(process.env[platform == 'win32' ? 'USERPROFILE' : 'HOME'] || __dirname, '.amplience');
const CONFIG_PATH = getConfigPath()
const ENV_FILE_PATH = `${CONFIG_PATH}/environments.json`

// make sure config directory exists
mkdirpSync(CONFIG_PATH)
let envConfig = existsSync(ENV_FILE_PATH) ? readJsonSync(ENV_FILE_PATH) : { envs: [], current: null }

const saveConfig = () => {
    writeJsonSync(ENV_FILE_PATH, envConfig, { encoding: 'utf-8' })
}

export const addEnvironment = (env: any) => {
    envConfig.envs.push(env)
    useEnvironment(env)
}

export const deleteEnvironment = (env: any) => {
    _.remove(envConfig.envs, (e: any) => e.envName === env.envName)
    saveConfig()
}

export const getEnvironments = () => {
    return _.map(envConfig.envs, env => ({
        ...env,
        active: envConfig.current === env.envName
    }))
}

export const chooseEnvironment = async(handler: any) => {
    const envs = getEnvironments()

    const prompt = new Select({
        name: 'env',
        message: 'choose an environment',
        choices: _.map(envs, 'envName')
    });

    let envName = await prompt.run()
    let env = _.find(envs, e => e.envName === envName)
    await handler(env)
}

export const listEnvironments = () => {
    _.each(getEnvironments(), env => {
        let str = `  ${env.envName}`
        if (env.active) {
            str = chalk.greenBright(`* ${env.envName}`)
        }
        console.log(str)
    })
}

export const useEnvironment = (env: any) => {
    logger.info(`[ ${chalk.greenBright(env.envName)} ] configure dc-cli...`);
    childProcess.execSync(`npx @amp-nova/dc-cli configure --clientId ${env.dc.clientId} --clientSecret ${env.dc.clientSecret} --hubId ${env.dc.hubId}`);

    // Configure DAM CLI if needed
    if (env.dam.username) {
        logger.info(`[ ${chalk.greenBright(env.envName)} ] configure dam-cli...`);
        childProcess.execSync(`npx @amp-nova/dam-cli configure --username ${env.dam.username} --password ${env.dam.password}`)
    }

    logger.info(`[ ${chalk.greenBright(env.envName)} ] environment active`);
    envConfig.current = env.envName
    envConfig.appUrl = env.appUrl
    saveConfig()
}

export const currentEnvironment = () => {
    if (envConfig.envs.length === 0) {
        throw new Error(`no envs found, use 'amprsa env init'`)
    }

    let dc = readJsonSync(`${CONFIG_PATH}/dc-cli-config.json`)
    let dam = readJsonSync(`${CONFIG_PATH}/dam-cli-config.json`)
    return { dc, dam, env: envConfig.current, appUrl: envConfig.appUrl }
}