import {Gatherer} from 'lighthouse';
import * as LH from 'lighthouse/types/lh.js';

class CustomGatherer extends Gatherer {
  meta: LH.Gatherer.GathererMeta = {
    supportedModes: ['navigation', 'timespan', 'snapshot'],
  };
// @ts-ignore
  async getArtifact(context: LH.Gatherer.Context) {
    const {driver, page} = context;
    const {executionContext} = driver;

    await page.setBypassServiceWorker(false);
		await page.setOfflineMode(true);
    // await driver.defaultSession.sendCommand('Network.enable')
    // await driver.defaultSession.sendCommand('Network.setCacheDisabled', { cacheDisabled: true })
    // await driver.defaultSession.sendCommand('Network.emulateNetworkConditions', {
    //   offline: true,
    //   latency: 0,
    //   downloadThroughput: 0,
    //   uploadThroughput: 0,
    //  });

		const fetchPromise = new Promise(resolve => {
			driver.defaultSession.on('Network.responseReceived', onResponseReceived);
			async function onResponseReceived(responseEvent: LH.Crdp.Network.ResponseReceivedEvent) {
				const {response} = responseEvent;

				driver.defaultSession.off('Network.responseReceived', onResponseReceived);
        await page.setOfflineMode(false);
        // await driver.defaultSession.sendCommand('Network.disable')

				if (!response.fromServiceWorker) {
					return resolve({
						status: -1,
						explanation: 'The start_url did respond, but not via a service worker.',
					});
				}
				return resolve(response);
			}
		});

    const timeoutPromise = new Promise(resolve =>
      setTimeout(
        () => resolve({
          status: -1,
          explanation: `Timed out waiting for start_url (${context.baseArtifacts.URL.finalDisplayedUrl}) to respond.`,
        }),
        500
      )
    );

		return driver.executionContext
      .evaluateAsync(`window.location.reload()`)
      .then(() => Promise.race([fetchPromise, timeoutPromise]));
			
		// await page.waitForNavigation();

		// const result = await driver.executionContext.evaluateAsync(`fetch\(\"https://facebook.com\"\);`)

		// return result;
		// const response = await driver.fetcher.fetchResource(context.baseArtifacts.URL.finalDisplayedUrl, { timeout: 300 });
		// await page.waitForTimeout(30000);

		// await page.setOfflineMode(false);
		
		// return {
		// 	...response
		// }

    // // Inject an input field for our debugging pleasure.
    // function makeInput() {
    //   const el = document.createElement('input');
    //   el.type = 'number';
    //   document.body.append(el);
    // }
    // await executionContext.evaluate(makeInput, {args: []});
    // await new Promise(resolve => setTimeout(resolve, 100));

    // // Prove that `driver` (Lighthouse) and `page` (Puppeteer) are talking to the same page.
    // await executionContext.evaluateAsync(`document.querySelector('input').value = '1'`);
    // await page.type('input', '23', {delay: 300});
    // const value = await executionContext.evaluateAsync(`document.querySelector('input').value`);
    // if (value !== '123') throw new Error('huh?');

    // return {value};
  }
}

export default CustomGatherer;