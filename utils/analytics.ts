
import {
  setup,
  defaultClient,
  DistributedTracingModes,
} from 'applicationinsights';
import { validateSingleField } from '@pwabuilder/manifest-validation';

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

export async function uploadToAppInsights(webAppReport: any, analyticsInfo: AnalyticsInfo) {
  if (webAppReport.artifacts.webAppManifest?.json) {
    const _manifest = webAppReport.artifacts.webAppManifest?.json;
    analyticsInfo.url = webAppReport.artifacts.webAppManifest.url || '';
    analyticsInfo.hasBackgroundColor = (await validateSingleField('background-color', _manifest['background-color'])).valid as boolean || false;
    analyticsInfo.hasCategories = (await validateSingleField('categories', _manifest['categories'])).valid as boolean || false;
    analyticsInfo.hasDescription = (await validateSingleField('description', _manifest['description'])).valid as boolean || false;
    analyticsInfo.hasFileHandlers = (await validateSingleField('file_handlers', _manifest['file_handlers'])).valid as boolean || false;
    analyticsInfo.hasLaunchHandlers = (await validateSingleField('launch_handler', _manifest['launch_handler'])).valid as boolean || false;
    analyticsInfo.hasPreferRelatedApps = (await validateSingleField('prefer_related_applications', _manifest['prefer_related_applications'])).valid as boolean || false;
    analyticsInfo.hasProtocolHandlers = (await validateSingleField('protocol_handlers', _manifest['protocol_handlers'])).valid as boolean || false;
    analyticsInfo.hasRelatedApps = (await validateSingleField('related_applications', _manifest['related_applications'])).valid as boolean || false;
    analyticsInfo.hasScreenshots = (await validateSingleField('screenshots', _manifest['screenshots'])).valid as boolean || false;
    analyticsInfo.hasShareTarget = (await validateSingleField('share_target', _manifest['share_target'])).valid as boolean || false;
    analyticsInfo.hasShortcuts = (await validateSingleField('shortcuts', _manifest['shortcuts'])).valid as boolean || false;
    analyticsInfo.hasThemeColor = (await validateSingleField('theme_color', _manifest['theme_color'])).valid as boolean || false;
    analyticsInfo.hasRating = (await validateSingleField('iarc_rating_id', _manifest['iarc_rating_id'])).valid as boolean || false;
    analyticsInfo.hasWidgets = (await validateSingleField('widgets', _manifest['widgets'])).valid as boolean || false;
    analyticsInfo.hasIcons = (await validateSingleField('icons', _manifest['icons'])).valid as boolean || false;
  }
  if (webAppReport.audits.serviceWorker) {
    analyticsInfo.hasServiceWorker = webAppReport.audits.serviceWorker.score;

    if (webAppReport.audits.serviceWorker.details.features) {
      const _features = webAppReport.audits.serviceWorker.details.features;
      analyticsInfo.hasBackgroundSync = _features.detectedBackgroundSync;
      analyticsInfo.hasPeriodicBackgroundSync = _features.detectedPeriodicBackgroundSync;
      analyticsInfo.hasSignsOfLogic = _features.detectedSignsOfLogic;
    }
  }

  trackEvent(analyticsInfo, null, true);
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
  hasIcons: boolean = false;
  hasServiceWorker: boolean = false;
  hasBackgroundSync: boolean = false;
  hasPeriodicBackgroundSync: boolean = false;
  hasSignsOfLogic: boolean = false;
};
