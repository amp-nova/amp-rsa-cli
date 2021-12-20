import { Arguments } from 'yargs';
import { settingsBuilder } from '../../common/settings-handler';
import readline from 'readline-sync'
import { addEnvironment, getEnvironments } from '../../common/environment-manager';
import _ from 'lodash';
import chalk from 'chalk';

export const command = 'add';
export const desc = "Add an ARIA environment";
export const builder = settingsBuilder

export const handler = async (
  argv: Arguments
): Promise<void> => {
  try {
    // get loaded environments
    let environments = getEnvironments()
    let envName = readline.question('environment name: ')

    if (_.find(environments, env => envName === env.envName)) {
      throw new Error(`environment already exists: ${envName}`)
    }

    let cmsClientId = readline.question('cms client id: ')
    let cmsClientSecret = readline.question('cms client secret: ', { hideEchoBack: true })
    let cmsHubId = readline.question('cms hub id: ')
    let damUsername = readline.question('dam username: ')
    let damPassword = readline.question('dam password: ', { hideEchoBack: true })
    let appUrl = readline.question('application deployment url: ')

    addEnvironment({
      envName,
      appUrl,
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
