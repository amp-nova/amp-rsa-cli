import { Arguments } from 'yargs';

export const command = 'deploy';
export const desc = "Deploy AWS serverless stacks";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Deploying willow-content-delivery-poc");
  console.log("Deploying willow-demo-services");

};