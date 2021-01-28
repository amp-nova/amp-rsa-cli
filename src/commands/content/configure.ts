import { Arguments } from 'yargs';

export const command = 'configure';
export const desc = "Configure content assets (Configuration, etc.)";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Configuring Webhooks");
  console.log("Configuring Extensions");
  console.log("Configuring Configuration");

};
