import { Arguments } from 'yargs';
import childProcess from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const yaml = require('js-yaml');

export const command = 'deploy';
export const desc = "Deploy AWS serverless services";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  const serverless = [
    "dc-content-delivery-poc",
    "willow-demo-services"
  ];

  try {
    serverless.map((item: string) => {
      console.log(`Deploying serverless service from ./repositories/${item}`);
      childProcess.execSync(
        `rm -rf .build && npm run deploy`,
        { cwd: `./repositories/${item}` }
      );
      console.log(`Saving serverless service information from ./repositories/${item}`);
      childProcess.execSync(
        `sls info > deployment.yaml`,
        { cwd: `./repositories/${item}` }
      );

      // Removing first two lines from sls info
      childProcess.execSync(
        `sed -i -e '1,2d' deployment.yaml`,
        { cwd: `./repositories/${item}` }
      );
    });
  } catch(error) {
    console.log(error.message);
  }
};