import { Arguments } from 'yargs';

export const command = 'clone';
export const desc = "Clone all required git repositories";

export const handler = async (
  argv: Arguments
): Promise<void> => {
  console.log("Cloning dc-content-delivery-poc");
  console.log("Cloning willow-demo-services");
  console.log("Cloning willow-demo-web-react");
  // console.log("Cloning willow-demo-cards");
  // console.log("Cloning willow-demo-extension-personify");
};
