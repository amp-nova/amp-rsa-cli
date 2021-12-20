import { Arguments } from 'yargs';
import { settingsBuilder } from '../../common/settings-handler';
import { listEnvironments } from '../../common/environment-manager';
import _ from 'lodash'

export const command = 'list';
export const desc = "List aria environments";
export const builder = settingsBuilder

export const handler = async (
  argv: Arguments
): Promise<void> => {
  listEnvironments()
};
