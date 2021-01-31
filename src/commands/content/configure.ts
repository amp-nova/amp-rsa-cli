import { Arguments } from 'yargs';
import { readFileSync, readdirSync, writeFileSync, statSync } from 'fs';
import childProcess from 'child_process';
import { compile as handlebarsCompile } from 'handlebars';

const yaml = require('js-yaml');
const lodash = require('lodash');

export const command = 'configure';
export const desc = "Configure all content assets";

export const handler = async (
  argv: Arguments
): Promise<void> => {

  try {

    // Reading global settings
    const settingsYAML = readFileSync(`./settings.yaml`).toString();

    // Converting from YAML to JSON
    const settingsJSON = yaml.load(settingsYAML)
    console.log('Global settings loaded');

    // Copy ./assets/content folder in repositories
    console.log('Copying content assets to repositories folder');
    childProcess.execSync(`cp -r ./assets/content ./repositories`); 

    // Scan all handlebars files in ./repositories/assets/content
    const iterateDirectory = () => {
      const files: string[] = [];
      const dirs: string[] = [];
  
      return function directoryIterator(directory: string) {
        try {
            let dirContent = readdirSync(directory);
            dirContent.forEach( path => {
                const fullPath: string = `${directory}/${path}`;

                // Add to files list if it's an handlebars template
                if (statSync(fullPath).isFile()) {
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
        } catch(ex) {
            console.log(ex);
            return files;
        }
      };
    };

    // Finding all templates in content folder
    const contentFolder = './repositories/content';
    console.log(`Finding all templates from ${contentFolder} folder`);
    const assetsIterator = iterateDirectory();
    const files = assetsIterator(contentFolder);

    // Render each template to file
    files.map((item: string) => {
      const templateString = readFileSync(item).toString();
      const template = handlebarsCompile(templateString);
      const contentJSON = template(settingsJSON);

      // Write json to file
      const file = item.replace('.hbs', '');
      writeFileSync(file, contentJSON);
      console.log(`Created json from template: ${file}`)
    });

  } catch(error) {
    console.log(error.message);
  }
};
