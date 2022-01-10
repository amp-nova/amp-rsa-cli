import { ContentRepository, DynamicContent, Hub } from 'dc-management-sdk-js';
import { DAMService } from './dam/dam-service';

export interface Options {
    hub: Hub
    client: DynamicContent
    repositories: RepositoryMapping
    damService: DAMService
    automationDir: string
    publishDelay: number

    startTime: Date

    include: string[]
    skipConfirmation: boolean
    ariaKey: string

    mapping: Mapping

    importSourceDir?: string
}

export interface RepositoryMapping {
    content: ContentRepository
    siteComponents: ContentRepository
    emailMarketing: ContentRepository
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
    brandColors: string
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
    mediaEndpoint: string
    imagesMap: any
}

export class AMPRSAMapping {
    from: string
    to: string
}

export class AMPRSAConfig {
    environment: string // env name
    app: AppConfig
    algolia: AlgoliaConfig
    cms: AmplienceConfig
}

export class AppConfig {
    url: string
}

export class AlgoliaConfig {
    appId: string
    apiKey: string
    indexes: AlgoliaIndexSet[]
}

export class AlgoliaIndexSet {
    key: string
    prod: string
    staging: string
}

export class AmplienceConfig {
    hub: AmplienceHub
    hubs: AmplienceHubPointer[]
}

export class AmplienceHub {
    name: string
    stagingApi: string
    socketIoServer: string
}

export class AmplienceHubPointer {
    key: string
    name: string
}