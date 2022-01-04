import { listEnvironments } from '../../common/environment-manager';
export const command = 'list';
export const desc = "List aria environments";
export const handler = listEnvironments
