import { test, expect } from '@playwright/test';
import fs from 'fs';
import { UrlIsAvailable, AZURE_FUNC_TIMEOUT } from './helpers.js';

let file = fs.readFileSync('./tests/test_urls.json', 'utf8');
const array = JSON.parse(file);
array.forEach(async (url: string, index: number) => {

  test(`${index}:api/FindWebManifest: url, raw, json`, async ({ request, baseURL }) => {
    test.info().annotations.push({type: 'url', description: url });
    
    if (await !UrlIsAvailable(request, url)) {
      test.info().annotations.push({type: 'reason', description: 'url unreachable' });
      test.skip();
      return;
    }

    let result, apiCall;
    try {
      apiCall = await request.get(`${baseURL}/api/FindWebManifest?site=${url}`, { timeout: AZURE_FUNC_TIMEOUT });
      result = await apiCall.json();
    } catch (error) {
      if (/Request timed out after/.test(error?.message)) {
        test.info().annotations.push({type: 'reason', description: 'api timeout' });
        test.skip();
        return;
      }
    }

    expect(apiCall?.ok, 'status ok').toBeTruthy();
    expect(result?.content?.url, 'url').toBeTruthy();
    expect(result?.content?.raw, 'raw').toBeTruthy();
    expect(result?.content?.json, 'json').toBeTruthy();
  });

});