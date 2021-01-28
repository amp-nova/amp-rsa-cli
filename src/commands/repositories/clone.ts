import { Arguments } from 'yargs';

export const command = 'clone';
export const desc = "Clone all required git repositories";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Cloning repositories");

};
