import { join, dirname } from 'path';
import { readJsonSync, existsSync, mkdirpSync, writeJsonSync } from 'fs-extra';
import _ from 'lodash';
import chalk from 'chalk'
import { Arguments, Argv, env } from 'yargs';
import childProcess from 'child_process'
const { Select } = require('enquirer');
import logger from '../common/logger'
import { select } from 'async';

export const getConfigPath = (platform: string = process.platform): string => join(process.env[platform == 'win32' ? 'USERPROFILE' : 'HOME'] || __dirname, '.amplience');
export const CONFIG_PATH = getConfigPath()
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

export const addEnvironment = (env: any) => {
    envConfig.envs.push(env)
    useEnvironment(env)
}

export const deleteEnvironment = async (argv: Arguments) => {
    let env = await selectEnvironment(argv)
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
    const name = await (new Select({
        name: 'env',
        message: 'choose an environment',
        choices: _.map(envs, 'name')
    })).run()

    let env = _.find(envs, e => e.name === name)
    if (handler) {
        await handler(env)
    }
    else {
        return env
    }
}

export const useEnvironmentFromArgs = async (argv: any) => {
    let env = await selectEnvironment(argv)
    await useEnvironment(env)
}

export const useEnvironment = async (env: any) => {
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

export const currentEnvironment = async () => {
    if (envConfig.envs.length === 0) {
        logger.info(`no amprsa environments found, let's create one!`)
        logger.info('')
        await createEnvironment()
    }

    let env = getEnvironment(envConfig.current)
    if (!env) {
        env = await chooseEnvironment()
        useEnvironment(env)
    }
    return env
}

const { Input, Password } = require('enquirer');
export const createEnvironment = async () => {
    try {
        // get loaded environments
        let environments = getEnvironments()
        let name = await (new Input({ message: 'env name:' }).run())

        if (_.find(environments, env => name === env.name)) {
            throw new Error(`environment already exists: ${name}`)
        }

        addEnvironment({
            name,
            url: await (new Input({ message: `${chalk.blueBright('app')} deployment url:` }).run()),
            dc: {
                clientId: await (new Input({ message: `${chalk.cyanBright('cms')} client id:` }).run()),
                clientSecret: await (new Password({ message: `${chalk.cyanBright('cms')} client secret:` }).run()),
                hubId: await (new Input({ message: `${chalk.cyanBright('cms')} hub id:` }).run())
            },
            dam: {
                username: await (new Input({ message: `${chalk.magentaBright('dam')} username:` }).run()),
                password: await (new Password({ message: `${chalk.magentaBright('dam')} password:` }).run())
            }
        })
    } catch (error) {
        console.log(chalk.red(error));
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

// make sure config directory exists
mkdirpSync(CONFIG_PATH)
let envConfig = existsSync(ENV_FILE_PATH) ? readJsonSync(ENV_FILE_PATH) : { envs: [], current: null }
updateEnvironments()