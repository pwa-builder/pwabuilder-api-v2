/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import BaseGatherer from 'lighthouse/core/gather/base-gatherer.js';
import * as serviceWorkers from './custom-service-worker-driver.js';

class CustomServiceWorkerGatherer extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Artifacts['CustomServiceWorkerGatherer']>}
   */
  async getArtifact(context) {
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
