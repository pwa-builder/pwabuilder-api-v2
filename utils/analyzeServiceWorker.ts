const pushRegexes = [
	// new RegExp("\.addEventListener\(['|\"]push['|\"]"), // .addEventListener('push') or .addEventListener("push")
  // new RegExp("\n\s*addEventListener\(['|\"]push['|\"]"), // [new line] addEventListener('push')
	new RegExp(/[.|\n\s*]addEventListener\s*\(\s*['|"]push['|"]/m),
  // new RegExp('\.onpush\s*=), // self.onpush = ...
  // new RegExp("\n\s*onpush\s*=") // [new line] onpush = ...
	new RegExp(/[.|\n\s*]onpush\s*=/m)
];
const periodicSyncRegexes  = [ 
	// new RegExp("\.addEventListener\(['|\"]periodicsync['|\"]"), // .addEventListener("periodicsync") and .addEventListener('periodicsync'),
	// new RegExp("\n\s*addEventListener\(['|\"]periodicsync['|\"]"), // addEventListener('periodicsync') at the beginning of a line (or at the beginning of a line after zero or more whitespace). See https://github.com/pwa-builder/PWABuilder/issues/1863
	new RegExp(/[.|\n\s*]addEventListener\s*\(\s*['|"]periodicsync['|"]/m),
	// new RegExp("\.onperiodicsync\s*="), // self.onperiodicsync = ...
	// new RegExp("\n\s*onperiodicsync\s*=") // [new line] onperiodicsync = ...
	new RegExp(/[.|\n\s*]onperiodicsync\s*=/m)
];
const backgroundSyncRegexes = [
	// new RegExp('\.addEventListener\([\'|"]sync[\'|"]'), // .addEventListener("sync") and .addEventListener('sync')
	// new RegExp('\n\s*addEventListener\([\'|"]sync[\'|"]'), // [new line] addEventListener('sync')
	new RegExp(/[.|\n\s*]addEventListener\s*\(\s*['|"]sync['|"]/m),
	// new RegExp('\.onsync\s*='), // self.onsync = function(...)
	// new RegExp('\n\s*onsync\s*='), // [new line] onsync = function(...)
	new RegExp(/[.|\n\s*]onsync\s*=/m),
	new RegExp('BackgroundSyncPlugin') // new workbox.backgroundSync.BackgroundSyncPlugin(...)
];
const serviceWorkerRegexes = [
	new RegExp(/importScripts|self\.|^self/m),
	new RegExp(/[.|\n\s*]addAll/m),
	new RegExp(/[.|\n\s*]addEventListener\s*\(\s*['|"]install['|"]/m),
	new RegExp(/[.|\n\s*]addEventListener\s*\(\s*['|"]fetch['|"]/m),
];

export type AnalyzeServiceWorkerResponce = {
	hasBackgroundSync?: boolean,
	hasPeriodicBackgroundSync?: boolean,
	hasPushRegistration?: boolean,
	hasSignsOfLogic?: boolean,
	raw?: string,
	error?: string
}

export async function analyzeServiceWorker(serviceWorkerUrl?: string, serviceWorkerContent?: string): Promise<AnalyzeServiceWorkerResponce> {
	let content = serviceWorkerContent;
	if (serviceWorkerUrl) {
		const response = await fetch(serviceWorkerUrl);
		content = await response.text();
	}
	if (content?.length && typeof content == 'string'){
		return {
			hasBackgroundSync: backgroundSyncRegexes.some((reg) => reg.test(content as string)),
			hasPeriodicBackgroundSync: periodicSyncRegexes.some((reg) => reg.test(content as string)),
			hasPushRegistration: pushRegexes.some((reg) => reg.test(content as string)),
			hasSignsOfLogic: serviceWorkerRegexes.some((reg) => reg.test(content as string)),

			raw: Buffer.from(content).length / 1000 < 1024 ? content: 'Service Worker is bigger than 1024Kb'
		}
	}
	return {
		error: `analyzeServiceWorker: no content of Service Worker or it's unreachable`
	}
}