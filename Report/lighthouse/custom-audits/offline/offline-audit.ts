import {Audit} from 'lighthouse';
import { FetchResponse } from 'lighthouse/core/gather/fetcher.js';
import * as LH from 'lighthouse/types/lh.js';

class OfflineAudit extends Audit {
  static get meta(): LH.Audit.Meta {
    return {
      id: 'offline-audit',
      title: 'Offline Support Audit',
      failureTitle: 'First text input field doesn\'t accept `123` as input',
      description: 'Simple offline support audit',

      // The name of the custom gatherer class that provides input to this audit.
			// @ts-ignore
      requiredArtifacts: ['OfflineGatherer', 'ServiceWorkerGatherer', 'WebAppManifest'],
    };
  }

  static audit(artifacts) {
    const response = artifacts.OfflineGatherer as FetchResponse;
    const success = response.status == 200;

    return {
      // Cast true/false to 1/0
      score: Number(success),
    };
  }
}

export default OfflineAudit;