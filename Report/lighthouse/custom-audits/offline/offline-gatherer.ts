import {Gatherer} from 'lighthouse';
import * as LH from 'lighthouse/types/lh.js';

class OfflineGatherer extends Gatherer {
  meta: LH.Gatherer.GathererMeta = {
    supportedModes: ['navigation'/*, 'timespan', 'snapshot'*/],
  };
// @ts-ignore
  async getArtifact(context: LH.Gatherer.Context) {
    const {driver, page} = context;
    // const {executionContext} = driver;

    try {
      await page.setBypassServiceWorker(false);
      await page.setOfflineMode(true);
    } catch (error) {}
    //   console.log(error);
    // }
    // await driver.defaultSession.sendCommand('Network.enable')
    // await driver.defaultSession.sendCommand('Network.setCacheDisabled', { cacheDisabled: true })
    // await driver.defaultSession.sendCommand('Network.emulateNetworkConditions', {
    //   offline: true,
    //   latency: 0,
    //   downloadThroughput: 0,
    //   uploadThroughput: 0,
    //  });

		// const fetchPromise = new Promise(resolve => {
		// 	driver.defaultSession.on('Network.responseReceived', onResponseReceived);
		// 	async function onResponseReceived(responseEvent: LH.Crdp.Network.ResponseReceivedEvent) {
		// 		const {response} = responseEvent;

		// 		driver.defaultSession.off('Network.responseReceived', onResponseReceived);
    //     // try {
    //       await page.setOfflineMode(false);
    //     // } catch (error) {
    //     //   console.log(error);
    //     // }
        
    //     // await driver.defaultSession.sendCommand('Network.disable')

		// 		if (!response.fromServiceWorker) {
		// 			return resolve({
		// 				status: -1,
		// 				explanation: 'The start_url did respond, but not via a service worker.',
		// 			});
		// 		}
		// 		return resolve(response);
		// 	}
		// });

    // const timeoutPromise = new Promise(resolve =>
    //   setTimeout(
    //     () => resolve({
    //       status: -1,
    //       explanation: `Timed out waiting for start_url (${context.baseArtifacts.URL.finalDisplayedUrl}) to respond.`,
    //     }),
    //     500
    //   )
    // );

    const response = await page.goto(page.url(), { timeout: 500, waitUntil: 'domcontentloaded'}).then((response) => {
      return response;
    }).catch((error) => {
      return error;
    });
    try {
      await page.setOfflineMode(false);
    } catch (error) {}

    if (response == null) {
      return {
        status: 200
      }
    }
    if (response?.status && response?.statusText) {
      return {
        status: response?.status(),
        explanation: response?.statusText(),
      }
    }
  
    return {
      status: -1,
      explanation: 'Timed out waiting for start_url to respond.',
    }
  }
}

export default OfflineGatherer;