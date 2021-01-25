import fetch from "node-fetch";

export function logUrlResult(url: string, success: boolean, error: string | null, startTime: Date): Promise<any> {
    // This environment variable is a secret, and set only in deployed environments
    const logApiUrl = process.env.ANALYSIS_LOG_URL;
    if (!logApiUrl) {
        return Promise.resolve();
    }

    const detectionTimeInMs = new Date().getTime() - startTime.getTime();
    return fetch(logApiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify({
            url: url,
            httpsDetected: success,
            httpsDetectionError: error,
            httpsDetectionTimeInMs: detectionTimeInMs
        })
    }).catch(err => console.error("Unable to POST to log analysis URL due to error", err));
}