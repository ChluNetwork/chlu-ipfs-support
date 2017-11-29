#!/usr/bin/env node

const ChluIPFS = require('../index');
const api = new ChluIPFS(); // TODO parameters
api.start().then(() => console.log('ChluIPFS Started'));