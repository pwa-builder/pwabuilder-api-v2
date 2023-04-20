import { test, expect } from '@playwright/test';
import { Report } from '../Report/type';
import fs from 'fs';

const AZURE_FUNC_TIMEOUT = 3 * 60 * 1000;

// let file = fs.readFileSync('./tests/results_new.json', 'utf8');
// const input: any[] = JSON.parse(file);
// const output: string[] = [];

// input.forEach((test: any[], index: number) => {
//   if (test[1] == 'findmani' && (test[3] == 'manifest-false' || test[5] == 'json-false'))
//     output.push(test[2]);
// });

// output.forEach(async (url: string, index: number) => {
//     test(`${index}:api/FindWebManifest: url, raw, json`, async ({ request, baseURL }) => {
//     const apiCall = await request.get(`${baseURL}/api/FindWebManifest?site=${url}`, { timeout: AZURE_FUNC_TIMEOUT });
//     let result;

//     try {
//       result = await apiCall.json();
//     } catch (error) {}
    

//     await fs.appendFile('./tests/results_mani.txt',
//     `${index}:findmani:${url}:manifest-${result.content?.url?'true':'false'}:raw-${result.content?.raw?'true':'false'}:json-${result.content?.json?'true':'false'},`, (err) => {});

//     expect(apiCall.ok, 'status ok').toBeTruthy();
//     expect(result?.content?.url, 'url').toBeTruthy();
//     expect(result?.content?.raw, 'raw').toBeTruthy();
//     expect(result?.content?.json, 'json').toBeTruthy();
//   });
// });



// await fs.writeFileSync('./tests/results_array.json', JSON.stringify(output));

// let file = fs.readFileSync('./tests/results.txt', 'utf8');
// const input = JSON.parse(file);
// const output = {};
// input.forEach(async (test: string, index: number) => {
//   const testArr = test.split(':');
//   const testIndex = parseInt(testArr[0]);
//   const testType = testArr[2] == 'findmani'? testArr[2] : testArr[1];
//   const testParams: {name, value}[] = [];
//   for (let i = testType == 'findmani'? 3 : 2; i < testArr.length; i++) {
//     let param = testArr[i].split('-');
//     testParams.push({
//       name: param[0],
//       value: param[1] == 'true'? true : false
//     });
//   }
//   if (!output[testIndex]){
//     output[testIndex] = {index: testIndex, url: '', results: []};
//   }

//   output[testIndex].results.push({
//     type: testType,
//     params: testParams
//   });
//   if (testType == 'findmani')
//     output[testIndex].url = testArr[1];
//   output[testIndex].index = testIndex;
  
// });
// await fs.writeFileSync('./tests/results.json', JSON.stringify(output));

