import { getEnvironments } from '../../common/environment-manager';
import _ from 'lodash';
import chalk from 'chalk';

export const command = 'list';
export const desc = "List amprsa environments";
export const handler = () => {
    _.each(getEnvironments(), env => {
        let str = `  ${env.name}`
        if (env.active) {
            str = chalk.greenBright(`* ${env.name}`)
        }
        console.log(str)
    })
}
