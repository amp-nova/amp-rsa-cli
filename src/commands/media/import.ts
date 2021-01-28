import { Arguments } from 'yargs';

export const command = 'import';
export const desc = "Import media assets";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Importing content media");
  console.log("Importing product media");

};
