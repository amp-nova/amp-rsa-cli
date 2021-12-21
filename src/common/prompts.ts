import chalk from 'chalk'

export const prompts: any = {
    create: chalk.green('create'),
    import: chalk.green('import'),
    update: chalk.green('update'),

    imported: chalk.greenBright('imported'),
    done: chalk.bold.greenBright('done'),

    delete: chalk.red('delete'),
    deleted: chalk.red('deleted'),

    archive: chalk.yellowBright('archive'),
    archived: chalk.yellowBright('archived'),

    unschedule: chalk.red('unschedule'),
    error: chalk.redBright('error'),
}