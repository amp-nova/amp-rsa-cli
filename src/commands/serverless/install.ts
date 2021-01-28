import { Arguments } from 'yargs';

export const command = 'install';
export const desc = "Install AWS serverless stacks";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Installing serverless stacks");

};