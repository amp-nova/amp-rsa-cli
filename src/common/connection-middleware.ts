import { Arguments } from "yargs";
import { currentEnvironment } from "./environment-manager";
import { DynamicContent, Hub } from "dc-management-sdk-js";
import { DAMService } from "./dam/dam-service";
import amplienceHelper from "./amplience-helper";

const handler = async (argv: Arguments) => {
    // get DC & DAM configuration
    let { dc, dam } = currentEnvironment()

    // log in to DC
    let client = new DynamicContent({
        client_id: dc.clientId,
        client_secret: dc.clientSecret
    })

    let hub: Hub = await client.hubs.get(dc.hubId)
    if (!hub) {
        throw new Error(`hubId not found: ${dc.hubId}`)
    }

    let damService = new DAMService()
    await damService.init(dam)
    argv.damService = damService

    await amplienceHelper.login(dc)
    argv.client = client
    argv.hub = hub
    argv.cdn = await amplienceHelper.cdn(hub)
}
export default handler