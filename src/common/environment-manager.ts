import { join, dirname } from 'path';
import { readJsonSync, existsSync, mkdirpSync, writeJsonSync } from 'fs-extra';
import _ from 'lodash';
import chalk from 'chalk'
import { Arguments, Argv, env } from 'yargs';
import childProcess from 'child_process'
const { Select } = require('enquirer');
import logger from '../common/logger'

const getConfigPath = (platform: string = process.platform): string => join(process.env[platform == 'win32' ? 'USERPROFILE' : 'HOME'] || __dirname, '.amplience');
const CONFIG_PATH = getConfigPath()
const ENV_FILE_PATH = `${CONFIG_PATH}/environments.json`

const saveConfig = () => writeJsonSync(ENV_FILE_PATH, envConfig, { encoding: 'utf-8' })

export const updateEnvironments = () => {
    _.each(envConfig.envs, env => {
        // envName to name
        if (env.envName) {
            env.name = env.envName
            delete env.envName
        }

        // appUrl to url
        if (env.appUrl) {
            env.url = env.appUrl
            delete env.appUrl
        }
    })
    delete envConfig.appUrl
    saveConfig()
}

// make sure config directory exists
mkdirpSync(CONFIG_PATH)
let envConfig = existsSync(ENV_FILE_PATH) ? readJsonSync(ENV_FILE_PATH) : { envs: [], current: null }
updateEnvironments()

export const addEnvironment = (env: any) => {
    envConfig.envs.push(env)
    useEnvironment(env)
}

export const deleteEnvironment = (env: any) => {
    _.remove(envConfig.envs, (e: any) => e.name === env.name)
    saveConfig()
}

export const getEnvironments = () => _.map(envConfig.envs, env => ({
    ...env,
    active: envConfig.current === env.name
}))

export const getEnvironment = (name: string) => _.find(envConfig.envs, env => name === env.name)
export const selectEnvironment = async (argv: Arguments) => argv.env ? getEnvironment(argv.env as string) : await chooseEnvironment()

export const chooseEnvironment = async (handler?: any) => {
    const envs = getEnvironments()

    const prompt = new Select({
        name: 'env',
        message: 'choose an environment',
        choices: _.map(envs, 'name')
    });

    let name = await prompt.run()
    let env = _.find(envs, e => e.name === name)

    if (handler) {
        await handler(env)
    }
    else {
        return env
    }
}

export const listEnvironments = () => {
    _.each(getEnvironments(), env => {
        let str = `  ${env.name}`
        if (env.active) {
            str = chalk.greenBright(`* ${env.name}`)
        }
        console.log(str)
    })
}

export const useEnvironment = (env: any) => {
    logger.info(`[ ${chalk.greenBright(env.name)} ] configure dc-cli...`);
    childProcess.execSync(`npx @amplience/dc-cli configure --clientId ${env.dc.clientId} --clientSecret ${env.dc.clientSecret} --hubId ${env.dc.hubId}`);

    // Configure DAM CLI if needed
    if (env.dam.username) {
        logger.info(`[ ${chalk.greenBright(env.name)} ] configure dam-cli...`);
        childProcess.execSync(`npx @amp-nova/dam-cli configure --username ${env.dam.username} --password ${env.dam.password}`)
    }

    logger.info(`[ ${chalk.greenBright(env.name)} ] environment active`);
    envConfig.current = env.name
    saveConfig()
}

export const currentEnvironment = () => {
    if (envConfig.envs.length === 0) {
        throw new Error(`no envs found, use 'amprsa env init'`)
    }

    let env = getEnvironment(envConfig.current)
    let dc = readJsonSync(`${CONFIG_PATH}/dc-cli-config.json`)
    let dam = readJsonSync(`${CONFIG_PATH}/dam-cli-config.json`)
    return { dc, dam, env }
}