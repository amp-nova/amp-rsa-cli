import { CleanableResourceHandler } from "./resource-handler"
import { Webhook } from "dc-management-sdk-js"

export class WebhookCleanupHandler extends CleanableResourceHandler {
    constructor() {
        super(Webhook, 'webhooks')
        this.icon = ''
    }
}