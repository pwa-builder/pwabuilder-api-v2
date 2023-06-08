#!/usr/bin/env node
import { promises as fs } from 'fs';
import { pathToFileURL } from 'url';
import { loadDefinition } from './utils.js';
import yaml from 'yaml';

import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Handle CLI arguments in your preferred way.
 * @see https://nodejs.org/en/knowledge/command-line/how-to-parse-command-line-arguments/
 */
const args = process.argv.slice(2);

/**
 * Extract definition
 * Pass an absolute specifier with file:/// to the loader.
 * The relative and bare specifiers would be based on assumptions which are not stable.
 * For example, if path from cli `examples/app/parameters.*` goes in, it will be assumed as bare, which is wrong.
 */

const config = args.splice(
  args.findIndex((i) => i === '--config'),
  2
)[1];

const definitionUrl = pathToFileURL(config);

// Because "Parsing error: Cannot use keyword 'await' outside an async function"
(async () => {
  /**
   * We're using an example module loader which you can swap with your own implemenentation.
   */
  const config = await loadDefinition(definitionUrl.pathname.replace(/^\//, ''));

  // Use the library
  const spec = await swaggerJsdoc(config);

  // Save specification place and format
  await fs.writeFile('./.openAPI/open-api.yaml', new yaml.Document(spec).toString());
  // await fs.writeFile('./.openAPI/open-api.json', JSON.stringify(spec, null, 2));

  console.log('Specification has been created successfully!');
})();
