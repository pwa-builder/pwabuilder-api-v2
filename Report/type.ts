export type Report = {
  audits: {
    isOnHttps: {
      score: boolean;
    };
    installableManifest: {
      score: boolean;
      details: {
        url?: string;
      };
    };
    serviceWorker: {
      score: boolean;
      details: {
        url?: string;
        scope?: string;
        features?: {
          [key: string]: any;
          raw?: undefined;
        } | undefined;
      };
    };
    offlineSupport: {
      score: boolean;
    };
    // maskableIcon: {
    //   score: boolean;
    // };
    // splashScreen: {
    //   score: boolean;
    // };
    // themedOmnibox: {
    //   score: boolean;
    // };
    // viewport: {
    //   score: boolean;
    // };
  };
  artifacts: {
    webAppManifest?: {
      raw?: string,
      url?: string,
      json?: unknown
    };
    serviceWorker?: {
      raw?: string[],
      url?: string,
    };
  };
};