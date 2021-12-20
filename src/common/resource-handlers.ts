// import handlers
import { Cleanable, Exportable, Importable, ResourceHandler } from './handlers/resource-handler';
import { EventCleanupHandler } from './handlers/event-handler';
import { ExtensionCleanupHandler, ExtensionImportHandler } from './handlers/extension-handler';
import { SearchIndexImportHandler, SearchIndexCleanupHandler } from './handlers/search-index-handler';
import { ContentItemImportHandler, ContentItemCleanupHandler } from './handlers/content-item-handler';
import { ContentTypeImportHandler, ContentTypeCleanupHandler } from './handlers/content-type-handler';
import { ContentTypeSchemaImportHandler, ContentTypeSchemaCleanupHandler } from './handlers/content-type-schema-handler';
import { SettingsImportHandler } from './handlers/settings-handler';
import _ from 'lodash';

export const Handlers: ResourceHandler[] = [
    new EventCleanupHandler(),
    new ExtensionCleanupHandler(),
    new ExtensionImportHandler(),
    new SearchIndexCleanupHandler(),
    new SearchIndexImportHandler(),
    new ContentItemCleanupHandler(),
    new ContentItemImportHandler(),
    new ContentTypeCleanupHandler(),
    new ContentTypeImportHandler(),
    new ContentTypeSchemaCleanupHandler(),
    new ContentTypeSchemaImportHandler(),
    new SettingsImportHandler()
]

export const Cleanables: Cleanable[] = _.filter(Handlers, h => 'cleanup' in h) as Cleanable[]
export const Importables: Importable[] = _.filter(Handlers, h => 'import' in h) as Importable[]
export const Exportables: Exportable[] = _.filter(Handlers, h => 'export' in h) as Exportable[]