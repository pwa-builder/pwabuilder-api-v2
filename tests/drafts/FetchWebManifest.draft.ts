import { test, expect } from '@playwright/test';
import fs from 'fs';

const AZURE_FUNC_TIMEOUT = 3 * 60 * 1000;

let file = fs.readFileSync('./tests/test_urls.json', 'utf8');
const array = JSON.parse(file);

array.forEach(async (url: string, index: number) => {

  test(`${index}:api/FetchWebManifest: url, raw, json`, async ({ request, baseURL }) => {
    try {
      const checkURL = await request.get(`${url}`, { timeout: 15000 });
      if (!checkURL.ok && checkURL.status() != 302) {
        test.skip();
        return;
      }
    } catch (error) {
      test.skip();
      return;
    }

    const apiCall = await request.get(`${baseURL}/api/FetchWebManifest?site=${url}`, { timeout: AZURE_FUNC_TIMEOUT });
    let result = await apiCall.json();

    expect(apiCall.ok, 'status ok').toBeTruthy();
    expect(result?.content?.url, 'url').toBeTruthy();
    expect(result?.content?.json, 'json').toBeTruthy();
  });

});