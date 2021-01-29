import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from 'fs';
import { compile as handlebarsCompile } from 'handlebars';

const yaml = require('js-yaml');

export const command = 'configure';
export const desc = "Configure AWS serverless services";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  const serverless = [
    "dc-content-delivery-poc",
    "willow-demo-services"
  ];

  try {

    // Reading global settings
    const settings = readFileSync(`./settings.yaml`).toString();

    // Converting from YAML to JSON
    const settingsJson = yaml.load(settings)
    console.log('Global settings loaded');

    // Configure all services
    serverless.map((item: string) => {

      // Getting and compiling serverless config template
      const configTemplate = readFileSync(`./assets/serverless/${item}/serverless.yml.hbs`).toString();
      const configTemplateCompiled = handlebarsCompile(configTemplate);

      // Applying settings to template
      const serverlessConfigYAML = configTemplateCompiled(settingsJson);

      // Write serverless config to file
      writeFileSync(`./repositories/${item}/serverless.yml`, serverlessConfigYAML);
      console.log(`Wrote serverless config to file ./repositories/${item}/serverless.yml`)
    });
  } catch(error) {
    console.log(error.message);
  }
};