import { Argv } from "yargs";

export const builder = (yargs: Argv): Argv =>
    yargs.positional('env', {
        describe: 'env name',
        type: 'string',
        demandOption: false
    }).help();