let file = fs.readFileSync('./tests/urls_for_test.json', 'utf8');
const array = JSON.parse(file);
array.forEach(async (url: string, index: number) => {

  // if (index > 1999)
  //   return;
  
  // test(`${index}:api/FindWebManifest: url, raw, json`, async ({ request, baseURL }) => {
  //   try {
  //     const checkURL = await request.get(`${url}`, { timeout: 15000 });
  //     if (!checkURL.ok && checkURL.status() != 302) {
  //       test.skip();
  //       return;
  //     }
  //   } catch (error) {
  //     test.skip();
  //     return;
  //   }

  //   const apiCall = await request.get(`${baseURL}/api/FindWebManifest?site=${url}`, { timeout: AZURE_FUNC_TIMEOUT });
  //   let result;

  //   try {
  //     result = await apiCall.json();
  //   } catch (error) {}

  //   await fs.appendFile('./tests/results_mani.txt',
  //   `${index}:findmani:${url}:manifest-${result?.content?.url?'true':'false'}:raw-${result?.content?.raw?'true':'false'}:json-${result?.content?.json?'true':'false'},`, (err) => {});

  //   expect(apiCall.ok, 'status ok').toBeTruthy();
  //   expect(result?.content?.url, 'url').toBeTruthy();
  //   expect(result?.content?.raw, 'raw').toBeTruthy();
  //   expect(result?.content?.json, 'json').toBeTruthy();
  // });

  // test(`${index}:api/FindServiceWorker: url, raw, json`, async ({ request, baseURL }) => {
  //   const apiCall = await request.get(`${baseURL}/api/FindServiceWorker?site=${url}`, { timeout: AZURE_FUNC_TIMEOUT });
  //   let result;

  //   try {
  //     result = await apiCall.json();
  //   } catch (error) {}
    

  //   await fs.appendFile('./tests/results_new.txt',
  //   `${index}:findsw:${url}:url-${result.content?.url?'true':'false'}:raw-${result.content?.raw?'true':'false'},`, (err) => {});

  //   expect(apiCall.ok, 'status ok').toBeTruthy();
  //   expect(result?.content?.url, 'url').toBeTruthy();
  //   expect(result?.content?.raw, 'raw').toBeTruthy();
  // });

  // test(`${index}:api/FetchWebManifest: url, raw, json`, async ({ request, baseURL }) => {
  //   try {
  //     const checkURL = await request.get(`${url}`, { timeout: 15000 });
  //     if (!checkURL.ok && checkURL.status() != 302) {
  //       test.skip();
  //       return;
  //     }
  //   } catch (error) {
  //     test.skip();
  //     return;
  //   }

  //   const apiCall = await request.get(`${baseURL}/api/FetchWebManifest?site=${url}`, { timeout: AZURE_FUNC_TIMEOUT });
  //   let result = await apiCall.json();

  //   await fs.appendFile('./tests/results_mani.txt',
  //   `${index}:old_fetchmani:manifest-${result.content?.url?'true':'false'}:json-${result.content?.json?'true':'false'},`, (err) => {});

  //   expect(apiCall.ok, 'status ok').toBeTruthy();
  //   expect(result?.content?.url, 'url').toBeTruthy();
  //   expect(result?.content?.json, 'json').toBeTruthy();
  //   // expect(apiCall.status(), 'status 200').toBe(200);
  
  //   // expect(result.content?.url, 'url').toBeTruthy();
  //   // expect(result.content?.json, 'json').toBeTruthy();
  // });

  // test(`${index}:api/Security: isHTTPS`, async ({ request, baseURL }) => {
  //   const apiCall = await request.get(`${baseURL}/api/Security?site=${url}`, { timeout: AZURE_FUNC_TIMEOUT });
  //   let result = await apiCall.json();

  //   await fs.appendFile('./tests/results.txt',
  //   `${index}:old_security:isHTTPS-${result.data?.isHTTPS?'true':'false'},`, (err) => {});

  //   expect(apiCall.status(), 'status 200').not.toBe(500);
  
  //   // expect(apiCall.status(), 'status 200').toBe(200);
  
  //   // expect(result.data?.isHTTPS, 'isHTTPS').toBeTruthy();
  //   // expect(result.data?.valid, 'valid').toBeTruthy();
  //   // expect(result.data?.validProtocol, 'validProtocol').toBeTruthy();
  // });

  // test(`${index}:api/runAllChecks: SW`, async ({ request, baseURL }) => {
  //   const apiCall = await request.get(`https://localhost:44328/serviceWorker/runAllChecks?url=${url}`, { timeout: AZURE_FUNC_TIMEOUT });
  //   let result = await apiCall.json();

  //   await fs.appendFile('./tests/results.txt',
  //   `${index}:old_all_checks:SW-${result.hasSW?'true':'false'},`, (err) => {});

  //   expect(apiCall.status(), 'status 200').not.toBe(500);
  
  //   // expect(apiCall.status(), 'status 200').toBe(200);
  
  //   // expect(result.hasSW, 'hasSW').toBeTruthy();
  // });

  await test(`${index}:api/Report: SW, manifest, isOnHttps, isInstallable`, async ({ request, baseURL }) => {
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

    const apiCall = await request.get(`${baseURL}/api/Report?site=${url}&desktop=true`, { timeout: AZURE_FUNC_TIMEOUT });
    let reportResult: { data: Report } = await apiCall.json();

    // await fs.appendFile('./tests/results_new.txt',
    // `${index}:report:manifest-${reportResult?.data?.artifacts?.webAppManifest?.url?'true':'false'}:SW-${reportResult?.data?.artifacts?.serviceWorker?.url?'true':'false'}:security-${reportResult?.data?.audits?.isOnHttps?.score?'true':'false'}:installable-${reportResult?.data?.audits?.installableManifest?.score?'true':'false'},`, (err) => {});
    
    expect(apiCall.ok, 'status ok').toBeTruthy();
    
    // expect(apiCall.status(), 'status 200').toBe(200);
  
    expect(reportResult?.data?.artifacts?.webAppManifest?.url, 'manifest-url').toBeTruthy();
    expect(reportResult?.data?.artifacts?.webAppManifest?.json, 'manifest-json').toBeTruthy();
    // expect(reportResult?.data?.artifacts?.serviceWorker?.url, 'SW').toBeTruthy();
    // expect(reportResult?.data?.audits?.isOnHttps?.score, 'isOnHttps').toBeTruthy();
    // expect(reportResult?.data?.audits?.installableManifest?.score, 'isInstallable').toBeTruthy();
  });
});