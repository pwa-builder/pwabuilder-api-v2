
import {
  setup,
  defaultClient,
  DistributedTracingModes,
} from 'applicationinsights';

enum AppInsightsStatus {
  ENABLED = 1,
  DISABLED = 0,
  DEFAULT = -1,
}

var appInsightsStatus: AppInsightsStatus = AppInsightsStatus.DEFAULT;
export function setupAnalytics() {
  try {
    setup(
      ''
    )
      .setDistributedTracingMode(DistributedTracingModes.AI_AND_W3C)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(false)
      .setAutoCollectPerformance(false, false)
      .setAutoCollectExceptions(false)
      .setAutoCollectDependencies(false)
      .setAutoCollectConsole(false)
      .setUseDiskRetryCaching(false)
      .setSendLiveMetrics(false)
      .start();
    appInsightsStatus = AppInsightsStatus.ENABLED;
    console.log('App insights enabled successfully');
  } catch (e) {
    appInsightsStatus = AppInsightsStatus.DISABLED;
    console.warn("App insights couldn't be enabled", e);
  }
}

export function trackEvent(
  analyticsInfo: AnalyticsInfo,
  error: string | null,
  success: boolean
) {
  if (appInsightsStatus == AppInsightsStatus.DEFAULT) {
    setupAnalytics();
  }
  if (
    defaultClient == null ||
    defaultClient == undefined ||
    appInsightsStatus == AppInsightsStatus.DISABLED
  ) {
    return;
  }

  var properties: any = {
    url: analyticsInfo.url,
    platformId: analyticsInfo.platformId,
    platformIdVersion: analyticsInfo.platformIdVersion,
  };

  try {
    if (
      analyticsInfo.correlationId != null &&
      analyticsInfo.correlationId != undefined &&
      typeof analyticsInfo.correlationId == 'string'
    ) {
      defaultClient.context.tags[defaultClient.context.keys.operationId] =
        analyticsInfo.correlationId;
    }
    if (success) {
      defaultClient.trackEvent({
        name: 'ReportCardEvent',
        properties: properties,
      });
    } else {
      properties.error = error;
      defaultClient.trackEvent({
        name: 'ReportCardFailureEvent',
        properties: properties,
      });
    }
  } catch (e) {
    console.error(e);
  }
}

export class AnalyticsInfo  {
  url: string | null = null;
  
  platformId: string | null = null;
  platformIdVersion: string | null = null;
  correlationId: string | null = null;
  manifestURL: string | null = null;
  hasShortcuts: boolean = false;
  hasScreenshots: boolean = false;
  hasCategories: boolean = false;
  hasRating: boolean = false;
  hasBackgroundColor: boolean = false;
  hasDescription: boolean = false;
  hasPreferRelatedApps: boolean = false;
  hasRelatedApps: boolean = false;
  hasThemeColor: boolean = false;
  hasFileHandlers: boolean = false;
  hasShareTarget: boolean = false;
  hasProtocolHandlers: boolean = false;
  hasWindowControlOverlay: boolean = false;
  hasWidgets: boolean = false;
  hasLaunchHandlers: boolean = false;
  hasUrlHandlers: boolean = false;
  hasMinimalUI: boolean = false;

  hasServiceWorker: boolean = false;
  hasBackgroundSync: boolean = false;
  hasPeriodicBackgroundSync: boolean = false;
  hasSignsOfLogic: boolean = false;
};
