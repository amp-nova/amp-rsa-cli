import { Arguments } from 'yargs';
import { ampRsaBuilder, settingsHandler } from '../../common/settings-handler';
const fs = require('fs-extra')

export const builder = ampRsaBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

export const command = 'configure';
export const desc = "Configure all content assets";

import { compile as handlebarsCompile } from 'handlebars';

const handle = (settingsJSON: any, argv: Arguments) => {
  // Create repositories folder
  fs.mkdirpSync(`${argv.settingsDir}/repositories`)

  // Copy ./assets/content folder in repositories
  console.log('Copying content assets to repositories folder');
  fs.removeSync(`${argv.settingsDir}/repositories/content`)
  fs.copySync(`${argv.settingsDir}/assets/content`, `${argv.settingsDir}/repositories`)

  // Scan all handlebars files in ./repositories/assets/content
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
        console.log(ex);
        return files;
      }
    };
  };

  // Finding all templates in content folder
  const contentFolder = `${argv.settingsDir}/repositories/content`;
  console.log(`Finding all templates from ${contentFolder} folder`);
  const assetsIterator = iterateDirectory();
  const files = assetsIterator(contentFolder);

  // Render each template to file
  files.map((item: string) => {
    const templateString = fs.readFileSync(item).toString();
    const template = handlebarsCompile(templateString);
    const contentJSON = template(settingsJSON);

    // Write json to file
    const file = item.replace('.hbs', '');
    fs.writeFileSync(file, contentJSON);
    console.log(`Created json from template: ${file}`)

    // Remove template
    fs.unlinkSync(item);
  });

  // Create config folder if needed
  fs.mkdirpSync(`${argv.ampRsaDir}/config`)
  fs.copySync(`${argv.settingsDir}/repositories/content/content-type-schemas`, `${argv.ampRsaDir}/config`)
  fs.copySync(`${argv.settingsDir}/repositories/content/content-types`, `${argv.ampRsaDir}/config`)
}