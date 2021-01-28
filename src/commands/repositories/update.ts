import { Arguments } from 'yargs';

export const command = 'update';
export const desc = "Update all git repositories";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Updating dc-content-delivery-poc");
  console.log("Updating willow-demo-services");
  console.log("Updating willow-demo-web-react");
  // console.log("Updating willow-demo-cards");
  // console.log("Updating willow-demo-extension-personify");
};
