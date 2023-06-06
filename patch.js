// This patch is needed to fix the issue with chrome-launcher on WSL under Azure Functions

import fs from 'fs';

const fileToPatch = 'node_modules/chrome-launcher/dist/utils.js';
fs.readFile(fileToPatch, 'utf8', function (err,data) {
  if (err) {
    return console.error(err);
  }
  const result = data.replace(/case \'wsl\'\:\n\s*\/\/ We populate the user\'s Windows temp dir so the folder is correctly created later/g, 
	`case 'wsl':
			if (process.env.PATCHED)
				return makeUnixTmpDir();
	`);

  fs.writeFile(fileToPatch, result, 'utf8', function (err) {
     if (err) return console.error(err);
  });
});