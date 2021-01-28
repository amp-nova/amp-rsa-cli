import { Arguments } from 'yargs';
import childProcess from 'child_process';

export const command = 'update';
export const desc = "Update all git repositories";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  const packages = [
    "dc-content-delivery-poc",
    "willow-demo-services",
    "willow-demo-web-react",
    // "willow-demo-cards",
    // "willow-demo-extension-personify"
  ];

  packages.map((item: string) => {
    console.log(`Updating ${item}`);

    try {
      childProcess.execSync(
          `git pull origin master`,
          { cwd: `./repositories/${item}` }
        );
      } catch(error) {
        console.log(`Error ${error.message}`);
      }
        
  });
};
