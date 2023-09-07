import BaseGatherer from 'lighthouse/core/gather/base-gatherer.js';
import * as serviceWorkers from './custom-service-worker-driver.js';
import * as LH from 'lighthouse/types/lh.js';


export interface ICustomServiceWorkerGatherer {
  versions: any[];
  registrations: any[];
}

class CustomServiceWorkerGatherer extends BaseGatherer {
  meta: LH.Gatherer.GathererMeta = {
    supportedModes: ['navigation'],
  }

  async getArtifact(context: LH.Gatherer.Context): Promise<ICustomServiceWorkerGatherer> {
    const session = context.driver.defaultSession;
    const {versions} = await serviceWorkers.getServiceWorkerVersions(session);
    const {registrations} = await serviceWorkers.getServiceWorkerRegistrations(session);

    return {
      versions,
      registrations,
    };
  }
}

export default CustomServiceWorkerGatherer;
