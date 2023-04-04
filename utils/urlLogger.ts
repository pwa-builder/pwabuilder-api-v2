import fetch from 'node-fetch';

export function logOfflineResult(url: string, offlineDetected: boolean): Promise<any> {
    const args = {
        url: url,
        serviceWorkerOfflineScore: offlineDetected ? 2 : 0
    };
    return postToUrlAnalytics(args);
}

export function logHttpsResult(url: string, success: boolean, score: number | null, error: string | null, startTime: Date): Promise<any> {
    const detectionTimeInMs = new Date().getTime() - startTime.getTime();
    const args = {
        url: url,
        httpsDetected: success,
        httpsScore: score,
        httpsDetectionError: error,
        httpsDetectionTimeInMs: detectionTimeInMs
    };
    return postToUrlAnalytics(args);
}

function postToUrlAnalytics(args: unknown): Promise<any> {
    // This environment variable is a secret, and set only in deployed environments
    const logApiUrl = process.env.ANALYSIS_LOG_URL;
    if (!logApiUrl) {
        return Promise.resolve();
    }

    return fetch(logApiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify(args)
    }).catch(err => console.error("Unable to POST to log analysis URL due to error", err, args));
}