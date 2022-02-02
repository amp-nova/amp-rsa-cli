import _ from 'lodash';
import { purgeDeliveryKeys } from '../common/amplience-helper';
import { contextHandler } from '../common/middleware';
import amplienceBuilder from './amplience-builder';

export const command = 'purge';
export const desc = "Purge delivery keys from archived content items";

export const builder = amplienceBuilder
export const handler = contextHandler(purgeDeliveryKeys)