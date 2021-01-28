import { Arguments } from 'yargs';
import childProcess from 'child_process';

export const command = 'clean';
export const desc = "Clean all git repositories";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Cleaning repositories");
  try {
    childProcess.execSync(
        `rm -rf ./repositories/*`
      );
  } catch(error) {
    console.log(error.message);
  }
};
