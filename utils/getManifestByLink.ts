import puppeteer from 'puppeteer';

export async function getManifestByLink(link: string, site: string): Promise<{link?: string, json?: unknown, raw?: string, error?: unknown}> {
	let error: unknown = 'no manifest or site link provided';

	if (link && site) {
		let json = null;
		let raw = '';

		if (!link.startsWith('http') && !link.startsWith('data:')) {
			link = new URL(link, site).href;
		}

		if (/\.(json|webmanifest)/.test(link)){
			try {
				const response = await fetch(link);
				json = await response.json();
				raw = JSON.stringify(json);

				return {
					link,
					json,
					raw
				}
			} catch (err) {
				error = err;
			}
		}
		else {
			try {
				const browser = await puppeteer.launch({headless: 'new'});
				const page = await browser.newPage();
				await page.goto(link, {timeout: 5000, waitUntil: 'domcontentloaded'});

				raw = await page.evaluate(() =>  {
						return document.querySelector('body')?.innerText; 
				}) || await page.content();

				try {
					json = JSON.parse(raw);
				} catch (err) {
					throw err;
				}
				
				browser.close();

				return {
					link,
					json,
					raw
				}
			}
			catch (err) {
				error = err;
			}
		}
	}
	return {
		error
	}
}