import fs from 'fs-extra'
import { compile as handlebarsCompile } from 'handlebars';
import logger from './logger';

export const copyTemplateFilesToTempDir = (automationDir: string, map?: any) => {
    let contentFolder = `${global.tempDir}/content`
    let folder = `${automationDir}/assets/content`

    // Create repositories folder
    fs.mkdirpSync(contentFolder)

    // Copy ./assets/content folder in repositories
    fs.copySync(folder, contentFolder)

    if (map) {
        // Scan all handlebars files in ./assets/content
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
            const contentJSON = template(map);

            // Write json to file
            const file = item.replace('.hbs', '');
            fs.writeFileSync(file, contentJSON);

            // Remove template
            fs.unlinkSync(item);
        });

        // const configFolder = `${map.contentFolder}/config`

        // // Create config folder if needed
        // fs.mkdirpSync(configFolder)
        // fs.copySync(`${contentFolder}/content-type-schemas`, `${configFolder}/content-type-schemas`)
        // fs.copySync(`${contentFolder}/content-types`, `${configFolder}/content-types`)
    }
}
