import {Audit} from 'lighthouse';
import { FetchResponse } from 'lighthouse/core/gather/fetcher.js';
import * as LH from 'lighthouse/types/lh.js';

class CustomAudit extends Audit {
  static get meta(): LH.Audit.Meta {
    return {
      id: 'custom-audit',
      title: 'First text input field accepts `123` as input',
      failureTitle: 'First text input field doesn\'t accept `123` as input',
      description: 'Example custom audit which relies on a fancy gatherer.',

      // The name of the custom gatherer class that provides input to this audit.
			// @ts-ignore
      requiredArtifacts: ['CustomGatherer', 'CustomServiceWorkerGatherer', 'WebAppManifest'],
    };
  }

  static audit(artifacts) {
    const response = artifacts.CustomGatherer as FetchResponse;
    const success = response.status == 200;

    return {
      // Cast true/false to 1/0
      score: Number(success),
    };
  }
}

export default CustomAudit;