import { Arguments } from 'yargs';

export const command = 'import';
export const desc = "Import all content assets (schemas, types, etc.)";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Importing 00-workflow-states");
  console.log("Importing 01-extensions");
  console.log("Importing 02-content-type-schema");
  console.log("Importing 03-content-type");
  console.log("Importing 04-webhooks");
  console.log("Importing 05-indexes");
  console.log("Importing 06-hierarchies");
  console.log("Importing 07-content-item");

};
