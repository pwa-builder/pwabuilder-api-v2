import BaseGatherer from 'lighthouse/core/gather/base-gatherer.js';
import * as serviceWorkers from './service-worker-driver.js';
import * as LH from 'lighthouse/types/lh.js';


export interface IServiceWorkerGatherer {
  versions: any[];
  registrations: any[];
}

class ServiceWorkerGatherer extends BaseGatherer {
  meta: LH.Gatherer.GathererMeta = {
    supportedModes: ['navigation'],
  }

  async getArtifact(context: LH.Gatherer.Context): Promise<IServiceWorkerGatherer> {
    const session = context.driver.defaultSession;
    const {versions} = await serviceWorkers.getServiceWorkerVersions(session);
    const {registrations} = await serviceWorkers.getServiceWorkerRegistrations(session);

    return {
      versions,
      registrations,
    };
  }
}

export default ServiceWorkerGatherer;
