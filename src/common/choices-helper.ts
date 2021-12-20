import _ from 'lodash'
import { Context, ResourceHandler } from "./handlers/resource-handler";
import chalk from "chalk";
import async from 'async'
import logger from './logger';

const { Confirm, MultiSelect } = require('enquirer');
const handler = <T extends ResourceHandler>(array: T[], message: string) => async (argv: Context): Promise<void> => {
}
export default handler 