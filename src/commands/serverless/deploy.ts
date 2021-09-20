import { Arguments } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';

export const builder = settingsBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')

export const command = 'deploy';
export const desc = "Deploy AWS serverless services";
const handle = (settingsJSON: any, argv: Arguments) => {
  const serverless = [
    "willow-demo-services"
  ];
  serverless.map((item: string) => {
    console.log(`Deploying serverless service from ./repositories/${item}`);
    childProcess.execSync(`rm -rf .build && sls deploy --aws-profile ${settingsJSON.serverless.customProfileName}`, {
      cwd: `${argv.automationDir}/repositories/${item}` 
    });

    console.log(`Saving serverless service information from ./repositories/${item}`);
    childProcess.execSync(`sls info --aws-profile ${settingsJSON.serverless.customProfileName} > deployment.yaml`, {
      cwd: `${argv.automationDir}/repositories/${item}` 
    });

    // Removing first two lines from sls info
    childProcess.execSync(`sed -i -e '1,2d' deployment.yaml`, { 
      cwd: `${argv.automationDir}/repositories/${item}` 
    });
  });
}
