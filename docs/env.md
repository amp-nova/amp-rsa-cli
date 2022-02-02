# env

## Description

The **env** command category includes a number of interactions with amprsa environments.

Run `amprsa env --help` to get a list of available commands.

Return to [README.md](../README.md) for information on other commands.

<!-- MarkdownTOC levels="2,3" autolink="true" -->

- [Common Options](#common-options)
- [Commands](#commands)
  - [add](#add)
  - [delete](#delete)
  - [list](#list)
  - [use](#use)

<!-- /MarkdownTOC -->

## Common Options

The following options are available for all **content-type-schema** commands.

| Option Name    | Type                                                       | Description                      |
| -------------- | ---------------------------------------------------------- | -------------------------------- |
| --version      | [boolean]                                                  | Show version number              |
| --help         | [boolean]                                                  | Show help                        |

## Commands

### add

Adds an environment via a setup wizard.

#### Examples

##### Create an environment

```amprsa env add```

### delete

Deletes an environment configuration.

#### Options

| Option Name       | Type                                                         | Description                          |
| ----------------- | ------------------------------------------------------------ | ------------------------------------ |
| [env]             | [string]<br />[optional]                                     | The name of the environment.         |

#### Examples

##### Delete environment named 'env'

```amprsa env delete [env]```

### list

List configured amprsa environments.

#### Examples

##### List all envs

```amprsa env list```

### use

Use an amprsa environment. This also configures `@amplience/dc-cli`.

#### Options

| Option Name | Type                            | Description                           |
| ----------- | ------------------------------- | ------------------------------------- |
| [env]       | [string]<br />[optional]        | The name of the environment.          |

#### Examples

##### Use environment 'env'

```amprsa env use [env]```