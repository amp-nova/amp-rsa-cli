import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';
import { compile as handlebarsCompile } from 'handlebars'

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)
const fs = require('fs-extra')

export const command = 'configure';
export const desc = "Configure AWS serverless services";
const handle = (settingsJSON: any, argv: Arguments) => {
  const serverless = ["willow-demo-services"];

  // Configure all services
  serverless.map((item: string) => {
    // Getting and compiling serverless config template
    const configTemplate = fs.readFileSync(`${argv.automationDir}/assets/serverless/${item}/serverless.yml.hbs`).toString();
    const configTemplateCompiled = handlebarsCompile(configTemplate);

    // Applying settings to template
    const serverlessConfigYAML = configTemplateCompiled(settingsJSON);

    // Write serverless config to file
    let dir = `${argv.automationDir}/repositories/${item}`
    fs.mkdirpSync(dir)
    fs.writeFileSync(`${dir}/serverless.yml`, serverlessConfigYAML);
    console.log(`Wrote serverless config to file ${dir}/serverless.yml`)
  })
}