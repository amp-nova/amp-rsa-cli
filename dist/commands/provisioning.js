"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.builder = exports.desc = exports.command = void 0;
const yargs_command_builder_options_1 = __importDefault(require("../common/yargs/yargs-command-builder-options"));
exports.command = 'provisioning';
exports.desc = 'Provisioning';
const builder = (yargs) => yargs
    .commandDir('provisioning', yargs_command_builder_options_1.default)
    .demandCommand()
    .help();
exports.builder = builder;
const handler = () => {
};
exports.handler = handler;
