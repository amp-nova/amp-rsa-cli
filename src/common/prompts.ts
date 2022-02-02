import chalk from 'chalk'

export const prompts: any = {
    create: chalk.green('create'),
    created: chalk.green.bold('created'),
    import: chalk.green('import'),
    update: chalk.green('update'),
    unarchive: chalk.yellow('unarchive'),

    sync: chalk.blue('sync'),

    imported: chalk.greenBright('imported'),
    done: chalk.bold.greenBright('done'),

    delete: chalk.red('delete'),
    deleted: chalk.bold.red('deleted'),

    archive: chalk.yellowBright('archive'),
    archived: chalk.bold.yellowBright('archived'),

    assign: chalk.blue('assign'),
    unassign: chalk.red('unassign'),

    unschedule: chalk.red('unschedule'),
    error: chalk.redBright('error'),
}