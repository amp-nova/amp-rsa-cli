import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import { compile as handlebarsCompile } from 'handlebars';

const yaml = require('js-yaml');

export const command = 'configure';
export const desc = "Configure Web Application";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  const webapp = "amp-rsa";

  const services = [
    "algolia",
    "analytics",
    "app",
    "cms",
    "commercetools",
    "dynamicyield",
    "personify"
  ];

  // Reading settings
  const settingsYAML = readFileSync(`./settings.yaml`).toString();

  // Converting from YAML to JSON
  const settingsJSON = yaml.load(settingsYAML)
  console.log('Global Settings loaded');

  const webappFinal = `${webapp}-${settingsJSON.cms.hubName}`;

  try {
    services.map((item: string) => {

      // Getting and compiling services config template
      const configTemplate = readFileSync(`./assets/webapp/config/${item}.json.hbs`).toString();
      const configTemplateCompiled = handlebarsCompile(configTemplate);

      // Applying settings to template
      const serviceConfigJSON = configTemplateCompiled(settingsJSON);

      // Write services config to file
      writeFileSync(`./repositories/${webappFinal}/config/${item}.json`, serviceConfigJSON);
      console.log(`Wrote services config to file ./repositories/${webappFinal}/config/${item}.json`)
    });
  } catch(error) {
    console.log(error.message);
  }
};