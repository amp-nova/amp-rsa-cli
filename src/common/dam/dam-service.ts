import { Arguments } from 'yargs';
import { DAMClient, ConfigurationParameters } from './dam-client';

/**
 * Service to manipulate Amplience resources using general fetch utilities to get,
 * list, import, export buckets and indexes/replicas
 */
export class DAMService {
    client: DAMClient;

    constructor() {
        this.client = new DAMClient();
    }

    // Initialise FetchUtilities (retrieve and set access token)
    async init(argv: Arguments<ConfigurationParameters>) {
        await this.client.init(argv);
        return this
    }

    /**
     * Get a bucket
     * @param bucketId ID of bucket to retrieve
     */
    async getBucket(bucketId: any): Promise<any> {
        const bucketList = await this.getBucketsList();
        return bucketList.find((item: any) => item.id === bucketId);
    }

    /**
     * Fetch list of all buckets
     */
    async getBucketsList(): Promise<any> {
        const bucketsList = await this.client.fetchResource(`/buckets?_=${Date.now}`);
        return bucketsList;
    }

    /**
     * Create a bucket
     * @param data Bucket data
     */
    async createBucket(data: any): Promise<any> {
        const response = await this.client.createResource(`/buckets`, data);
        return response.content.data[0];
    }

    /**
     * Update an existing bucket
     * @param bucketId ID of the bucket to update
     * @param data Bucket data
     */
    async updateBucket(bucketId: string, data: any): Promise<string> {
        const updatedBucketId = await this.client.updateResource(`/buckets/${bucketId}`, bucketId, data);
        return updatedBucketId;
    }

    /**
     * Get a bucket by name
     * @param bucketName Bucket name
     */
    async getBucketByName(bucketName: any): Promise<any> {
        const bucketsList = await this.getBucketsList();
        const bucket = bucketsList.filter((item: any) => item.label === bucketName);
        if (bucket.length > 0) {
            return bucket[0];
        } else {
            console.log(`...No extension found for name ${bucketName}`);
            return null;
        }
    }

    async getAssetsListForBucket(bucketName: any): Promise<any> {
        let bucket = await this.getBucketByName(bucketName)
        const assetsList = await this.client.fetchPaginatedResourcesList(`/assets?filter=bucketID:${bucket.id}`);
        return assetsList;
    }

    async getEndpoints(): Promise<any> {
        const endpoints = await this.client.fetchPaginatedResourcesList(`/endpoints`);
        return endpoints
    }

    /**
     * Fetch list of all assets
     */
    async getAssetsList(bucketId: any): Promise<any> {
        const assetsList = await this.client.fetchPaginatedResourcesList(`/assets?filter=bucketID:${bucketId}`);
        return assetsList;
    }

    /**
     * Fetch asset
     */
    async getAsset(id: any): Promise<any> {
        const asset = await this.client.fetchResource(`/assets/${id}`);
        return asset[0];
    }

    /**
     * Create assets
     */
    async createAssets(data: any): Promise<any> {
        const assetsList = await this.client.createResource(`/assets`, data);
        return assetsList;
    }

    /**
     * Publish assets
     */
    async publishAssets(data: any): Promise<any> {
        const assetsList = await this.client.publishResources(`/assets/publish`, data);
        return assetsList;
    }

    /**
     * Fetch list of all folders
     */
    async getFoldersList(bucketId: any): Promise<any> {
        const foldersList = await this.client.fetchResource(`/folders?filter=bucketID:${bucketId}`);
        const childrenList: any[] = [];
        const nodes = foldersList[0];

        const addChildrenToList = (childrenList: any[], node: any) => {
            childrenList.push(node);
            if (node.children) {
                node.children.forEach((item: any) => addChildrenToList(childrenList, item));
                delete node.children;
            }
        }
        addChildrenToList(childrenList, nodes);

        return childrenList;
    }

    /**
     * Create a folder
     * @param data Bucket data
     */
    async createFolder(data: any): Promise<string> {
        const folderId = await this.client.createResource(`/folders`, data);
        return folderId.content.data[0];
    }
}
