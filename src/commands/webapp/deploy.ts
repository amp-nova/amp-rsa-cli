import { Arguments } from 'yargs';

export const command = 'deploy';
export const desc = "Deploy Web Application";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Deploying willow-demo-web-react");

};