#!/usr/bin/env node
const path = require('path');

console.log('FBref ingestion is intentionally stubbed.');
console.log('Add a legally compliant data source and write snapshots to:');
console.log(path.join(__dirname, '..', 'data', 'fbref', '<season>.json'));
console.log('Refer to data/fbref/schema.json for the expected shape.');
process.exit(0);
