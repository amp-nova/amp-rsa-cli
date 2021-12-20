import { Argv } from 'yargs';
import { Importables } from '../common/resource-handlers';
import { Importable, Context } from '../common/handlers/resource-handler';

import { settingsBuilder, settingsHandler } from '../common/settings-handler';
export const builder = (yargs: Argv): void => { settingsBuilder(yargs).array('include') }
export const handler = async (argv: Context): Promise<void> => settingsHandler(argv, desc, command, handle)
import choicesHelper from '../common/choices-helper'

export const command = 'import';
export const desc = "Import hub data";

export const handle = choicesHelper<Importable>(Importables, 'select what to import')