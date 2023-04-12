import puppeteer from 'puppeteer';
import fetch from 'node-fetch';
import stripJsonComments from 'strip-json-comments';
import { userAgents } from 'lighthouse/core/config/constants.js';

const USER_AGENT = `${userAgents.desktop} PWABuilderHttpAgent curl/8.0.1`;

export async function getManifestByLink(link: string, site: string): Promise<{link?: string, json?: unknown, raw?: string, error?: unknown}> {
	let error: unknown = 'no manifest or site link provided';

	if (link && site) {
		let json: unknown | null = null;
		let raw = '';

		if (!link.startsWith('http') && !link.startsWith('data:')) {
			link = new URL(link, site).href;
		}

		// if (/\.(json|webmanifest)/.test(link) || link.startsWith('data:')){
			try {
				const response = await fetch(link, { redirect: 'follow', follow: 2,  headers: { 'User-Agent': USER_AGENT, /*'Accept': 'application/json'*/ } });
				raw = await response.text();
				json = JSON.parse(clean(raw));

				return {
					link,
					json,
					raw
				}
			} catch (err) {
				return await puppeteerAttempt(link);
			}
	}
	return {
		error
	}
}

async function puppeteerAttempt(link: string): Promise<{link?: string, json?: unknown, raw?: string, error?: unknown}> {
	let error: unknown = 'no manifest link provided';

	if (link) {
		let json: unknown | null = null;
		let raw = '';

		try {
			const browser = await puppeteer.launch({headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox']});
			const page = await browser.newPage();
			await page.setUserAgent(USER_AGENT);

			try{
				await page.goto(link, {timeout: 5000, waitUntil: 'domcontentloaded'});

				raw = await page.evaluate(() =>  document.querySelector('body')?.innerText)
					|| await page.evaluate(() =>  document.documentElement.outerHTML);
			} catch (err) {
				throw err;
			}	finally {
				await browser.close(); 
			}

			try {
				json = JSON.parse(clean(raw));
			} catch (err) {
				throw err;
			}
			
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
	return {
		error
	}
}

function clean(raw: string) {
	// raw = raw.replace(/\r|\n/g, '').replace(/\/\*.+\*\//g, '')
	return stripJsonComments(raw);
}