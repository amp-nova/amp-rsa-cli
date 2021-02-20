import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import childProcess from 'child_process';
import { AsyncResource } from 'async_hooks';

const yaml = require('js-yaml');
const lodash = require('lodash');

export const command = 'set-default-theme';
export const desc = "Set Default Theme on the Themes node";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  const themeNode = "configuration/themes";

  try {

    // Get default theme content item by key
    console.log(`Getting Themes node with delivery key: ${themeNode}`);
    const output = childProcess.execSync(
        `dc-cli content-item get-by-key ${themeNode} --json`
    ).toString();
    const contentItem = JSON.parse(output);
    console.log(`Found Themes node with id: ${contentItem.id}`);

    console.log('Loading default theme JSON from file');
    const defaultThemeContent = readFileSync('./repositories/content/hierarchies/hierarchy-node-themes.json').toString();
    const defaultTheme = JSON.parse(defaultThemeContent);

    console.log('Setting default theme in Themes node');
    contentItem.body.defaultTheme = {};
    contentItem.body.defaultTheme.values = [];
    contentItem.body.defaultTheme.values.push(defaultTheme);

    console.log('Saving update to JSON file');
    writeFileSync('./repositories/content/hierarchies/hierarchy-node-themes-update.json', JSON.stringify(contentItem));

    // Get default theme content item by key
    console.log('Updating Themes node content item');
    childProcess.execSync(
        `dc-cli content-item update ${contentItem.id} ./repositories/content/hierarchies/hierarchy-node-themes-update.json --publish`
    ).toString();

  } catch(error) {
    console.log(error.message);
  }
};
