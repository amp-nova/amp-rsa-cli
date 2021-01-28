import { Arguments } from 'yargs';

export const command = 'update';
export const desc = "Update all git repositories";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Updating repositories");

};
