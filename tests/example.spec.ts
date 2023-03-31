import { test, expect } from '@playwright/test';
import { Report } from '../Report/type';
import fs from 'fs';

const AZURE_FUNC_TIMEOUT = 3 * 60 * 1000;

let file = fs.readFileSync('./tests/urls_for_test.json', 'utf8');
const array = JSON.parse(file);
array.forEach(async (url: string, index: number) => {
  // let index = 0;
  // let url = ' https://webboard.app';

  test(`${index}:api/FindWebManifest: url, raw, json`, async ({ request, baseURL }) => {
    const apiCall = await request.get(`${baseURL}/api/FindWebManifest?site=${url}`, { timeout: AZURE_FUNC_TIMEOUT });
    let result = await apiCall.json();

    await fs.appendFile('./tests/results.txt',
    `${index}:findmani:manifest-${result.content?.url?'true':'false'}:raw-${result.content?.raw?'true':'false'}:json-${result.content?.json?'true':'false'},`, (err) => {});
  
    expect(apiCall.status(), 'status 200').toBe(200);
  
    expect(result.content?.url, 'url').toBeTruthy();
    expect(result.content?.raw, 'raw').toBeTruthy();
    expect(result.content?.json, 'json').toBeTruthy();
  });

  test(`${index}:api/FetchWebManifest: url, raw, json`, async ({ request, baseURL }) => {
    const apiCall = await request.get(`${baseURL}/api/FetchWebManifest?site=${url}`, { timeout: AZURE_FUNC_TIMEOUT });
    let result = await apiCall.json();

    await fs.appendFile('./tests/results.txt',
    `${index}:old_fetchmani:manifest-${result.content?.url?'true':'false'}:json-${result.content?.json?'true':'false'},`, (err) => {});
  
    expect(apiCall.status(), 'status 200').toBe(200);
  
    expect(result.content?.url, 'url').toBeTruthy();
    expect(result.content?.json, 'json').toBeTruthy();
  });

  test(`${index}:api/Security: isHTTPS`, async ({ request, baseURL }) => {
    const apiCall = await request.get(`${baseURL}/api/Security?site=${url}`, { timeout: AZURE_FUNC_TIMEOUT });
    let result = await apiCall.json();

    await fs.appendFile('./tests/results.txt',
    `${index}:old_security:isHTTPS-${result.data?.isHTTPS?'true':'false'},`, (err) => {});
  
    expect(apiCall.status(), 'status 200').toBe(200);
  
    expect(result.data?.isHTTPS, 'isHTTPS').toBeTruthy();
    expect(result.data?.valid, 'valid').toBeTruthy();
    expect(result.data?.validProtocol, 'validProtocol').toBeTruthy();
  });

  test(`${index}:api/runAllChecks: SW`, async ({ request, baseURL }) => {
    const apiCall = await request.get(`https://localhost:44328/serviceWorker/runAllChecks?url=${url}`, { timeout: AZURE_FUNC_TIMEOUT });
    let result = await apiCall.json();

    await fs.appendFile('./tests/results.txt',
    `${index}:old_all_checks:SW-${result.hasSW?'true':'false'},`, (err) => {});
  
    expect(apiCall.status(), 'status 200').toBe(200);
  
    expect(result.hasSW, 'hasSW').toBeTruthy();
  });

  await test(`${index}:api/Report: SW, manifest, isOnHttps, isInstallable`, async ({ request, baseURL }) => {
    const apiCall = await request.get(`${baseURL}/api/Report?site=${url}`, { timeout: AZURE_FUNC_TIMEOUT });
    let reportResult: { data: Report } = await apiCall.json();

    await fs.appendFile('./tests/results.txt',
    `${index}:report:manifest-${reportResult.data?.artifacts?.webAppManifest?.url?'true':'false'}:SW-${reportResult.data?.artifacts?.serviceWorker?.url?'true':'false'}:security-${reportResult.data?.audits?.isOnHttps?.score?'true':'false'}:installable-${reportResult.data?.audits?.installableManifest?.score?'true':'false'},`, (err) => {});
  
    expect(apiCall.status(), 'status 200').toBe(200);
  
    expect(reportResult.data?.artifacts?.webAppManifest?.url, 'manifest').toBeTruthy();
    expect(reportResult.data?.artifacts?.serviceWorker?.url, 'SW').toBeTruthy();
    expect(reportResult.data?.audits?.isOnHttps?.score, 'isOnHttps').toBeTruthy();
    expect(reportResult.data?.audits?.installableManifest?.score, 'isInstallable').toBeTruthy();
  });
});