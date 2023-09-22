import * as LH from 'lighthouse/types/lh.js';

interface CustomArtifacts extends LH.Artifacts {
	StartUrl: any,
	CustomServiceWorkerGatherer: any,
	Offline: any
}

export default CustomArtifacts;