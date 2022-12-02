const pushRegexes = [
	new RegExp(/[.|\n\s*]addEventListener\s*\(\s*['"]push['"]/m), // .addEventListener('push') or .addEventListener("push") or [new line] addEventListener('push')
	new RegExp(/[.|\n\s*]onpush\s*=/m) // self.onpush = ... [new line] onpush = ...
];
const periodicSyncRegexes  = [  
	new RegExp(/[.|\n\s*]addEventListener\s*\(\s*['"]periodicsync['"]/m), // .addEventListener("periodicsync") and .addEventListener('periodicsync')  [new line] addEventListener('periodicsync')
	new RegExp(/[.|\n\s*]onperiodicsync\s*=/m) // self.onperiodicsync = ... [new line] onperiodicsync = ...
];
const backgroundSyncRegexes = [
	new RegExp(/[.|\n\s*]addEventListener\s*\(\s*['"]sync['"]/m), // .addEventListener("sync") and .addEventListener('sync') [new line] addEventListener('sync')
	new RegExp(/[.|\n\s*]onsync\s*=/m), // self.onsync = function(...) [new line] onsync = function(...)
	new RegExp('BackgroundSyncPlugin') // new workbox.backgroundSync.BackgroundSyncPlugin(...)
];
const serviceWorkerRegexes = [
	new RegExp(/importScripts|self\.|^self/m),
	new RegExp(/[.|\n\s*]addAll/m),
	new RegExp(/[.|\n\s*]addEventListener\s*\(\s*['"]install['"]/m),
	new RegExp(/[.|\n\s*]addEventListener\s*\(\s*['"]fetch['"]/m),
];

export type AnalyzeServiceWorkerResponce = {
	detectedBackgroundSync?: boolean,
	detectedPeriodicBackgroundSync?: boolean,
	detectedPushRegistration?: boolean,
	detectedSignsOfLogic?: boolean,
	raw?: string,
	error?: string
}

export async function analyzeServiceWorker(serviceWorkerUrl?: string, serviceWorkerContent?: string): Promise<AnalyzeServiceWorkerResponce> {
	let content = serviceWorkerContent;
	if (serviceWorkerUrl) {
		const response = await fetch(serviceWorkerUrl);
		content = response.status == 200 ? await response.text() : undefined;
	}
	if (content?.length && typeof content == 'string'){
		return {
			detectedBackgroundSync: backgroundSyncRegexes.some((reg) => reg.test(content as string)),
			detectedPeriodicBackgroundSync: periodicSyncRegexes.some((reg) => reg.test(content as string)),
			detectedPushRegistration: pushRegexes.some((reg) => reg.test(content as string)),
			detectedSignsOfLogic: serviceWorkerRegexes.some((reg) => reg.test(content as string)),

			raw: Buffer.from(content).length / 1000 < 2048 ? content: 'Service Worker is bigger than 2048Kb'
		}
	}
	return {
		error: `analyzeServiceWorker: no content of Service Worker or it's unreachable`
	}
}


// function fetchImportedScripts(code: string): string[] {
//   // Use a regular expression to find all importScripts statements in the code
//   const importStatements = code.match(/importScripts\((.*?)\)/g);

//   // If there are no import statements, return an empty array
//   if (!importStatements) {
//     return [];
//   }

//   // For each import statement, extract the URL of the imported script
//   const urls = importStatements.map(statement => {
//     const matches = statement.match(/'(.*?)'/);
//     if (matches && matches.length > 1) {
//       return matches[1];
//     }
//   });

//   // Fetch the content of each script
//   const promises = urls.map(url => fetch(url));
//   const responses = await Promise.all(promises);

//   // Return the content of the scripts as an array of strings
//   return responses.map(response => response.text());
// }
