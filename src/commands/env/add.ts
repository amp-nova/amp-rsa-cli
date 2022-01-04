import { Arguments } from 'yargs';
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

    addEnvironment({
      name,
      url: await (new Input({ message: `${chalk.cyanBright('app')} deployment url:` }).run()),
      dc: {
        clientId: await (new Input({ message: `${chalk.cyanBright('cms')} client id:` }).run()),
        clientSecret: await (new Password({ message: `${chalk.cyanBright('cms')} client secret:` }).run()),
        hubId: await (new Input({ message: `${chalk.cyanBright('cms')} hub id:` }).run())        
      },
      dam: {
        username: await (new Input({ message: `${chalk.cyanBright('dam')} username:` }).run()),
        password: await (new Password({ message: `${chalk.cyanBright('dam')} password:` }).run())
      }
    })
  } catch(error) {
    console.log(chalk.red(error));
  }
};
