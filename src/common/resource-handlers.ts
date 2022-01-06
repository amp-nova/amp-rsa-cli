// import handlers
import { Cleanable, Exportable, Importable, ResourceHandler } from './handlers/resource-handler';
import { EventHandler } from './handlers/event-handler';
import { ExtensionHandler } from './handlers/extension-handler';
import { SearchIndexHandler } from './handlers/search-index-handler';
import { ContentItemHandler } from './handlers/content-item-handler';
import { ContentTypeHandler } from './handlers/content-type-handler';
import { ContentTypeSchemaHandler } from './handlers/content-type-schema-handler';
import { SettingsHandler } from './handlers/settings-handler';
import { WebhookHandler } from './handlers/webhook-handler';
import _ from 'lodash';

export const Handlers: ResourceHandler[] = [
    new EventHandler(),
    new ExtensionHandler(),
    new SearchIndexHandler(),
    new ContentItemHandler(),
    new ContentTypeHandler(),
    new ContentTypeSchemaHandler(),
    new SettingsHandler(),
    new WebhookHandler()
]

export const Cleanables: Cleanable[] = _.filter(Handlers, h => 'cleanup' in h) as Cleanable[]
export const Importables: Importable[] = _.filter(Handlers, h => 'import' in h) as Importable[]
export const Exportables: Exportable[] = _.filter(Handlers, h => 'export' in h) as Exportable[]