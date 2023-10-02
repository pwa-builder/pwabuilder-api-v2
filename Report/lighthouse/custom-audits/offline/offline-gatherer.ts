import {Gatherer} from 'lighthouse';
import * as LH from 'lighthouse/types/lh.js';
import { HTTPResponse } from 'puppeteer';

class OfflineGatherer extends Gatherer {
  meta: LH.Gatherer.GathererMeta = {
    supportedModes: ['navigation'/*, 'timespan', 'snapshot'*/],
  };
// @ts-ignore
  async getArtifact(context: LH.Gatherer.Context) {
    const {driver, page} = context;

    let response: HTTPResponse | null = null;
    try {
      const offlinePage = await page.browser().newPage();
      await offlinePage.setOfflineMode(true);
      response = await offlinePage.goto(page.url(), { timeout: 1000, waitUntil: 'domcontentloaded'}).then((response) => {
        return response;
      }).catch((error) => {
        return error;
      });
    } catch (error) {}

    if (response?.status && response?.statusText) {
      return {
        status: response?.status(),
        fromServiceWorker: response?.fromServiceWorker(),
        explanation: response?.statusText(),
      }
    }
  
    return {
      status: -1,
      fromServiceWorker: false,
      explanation: 'Timed out waiting for start_url to respond.',
    }
  }
}

export default OfflineGatherer;