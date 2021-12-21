import { Arguments } from 'yargs';
import { updateEnvironments } from '../../common/environment-manager';
import _ from 'lodash'

export const command = 'update';
export const desc = "Update config file format";

export const handler = async (argv: Arguments): Promise<void> => {
    updateEnvironments()
};