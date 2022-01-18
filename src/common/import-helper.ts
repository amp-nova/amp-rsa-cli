import fs from 'fs-extra'
import { compile as handlebarsCompile } from 'handlebars';
import logger from './logger';
import { Context } from './handlers/resource-handler';

export const copyTemplateFilesToTempDir = (context: Context) => {
    let contentFolder = `${global.tempDir}/content`
    let folder = `${context.automationDir}/content`

    // Create repositories folder
    fs.mkdirpSync(contentFolder)

    // Copy ./content folder in repositories
    fs.copySync(folder, contentFolder)

    // Scan all handlebars files in ./content
    const iterateDirectory = () => {
        const files: string[] = [];
        const dirs: string[] = [];

        return function directoryIterator(directory: string) {
            try {
                let dirContent = fs.readdirSync(directory);
                dirContent.forEach((path: string) => {
                    const fullPath: string = `${directory}/${path}`;

                    // Add to files list if it's an handlebars template
                    if (fs.statSync(fullPath).isFile()) {
                        if (fullPath.endsWith('.hbs')) {
                            files.push(fullPath);
                        }
                    } else {

                        // Add sub-directory to directory list
                        dirs.push(fullPath);
                    }
                });
                const directoryPop = dirs.pop();

                // Scan next sub-directory
                if (directoryPop) { directoryIterator(directoryPop); }

                return files;
            } catch (ex) {
                logger.info(ex);
                return files;
            }
        };
    };

    // Finding all templates in content folder
    const assetsIterator = iterateDirectory();
    const files = assetsIterator(contentFolder);

    // Render each template to file
    files.map((item: string) => {
        const templateString = fs.readFileSync(item).toString();
        const template = handlebarsCompile(templateString);
        const contentJSON = template(context.mapping);

        // Write json to file
        const file = item.replace('.hbs', '');
        fs.writeFileSync(file, contentJSON);

        // Remove template
        fs.unlinkSync(item);
    });
}
