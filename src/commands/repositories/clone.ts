import { Arguments } from 'yargs';
import childProcess from 'child_process';

export const command = 'clone';
export const desc = "Clone all required git repositories";

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

  try {
    packages.map((item: string) => {
      console.log(`Cloning ${item}`);
      childProcess.execSync(
          `gh repo clone amplience/${item}`,
          { cwd: `./repositories` }
      );
    });
  } catch(error) {
    console.log(error.message);
  }
};
