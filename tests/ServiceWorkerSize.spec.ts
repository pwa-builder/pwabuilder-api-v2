import { test, expect } from '@playwright/test';
import { Report } from '../Report/type';
import fs from 'fs';
import { UrlIsAvailable, AZURE_FUNC_TIMEOUT } from './helpers.js';

let file = fs.readFileSync('./tests/test_results.json', 'utf8');
let array = JSON.parse(file);

array = array.filter((_test) => _test.tests[0].results[0].status == 'failed');
array = array.map((_test) => {return { url: _test.tests[0].annotations[0].description }});

array.forEach(async (app: {url: string}, index: number) => {
 const url = app.url;
  
  await test(`${index}:api/Report: SW size`, async ({ request, baseURL }) => {
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
    expect(result?.data?.artifacts?.serviceWorker?.raw?.length, 'SW raw').toBeTruthy();
    expect(Number(result?.data?.audits?.serviceWorker?.details?.features?.sizeKb), 'size more 0.2 kb').toBeGreaterThanOrEqual(0.2);
    expect(result?.data?.audits?.serviceWorker?.details?.features?.detectedEmpty, 'empty fetch').toEqual(false);
  });
});