import { Arguments } from 'yargs';
import { settingsBuilder } from '../../common/settings-handler';
import readline from 'readline-sync'
import { chooseEnvironment, deleteEnvironment } from '../../common/environment-manager';
import _ from 'lodash'

export const command = 'delete';
export const desc = "Delete an aria environment configuration";
export const builder = settingsBuilder

export const handler = async (
  argv: Arguments
): Promise<void> => {
    await chooseEnvironment(deleteEnvironment)
};