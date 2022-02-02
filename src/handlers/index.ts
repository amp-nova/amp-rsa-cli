// import handlers
import { Cleanable, Exportable, Importable, ResourceHandler } from './resource-handler';
import { EventHandler } from './event-handler';
import { ExtensionHandler } from './extension-handler';
import { SearchIndexHandler } from './search-index-handler';
import { ContentItemHandler } from './content-item-handler';
import { ContentTypeHandler } from './content-type-handler';
import { ContentTypeSchemaHandler } from './content-type-schema-handler';
import { SettingsHandler } from './settings-handler';
import { WebhookHandler } from './webhook-handler';
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