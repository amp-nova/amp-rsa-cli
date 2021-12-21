#!/usr/bin/env node

import fs from 'fs-extra'
import { nanoid } from 'nanoid'

global.tempDir = `/tmp/amprsa/amprsa-${nanoid()}`
fs.mkdirpSync(global.tempDir as string)

import cli from './cli';
cli();