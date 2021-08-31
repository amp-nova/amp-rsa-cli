import { Arguments } from 'yargs';
import childProcess from 'child_process';

export const command = 'install';
export const desc = "Install AWS serverless services";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  const serverless = [
    "willow-demo-services"
  ];

  try {
    serverless.map((item: string) => {
      console.log(`Installing serverless service from ./repositories/${item}`);
      childProcess.execSync(
        `npm install`,
        { cwd: `./repositories/${item}` }
      );
    });
  } catch(error) {
    console.log(error.message);
  }
};