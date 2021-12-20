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