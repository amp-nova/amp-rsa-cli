import fs from 'fs-extra'
import { ImportContext } from './handlers/resource-handler';
import { AnnotatedFile, fileIterator } from './utils';

export const copyTemplateFilesToTempDir = async (context: ImportContext) => {
    let contentFolder = `${context.tempDir}/content`
    let folder = `${context.automationDir}/content`

    // Create repositories folder
    fs.mkdirpSync(contentFolder)

    // Copy ./content folder in repositories
    fs.copySync(folder, contentFolder)

    await fileIterator(contentFolder, context).iterate(async file => {
    })
}
