import { Arguments } from 'yargs';

export const command = 'import';
export const desc = "Import commerce assets";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Importing product types");
  console.log("Importing categories");
  console.log("Importing products");

};
