import { Arguments } from 'yargs';
import readline from 'readline-sync'
import { addEnvironment, getEnvironments } from '../../common/environment-manager';
import _ from 'lodash';
import chalk from 'chalk';
import { builder as commonBuilder } from './common';

const { Input, Password } = require('enquirer');

export const command = 'add [env]';
export const desc = "Add an ARIA environment";
export const builder = commonBuilder

export const handler = async (argv: Arguments): Promise<void> => {
  try {    
    // get loaded environments
    let environments = getEnvironments()
    let name = await (new Input({ message: 'env name:', initial: argv.env }).run())

    if (_.find(environments, env => name === env.name)) {
      throw new Error(`environment already exists: ${name}`)
    }

    let cmsClientId = await (new Input({ message: `${chalk.cyanBright('cms')} client id:` }).run())
    let cmsClientSecret = await (new Password({ message: `${chalk.cyanBright('cms')} client secret:` }).run())
    let cmsHubId = await (new Input({ message: `${chalk.cyanBright('cms')} hub id:` }).run())
    let damUsername = await (new Input({ message: `${chalk.cyanBright('dam')} client id:` }).run())
    let damPassword = await (new Input({ message: `${chalk.cyanBright('dam')} client id:` }).run())
    let url = await (new Input({ message: `${chalk.cyanBright('app')} deployment url:` }).run())

    addEnvironment({
      name,
      url,
      dc: {
        clientId: cmsClientId,
        clientSecret: cmsClientSecret,
        hubId: cmsHubId        
      },
      dam: {
        username: damUsername,
        password: damPassword
      }
    })
  } catch(error) {
    console.log(chalk.red(error));
  }
};
