import { Arguments } from 'yargs';
import { settingsBuilder } from '../../common/settings-handler';
import { chooseEnvironment, useEnvironment } from '../../common/environment-manager';
import _ from 'lodash'

export const command = 'use';
export const desc = "Use aria environments";
export const builder = settingsBuilder

export const handler = async (
  argv: Arguments
): Promise<void> => {
  await chooseEnvironment(useEnvironment)
};
