import fetch from 'node-fetch';

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

async function findAndFetchImportScripts(code: string, origin?: string): Promise<string[]|unknown[]> {
  // Use a regular expression to find all importScripts statements in the code
  const importScripts = code.match(/importScripts\s*\((.+?)\)/g);

  // If there are no import statements, return an empty array
  if (!importScripts) {
    return [];
  }

  // For each import statement, extract the URL of the imported script
  let urls = importScripts.flatMap(statement => {
    const matches = statement.match(/\(\s*(["'](.+)["'])\s*\)/);
    if (matches && matches.length > 2) {
      return matches[2];
    }
		return [];
  }) as string[];

	// Parse the URLs and remove any invalid ones
	if (urls?.length){
		urls = urls.flatMap((url) => {
			if (/(https:)/.test(url)) {
				try { return new URL(url).href } catch (error) {  }
			}
			else if (origin) {
				try { return new URL(url, origin).href } catch (error) {  }
			}

			return [];
		})

	}

  // Fetch the content of each script
  const fetchPromises = urls.map(url => fetch(url));
  const responses = await Promise.all(fetchPromises);

  // Return the content of the scripts as an array of strings
  const responcePromises = responses.map(response => response.text());
	const contents = await Promise.all(responcePromises);

	return contents;
}

export type AnalyzeServiceWorkerResponce = {
	detectedBackgroundSync?: boolean,
	detectedPeriodicBackgroundSync?: boolean,
	detectedPushRegistration?: boolean,
	detectedSignsOfLogic?: boolean,
	raw?: string[],
	error?: string
}

export async function analyzeServiceWorker(serviceWorkerUrl?: string, serviceWorkerContent?: string): Promise<AnalyzeServiceWorkerResponce> {
	let content = serviceWorkerContent;
	const separateContent: string[] = [];
	if (serviceWorkerUrl) {
		const response = await fetch(serviceWorkerUrl);
		content = response.status == 200 ? await response.text() : undefined;
	}
	if (content?.length && typeof content == 'string') {
		separateContent.push(content);

		try {
			// expand main SW content with imported scripts
			const scriptsContent = await findAndFetchImportScripts(content, serviceWorkerUrl? new URL(serviceWorkerUrl).origin: undefined);
			scriptsContent.forEach(scriptContent => {
				(content as string) += scriptContent;
				separateContent.push(scriptContent as string);
			});
		} catch (error) {
		}
			

		return {
			detectedBackgroundSync: backgroundSyncRegexes.some((reg) => reg.test(content as string)),
			detectedPeriodicBackgroundSync: periodicSyncRegexes.some((reg) => reg.test(content as string)),
			detectedPushRegistration: pushRegexes.some((reg) => reg.test(content as string)),
			detectedSignsOfLogic: serviceWorkerRegexes.some((reg) => reg.test(content as string)),

			raw: Buffer.from(content).length / 1000 < 2048 ? separateContent: undefined
		}
	}
	return {
		error: `analyzeServiceWorker: no content of Service Worker or it's unreachable`
	}
}
