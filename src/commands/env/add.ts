import { createEnvironment } from '../../common/environment-manager';
import _ from 'lodash';
import { builder as commonBuilder } from './common';

export const command = 'add [env]';
export const desc = "Add an ARIA environment";
export const builder = commonBuilder
export const handler = createEnvironment