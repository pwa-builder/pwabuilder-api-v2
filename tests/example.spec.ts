import { test, expect } from '@playwright/test';
import { Report } from '../Report/type';

test("api/Report: SW, manifest, isOnHttps, isInstallable", async ({ request, baseURL }) => {
  const apiCall = await request.get(`${baseURL}/api/Report?site=https://webboard.app`);
  let reportResult: { data: Report } = await apiCall.json();

  expect(apiCall.status(), 'status 200').toBe(200);

  expect(reportResult.data.artifacts.webAppManifest.url, 'manifest').toBeTruthy();
  expect(reportResult.data.artifacts.serviceWorker.url, 'SW').toBeTruthy();
  expect(reportResult.data.audits.isOnHttps.score, 'isOnHttps').toBeTruthy();
  expect(reportResult.data.audits.installableManifest.score, 'isInstallable').toBeTruthy();
  
  // test.info().annotations.push({ type: 'skip', description: 'https://github.com/microsoft/playwright/issues/<some-issue>' });
});

test("api/FindWebManifest: url, raw, json", async ({ request, baseURL }) => {
  const apiCall = await request.get(`${baseURL}/api/FindWebManifest?site=https://webboard.app`);
  let result = await apiCall.json();

  expect(apiCall.status(), 'status 200').toBe(200);

  expect(result.content.url, 'url').toBeTruthy();
  expect(result.content.raw, 'raw').toBeTruthy();
  expect(result.content.json, 'json').toBeTruthy();
});