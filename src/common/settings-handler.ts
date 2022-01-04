// import _, { Dictionary } from 'lodash'
// import { Arguments, Argv, boolean } from 'yargs';
// // import { fstat, readFileSync, writeFileSync, existsSync } from 'fs';
// import fs from 'fs-extra'
// import axios from 'axios'
// import { currentEnvironment } from '../common/environment-manager'
// import { DynamicContent, ContentRepository, ContentItem, Status, WorkflowState, ContentType } from 'dc-management-sdk-js'
// import chalk from 'chalk'
// import logger from './logger'

// import { ContentTypeSchemaImportHandler } from './handlers/content-type-schema-handler';
// import { ContentTypeImportHandler } from './handlers/content-type-handler';

// import { paginator, searchIndexPaginator } from './paginator';

// import amplience from './amplience-helper';
// import { Context } from './handlers/resource-handler';
// import { HubOptions, Mapping, MappingOptions } from './interfaces';
// import { ContentItemImportHandler } from './handlers/content-item-handler';
// import { copyTemplateFilesToTempDir } from './import-helper';
// import { ExtensionImportHandler } from './handlers/extension-handler';
// import { SearchIndexImportHandler } from './handlers/search-index-handler';
// import { SettingsImportHandler } from './handlers/settings-handler';
// import { Stats } from 'fs';
// import { DAMService } from './dam/dam-service';
// import { logRunEnd } from './status-helper';
// import { logHeadline } from './logger';

// const damAutomation = async (argv: Context) => {
//     if (false) { // remove DAM automation for now
//         // process step 0: npm run automate:media
//         let assetsBucket = await argv.damService.getBucketByName('Assets')
//         const damFolders = await argv.damService.getFoldersList(assetsBucket.id);
//         let damAssets = await getDAMAssets(argv)
//         let damFilesList = fs.readFileSync(`${argv.automationDir}/dam-images/list.txt`, { encoding: 'utf-8' }).split('\n')
//         let unpublishedDAMAssets = _.filter(damFilesList, fileName => fileName.indexOf('/') === 0 || !_.includes(_.map(damAssets, 'srcName'), fileName))

//         // Extract folders
//         const folders = damFilesList
//             .filter((value: any) => (value.Size === 0 && value.Key[value.Key.length - 1] === '/'))
//             .map((item: any) => item.Key.substr(0, item.Key.length - 1))
//             .sort();

//         // Create folders
//         const folderMap: any = {};
//         for (let i = 0; i < folders.length; i++) {
//             const key = folders[i];
//             const label = key.split('/').slice(-1)[0];
//             const folder = damFolders.find((y: any) => y.label === label);
//             if (folder) {
//                 // console.log(`Found folder ${folder.label} with ID ${folder.id}`);
//                 folderMap[folder.label] = folder.id;
//             } else {
//                 // console.log(`No folder found for label ${label}`);
//                 // console.log(`Creating folder ${label}`);
//                 const folderArray = key.split('/');
//                 let parentId: any;
//                 if (folderArray.length > 1) {
//                     const parent = folderArray[folderArray.length - 2];
//                     if (parent && folderMap[parent]) {
//                         // console.log(`Parent ${parent} found with ID ${folderMap[parent]}`)
//                         parentId = folderMap[parent];
//                     }
//                 }

//                 const payload: any = [{
//                     label,
//                     bucketId: assetsBucket.id
//                 }];

//                 if (parentId) payload[0].parentId = parentId;
//                 // console.log(payload);

//                 folderMap[label] = await argv.damService.createFolder(payload);
//             }
//         };

//         const imagesMap = _.map(unpublishedDAMAssets, filepath => {
//             const folderArray = filepath.split('/');
//             let folderID: any;
//             if (folderArray.length > 1) {
//                 const parent = folderArray[folderArray.length - 2];
//                 if (parent && folderMap[parent]) {
//                     // console.log(`Parent ${parent} found with ID ${folderMap[parent]}`)
//                     folderID = folderMap[parent];
//                 }
//             }

//             const path = filepath.split('/');
//             const filename = path[path.length - 1];
//             const name = filename.split('.').slice(0, -1).join('.')

//             // Check type
//             let type = name.endsWith('.html') || name.endsWith('.htm') || name.endsWith('.hbs') ? 'text' : 'image';
//             const payload: any = {
//                 srcName: filename,
//                 src: `https://nova-dam-assets-anyafinn.s3.eu-west-3.amazonaws.com/${filename}`,
//                 label: name,
//                 name: name,
//                 type,
//                 bucketID: assetsBucket.id
//             };
//             if (folderID) payload.folderID = folderID;
//             return payload;
//         })

//         logger.info(`uploading ${imagesMap.length} images to DAM...`)

//         argv.damService.createAssets({
//             mode: "overwrite",
//             assets: imagesMap
//         });

//         damAssets = await getDAMAssets(argv)

//         _.each(damAssets, da => {
//             if (da.name === 'desktop-3-coatsblog') {
//                 console.log(da)
//             }
//         })

//         let unpublishedAssets = _.filter(damAssets, da => da.publishStatus !== 'PUBLISHED')

//         console.log(`unpublished: ${unpublishedAssets}`)

//         // await damService.publishAssets({
//         //     prefix: "publish",
//         //     assets: unpublishedAssets.map((item: any) => item.id)
//         // });
//     }

// }