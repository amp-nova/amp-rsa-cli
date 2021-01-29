import { Arguments } from 'yargs';
import childProcess from 'child_process';

export const command = 'install';
export const desc = "Install Web Application";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  const webapps = [
    "willow-demo-web-react"
  ];

  try {
    webapps.map((item: string) => {
      console.log(`Installing Web Application from ./repositories/${item}`);
      childProcess.execSync(
        `npm install`,
        { cwd: `./repositories/${item}` }
      );
    });
  } catch(error) {
    console.log(error.message);
  }
};