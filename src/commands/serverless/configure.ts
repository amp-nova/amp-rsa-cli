import { Arguments } from 'yargs';

export const command = 'configure';
export const desc = "Configure AWS serverless stacks";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Configuring serverless stacks");

};