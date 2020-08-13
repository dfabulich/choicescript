#!/usr/bin/env node

global.require = require;
var file = 'autotest.js';
require('vm').runInThisContext(require('fs').readFileSync(file), file);