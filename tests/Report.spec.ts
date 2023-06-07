import { test, expect } from '@playwright/test';
import { Report } from '../Report/type';
import fs from 'fs';
import { UrlIsAvailable, AZURE_FUNC_TIMEOUT } from './helpers.js';

let file = fs.readFileSync('./tests/test_urls.json', 'utf8');
const array = JSON.parse(file);
array.forEach(async (url: string, index: number) => {

  await test(`${index}:api/Report: SW, manifest, isOnHttps, isInstallable`, async ({ request, baseURL }) => {
    test.info().annotations.push({type: 'url', description: url });
    
    if (await !UrlIsAvailable(request, url)) {
      test.info().annotations.push({type: 'reason', description: 'url unreachable' });
      test.skip();
        return;
    }

    let result: { data: Report } | undefined, apiCall;
    try {
      apiCall = await request.get(`${baseURL}/api/Report?site=${url}&desktop=true`, { timeout: AZURE_FUNC_TIMEOUT });
      result = await apiCall.json();
    } catch (error) {
      if (/Request timed out after/.test(error?.message)) {
        test.info().annotations.push({type: 'reason', description: 'api timeout' });
        test.skip();
        return;
      }
    }
    
    expect(apiCall?.ok, 'status ok').toBeTruthy();

    expect(result?.data?.audits, 'audits exists').toBeTruthy();
    expect(result?.data?.audits?.isOnHttps?.score, 'isOnHttps').toBeTruthy();

    expect(result?.data?.artifacts?.webAppManifest?.url, 'manifest url').toBeTruthy();
    expect(result?.data?.artifacts?.webAppManifest?.json, 'manifest json').toBeTruthy();
    expect(result?.data?.audits?.installableManifest?.score, 'isInstallable').toBeTruthy();

    expect(result?.data?.artifacts?.serviceWorker?.url, 'SW url').toBeTruthy();
    expect(result?.data?.audits?.serviceWorker?.details.features, 'SW features').toBeTruthy();
  });
});