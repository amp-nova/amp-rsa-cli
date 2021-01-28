import { Arguments } from 'yargs';

export const command = 'clean';
export const desc = "Clean all git repositories";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Cleaning repositories");

};
