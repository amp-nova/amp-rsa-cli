import { compile as handlebarsCompile } from 'handlebars';
import { Arguments, Argv } from 'yargs';
import { ampRsaBuilder, settingsHandler } from '../../common/settings-handler';
const fs = require('fs-extra')

export const builder = ampRsaBuilder
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

export const command = 'configure';
export const desc = "Configure webapp config files";
const handle = (settingsJSON: any, argv: Arguments) => {
  // Create repositories folder
  fs.mkdirpSync(`${argv.automationDir}/repositories/webapp/config`)

  // Copy ./assets/content folder in repositories
  console.log('Copying webapp config files to repositories folder');
  fs.removeSync(`${argv.automationDir}/repositories/webapp`)
  fs.copySync(`${argv.automationDir}/assets/webapp`, `${argv.automationDir}/repositories`)

  // Scan all handlebars files in ./repositories/assets/webapp
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

  // Finding all templates in folder
  const folder = `${argv.automationDir}/repositories/webapp`;
  console.log(`Finding all templates from ${folder} folder`);
  const assetsIterator = iterateDirectory();
  const files = assetsIterator(folder);

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

  // Copy config files to webapp
  console.log('Copying JSON config files to webapp')
  fs.mkdirpSync(`${argv.ampRsaDir}/config`)
  fs.copySync(`${argv.automationDir}/repositories/webapp/config/*.json`, `${argv.ampRsaDir}/config`)
}