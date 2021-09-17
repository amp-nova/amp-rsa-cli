import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';
import { compile as handlebarsCompile } from 'handlebars'
import { readFileSync, writeFileSync } from 'fs';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)
const childProcess = require('child_process')

export const command = 'configure';
export const desc = "Configure AWS serverless services";
const handle = (settingsJSON: any, argv: Arguments) => {
  const serverless = [
    "willow-demo-services"
  ];

  // Configure all services
  serverless.map((item: string) => {
    // Getting and compiling serverless config template
    const configTemplate = readFileSync(`${argv.settingsDir}/assets/serverless/${item}/serverless.yml.hbs`).toString();
    const configTemplateCompiled = handlebarsCompile(configTemplate);

    // Applying settings to template
    const serverlessConfigYAML = configTemplateCompiled(settingsJSON);

    // Write serverless config to file
    // Create repositories folder
    let dir = `${argv.settingsDir}/repositories/${item}`
    try { childProcess.execSync(`mkdir -p ${dir}`); } catch (error) { }
    writeFileSync(`${dir}/serverless.yml`, serverlessConfigYAML);
    console.log(`Wrote serverless config to file ${dir}/serverless.yml`)
  })
}