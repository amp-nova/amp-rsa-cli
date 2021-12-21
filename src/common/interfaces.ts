import { ContentItem, ContentRepository, DynamicContent, Hub } from 'dc-management-sdk-js';
import { DAMService } from './dam/dam-service';
import { AlgoliaConfig, AmplienceHub, AmplienceHubPointer, AMPRSAMapping } from './types';
import { Dictionary } from 'lodash';

export interface CDN {
    getById(id: string): Promise<any>
    getByKey(key: string): Promise<any>
    getSearchKey(index: string, key: string): Promise<any>
}

export interface HubOptions {
    ariaEnv?: string;
    hub: Hub;
    cdn: CDN
    client: DynamicContent
    repositories: RepositoryMapping
    damService: DAMService
}

export interface RepositoryMapping {
    content: ContentRepository
    siteComponents: ContentRepository
}

export interface RunOptions {
    startTime: Date
}

export interface IncludeOptions {
    include: string[]
    skipConfirmation: boolean
    ariaKey: string
}

export interface MappingOptions {
    mapping: Mapping
}

export interface Mapping {
    app: AppMapping
    cms: CMSMapping
    dam: DAMMapping
    algolia: AlgoliaConfig
}

export interface AppMapping {
    url: string
}

export interface CMSMapping {
    hierarchies: HierarchyMapping
    hub: AmplienceHub
    hubs: any
    repositories: any
    workflowStates: any
}

export interface HierarchyMapping {
    taxonomies: any
    configuration: any
}

export interface DAMMapping {
    imagesMap: any
}