import { Arguments } from 'yargs';
import { compile as handlebarsCompile } from 'handlebars';

const fs = require('fs-extra')
const yaml = require('js-yaml');

export const command = 'generate-request';
export const desc = "Generate Provisioning Request";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  try {
    let provisioningYAML = fs.readFileSync(`${argv.settingsDir}/provisioning.yaml`).toString();
    const provisioningJSON = yaml.load(provisioningYAML)

    const templateString = fs.readFileSync(`${argv.settingsDir}/assets/provisioning/request.yaml.hbs`).toString();
    const template = handlebarsCompile(templateString);
    const contentJSON = template(provisioningJSON);

    // Create repositories folder
    fs.mkdirpSync(`${argv.settingsDir}/repositories/provisioning`)
    fs.writeFileSync(`${argv.settingsDir}/repositories/provisioning/request.yaml`, contentJSON);
  } catch(error) {
    console.log(error.message);
  }
};
