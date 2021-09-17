import { compile as handlebarsCompile } from 'handlebars';
import { Arguments, Argv } from 'yargs';
import { settingsBuilder, settingsHandler } from '../../common/settings-handler';
import { readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs';

export const builder = (yargs: Argv): Argv =>
  settingsBuilder(yargs).
    demandOption(['ampRsaDir'], 'must provide path to amp-rsa installation')
export const handler = async (argv: Arguments): Promise<void> => settingsHandler(argv, desc, command, handle)

const childProcess = require('child_process')

export const command = 'configure';
export const desc = "Configure webapp config files";
const handle = (settingsJSON: any, argv: Arguments) => {
  // Create repositories folder
  try { childProcess.execSync(`mkdir ${argv.settingsDir}/repositories`); } catch (error) { }

  // Copy ./assets/content folder in repositories
  console.log('Copying webapp config files to repositories folder');
  try { childProcess.execSync(`rm -r ${argv.settingsDir}/repositories/webapp`); } catch (error) { }
  try { childProcess.execSync(`mkdir -p ${argv.settingsDir}/repositories/webapp/config`); } catch (error) { }
  childProcess.execSync(`cp -r ${argv.settingsDir}/assets/webapp ${argv.settingsDir}/repositories`);

  // Scan all handlebars files in ./repositories/assets/webapp
  const iterateDirectory = () => {
    const files: string[] = [];
    const dirs: string[] = [];

    return function directoryIterator(directory: string) {
      try {
        let dirContent = readdirSync(directory);
        dirContent.forEach(path => {
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
      } catch (ex) {
        console.log(ex);
        return files;
      }
    };
  };

  // Finding all templates in folder
  const folder = `${argv.settingsDir}/repositories/webapp`;
  console.log(`Finding all templates from ${folder} folder`);
  const assetsIterator = iterateDirectory();
  const files = assetsIterator(folder);

  // Render each template to file
  files.map((item: string) => {
    const templateString = readFileSync(item).toString();
    const template = handlebarsCompile(templateString);
    const contentJSON = template(settingsJSON);

    // Write json to file
    const file = item.replace('.hbs', '');
    writeFileSync(file, contentJSON);
    console.log(`Created json from template: ${file}`)

    // Remove template
    unlinkSync(item);
  });

  // Copy config files to webapp
  console.log('Copying JSON config files to webapp')
  try { childProcess.execSync(`mkdir ${argv.ampRsaDir}/config`); } catch (error) { }
  childProcess.execSync(`cp ${argv.settingsDir}/repositories/webapp/config/*.json ${argv.ampRsaDir}/config`);
}