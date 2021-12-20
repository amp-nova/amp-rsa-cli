import chalk from 'chalk'

export const prompts: any = {
    create: chalk.green('create'),
    import: chalk.green('import'),
    update: chalk.green('update'),

    imported: chalk.greenBright('imported'),

    delete: chalk.red('delete'),
    unschedule: chalk.red('unschedule'),
    archive: chalk.yellowBright('archive'),
    error: chalk.redBright('error'),
}