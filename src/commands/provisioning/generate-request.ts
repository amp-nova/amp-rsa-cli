import { Arguments } from 'yargs';
import { readFileSync, writeFileSync } from "fs";
import { compile as handlebarsCompile } from 'handlebars';
import childProcess from 'child_process';

const yaml = require('js-yaml');

export const command = 'generate-request';
export const desc = "Generate Provisioning Request";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  try {
    let provisioningYAML = readFileSync(`${argv.settingsDir}/provisioning.yaml`).toString();
    const provisioningJSON = yaml.load(provisioningYAML)

    const templateString = readFileSync(`${argv.settingsDir}/assets/provisioning/request.yaml.hbs`).toString();
    const template = handlebarsCompile(templateString);
    const contentJSON = template(provisioningJSON);

    // Create repositories folder
    try { childProcess.execSync(`mkdir -p ${argv.settingsDir}/repositories/provisioning`); } catch(error) {}

    writeFileSync(`${argv.settingsDir}/repositories/provisioning/request.yaml`, contentJSON);
  } catch(error) {
    console.log(error.message);
  }
};
