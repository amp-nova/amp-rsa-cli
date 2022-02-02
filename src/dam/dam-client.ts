import { Arguments } from 'yargs';
import fetch from 'isomorphic-unfetch';

export type ConfigurationParameters = {
    username: string;
    password: string;
};

/**
 * General fetch utilities to fetch resource, resource lists, update, delete
 * resources using Amplience Management REST API
 */
export class DAMClient {
    // Global variables
    apiUrl = process.env.API_URL || 'https://dam-live-api.adis.ws/v1.5.0';
    PAGE_SIZE = 1000;
    accessToken: string;

    async init(argv: ConfigurationParameters) {
        this.accessToken = await this.getAccessToken(argv.username, argv.password);
    }

    /**
     * Retrieve access token using Client ID and Client Secret
     * @param clientId Client ID
     * @param clientSecret Client secret
     */
    async getAccessToken(username: string, password: string): Promise<string> {
        const authUrlFinal = `${this.apiUrl}/auth`;
        const payload = {
            username,
            password
        };
        const response = await fetch(authUrlFinal, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        })
        const authorization: any = await response.json();
        return authorization.content.permissionsToken;
    }

    /**
     * Retrieve a single resource
     * @param endpointUri Endpoint URI
     */
    async fetchResource(endpointUri: string): Promise<any> {
        let resource: any = {};

        // console.log(`${this.apiUrl}${endpointUri}`)
        // console.log(this.accessToken)

        if (this.accessToken) {
            // Retrieve resources using REST API
            const response = await fetch(`${this.apiUrl}${endpointUri}`, {
                method: 'GET',
                headers: { 'X-Amp-Auth': this.accessToken }
            });
            if (response.ok) {
                resource = await response.json();
            }
        }

        return resource.content.data;
    }

    /**
     * Retrieve a list of resources
     * @param endpointUri Endpoint URI
     * @param resourceName Name of the embedded field for pagination
     */
    async fetchPaginatedResourcesList(endpointUri: string): Promise<any[]> {
        let resourcesList: any[] = [];

        if (this.accessToken) {

            // Retrieve resources using REST API
            const additionalParamsSeparator = endpointUri.indexOf('?') > 0 ? '&' : '?';
            const response = await fetch(`${this.apiUrl}${endpointUri}${additionalParamsSeparator}n=${this.PAGE_SIZE}`, {
                method: 'GET',
                headers: { 'X-Amp-Auth': this.accessToken }
            });
            const resources: any = await response.json();
            if (resources.content?.data) {
                const resourceFinal = resources.content.data;

                // Set current list
                resourcesList = resourceFinal;
            }

            // Go through all pages if needed
            if (resources.content.pageSize) {
                const numFound = resources.content.numFound;
                const pageSize = resources.content.pageSize;
                let totalPages = numFound / pageSize;
                if (numFound % pageSize > 0) totalPages++;

                let pageNumber = 0;
                while (pageNumber < totalPages - 2) {
                    pageNumber++;
                    const resourcesUrl = `${this.apiUrl}${endpointUri}${additionalParamsSeparator}n=${this.PAGE_SIZE}&s=${pageNumber * this.PAGE_SIZE}`;
                    const response = await fetch(resourcesUrl, {
                        method: 'GET',
                        headers: { 'X-Amp-Auth': this.accessToken }
                    });
                    const resources: any = await response.json();
                    if (resources.content?.data) {
                        const resourceFinal = resources.content.data;

                        // Merge with current list
                        resourcesList = [...resourcesList, ...resourceFinal];
                    }
                }
            }
        }

        // Return resourcesList as well as the access token for further calls
        return resourcesList;
    }

    /**
     * Delete a resource
     * @param endpointUri Endpoint URI
     */
    async deleteResource(endpointUri: string, resourceId: string): Promise<string> {
        let finalResourceId: any = '';

        if (this.accessToken) {
            // Delete resource using REST API
            const response = await fetch(`${this.apiUrl}${endpointUri}`, {
                method: 'DELETE',
                headers: { 'X-Amp-Auth': this.accessToken }
            });
            if (response.ok) {
                finalResourceId = resourceId;
            }
        }

        return resourceId;
    }

    /**
     * Create a resource
     * @param endpointUri Endpoint URI
     * @param data resource to create
     */
    async createResource(endpointUri: string, data: any): Promise<any> {
        let resource: any = {};
        if (this.accessToken) {
            // Create resource using REST API
            const response = await fetch(`${this.apiUrl}${endpointUri}`, {
                method: 'PUT',
                headers: {
                    'X-Amp-Auth': this.accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                resource = await response.json();
            }
        }
        return resource;
    }

    /**
     * Update a resource
     * @param endpointUri Endpoint URI
     * @param resourceId Resource ID
     * @param data resource to create
     */
    async updateResource(endpointUri: string, resourceId: string, data: any): Promise<string> {
        let updatedResourceId: any = '';

        if (this.accessToken) {
            // Update resource using REST API
            const response = await fetch(`${this.apiUrl}${endpointUri}`, {
                method: 'PUT',
                headers: {
                    'X-Amp-Auth': this.accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                updatedResourceId = resourceId;
            }
        }

        return resourceId;
    }

    /**
     * Publish resources
     * @param endpointUri Endpoint URI
     * @param data resources to publish
     */
    async publishResources(endpointUri: string, data: any): Promise<void> {
        if (this.accessToken) {
            // Retrieve resources using REST API
            const response = await fetch(`${this.apiUrl}${endpointUri}`, {
                method: 'POST',
                headers: { 'X-Amp-Auth': this.accessToken },
                body: JSON.stringify(data)
            });
        }
    }
}