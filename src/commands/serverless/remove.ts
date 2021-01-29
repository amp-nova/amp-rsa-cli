import { Arguments } from 'yargs';
import childProcess from 'child_process';

export const command = 'remove';
export const desc = "Remove AWS serverless services";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  const serverless = [
    "dc-content-delivery-poc",
    "willow-demo-services"
  ];

  try {
    serverless.map((item: string) => {
      console.log(`Removing serverless service from ./repositories/${item}`);
      childProcess.execSync(
        `sls remove`,
        { cwd: `./repositories/${item}` }
      );
    });
  } catch(error) {
    console.log(error.message);
  }
};