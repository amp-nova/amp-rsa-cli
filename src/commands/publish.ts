import _ from 'lodash';
import amplienceHelper from '../common/amplience-helper';
import { contextHandler } from '../common/middleware';
import amplienceBuilder from './amplience-builder';

export const command = 'publish';
export const desc = "Publish unpublished content items";

export const builder = amplienceBuilder
export const handler = contextHandler(amplienceHelper.publishAll)