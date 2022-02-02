import { CleanableResourceHandler } from "./resource-handler"
import { Webhook } from "dc-management-sdk-js"

export class WebhookHandler extends CleanableResourceHandler {
    icon = '📢'

    constructor() {
        super(Webhook, 'webhooks')
    }
}