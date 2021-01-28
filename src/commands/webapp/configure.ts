import { Arguments } from 'yargs';

export const command = 'configure';
export const desc = "Configure Web Application";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Configuring Algolia");
  console.log("Configuring Analytics");
  console.log("Configuring Application");
  console.log("Configuring Content");
  console.log("Configuring Commerce");
  console.log("Configuring DynamicYield");
  console.log("Configuring Personify");

};
