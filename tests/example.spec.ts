import { test, expect } from '@playwright/test';
import { Report } from '../Report/type';

test("api/Report have: SW, manifest, isOnHttps, isInstallable", async ({ request, baseURL }) => {
  const reportCall = await request.get(`${baseURL}/api/Report?site=https://webboard.app`);
  let reportResult: { data: Report } = await reportCall.json();

  expect(reportCall.status()).toBe(200);

  expect(reportResult.data.artifacts.webAppManifest.url).toBeTruthy();
  expect(reportResult.data.artifacts.serviceWorker.url).toBeTruthy();
  expect(reportResult.data.audits.installableManifest.score).toBeTruthy();
  expect(reportResult.data.audits.isOnHttps.score).toBeTruthy();
});