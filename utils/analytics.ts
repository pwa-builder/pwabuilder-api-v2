import { validateSingleField } from '@pwabuilder/manifest-validation';
import * as appInsights from 'applicationinsights';

let telemetryClient;

enum AppInsightsStatus {
  ENABLED = 1,
  DISABLED = 0,
  DEFAULT = -1,
}

var appInsightsStatus: AppInsightsStatus = AppInsightsStatus.DEFAULT;

function initAnalytics() {
  try {
    console.log('proces.', process.env.APPINSIGHTS_CONNECTION_STRING);
    telemetryClient = new appInsights.TelemetryClient(
      process.env.APPINSIGHTS_CONNECTION_STRING
    );
    appInsightsStatus = AppInsightsStatus.ENABLED;
  } catch (e) {
    console.warn('App Insights not enabled', e);
    appInsightsStatus = AppInsightsStatus.DISABLED;
  }
}

export function trackEvent(
  analyticsInfo: AnalyticsInfo,
  error: string | null,
  success: boolean
) {
  initAnalytics();
  if (
    telemetryClient == null ||
    telemetryClient == undefined ||
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
      telemetryClient.context.tags[telemetryClient.context.keys.operationId] =
        analyticsInfo.correlationId;
    }
    if (success) {
      telemetryClient.trackEvent({
        name: 'ReportCardEvent',
        properties: { properties, ...analyticsInfo.properties },
      });
    } else {
      properties.error = error;
      telemetryClient.trackEvent({
        name: 'ReportCardFailureEvent',
        properties: properties,
      });
    }
    telemetryClient.flush();
  } catch (e) {
    console.error(e);
  }
}

export async function uploadToAppInsights(
  webAppReport: any,
  analyticsInfo: AnalyticsInfo
) {
  try {
    analyticsInfo.properties = {};
    if (webAppReport.artifacts.webAppManifest?.json) {
      const _manifest = webAppReport.artifacts.webAppManifest?.json;
      console.log(_manifest);
      analyticsInfo.properties.name =
        (_manifest['name'] != undefined &&
          (await validateSingleField('name', _manifest['name'])).valid) ||
        false;
      analyticsInfo.properties.hasBackgroundColor =
        (_manifest['background-color'] != undefined &&
          (
            await validateSingleField(
              'background-color',
              _manifest['background-color']
            )
          ).valid) ||
        false;
      analyticsInfo.properties.hasCategories =
        (_manifest['categories'] != undefined &&
          (await validateSingleField('categories', _manifest['categories']))
            .valid) ||
        false;
      analyticsInfo.properties.hasDescription =
        (_manifest['description'] != undefined &&
          (await validateSingleField('description', _manifest['description']))
            .valid) ||
        false;
      analyticsInfo.properties.hasFileHandlers =
        (_manifest['file_handlers'] != undefined &&
          (
            await validateSingleField(
              'file_handlers',
              _manifest['file_handlers']
            )
          ).valid) ||
        false;
      analyticsInfo.properties.hasLaunchHandlers =
        (_manifest['launch_handler'] != undefined &&
          (
            await validateSingleField(
              'launch_handler',
              _manifest['launch_handler']
            )
          ).valid) ||
        false;
      analyticsInfo.properties.hasPreferRelatedApps =
        (_manifest['prefer_related_applications'] != undefined &&
          (
            await validateSingleField(
              'prefer_related_applications',
              _manifest['prefer_related_applications']
            )
          ).valid) ||
        false;
      analyticsInfo.properties.hasProtocolHandlers =
        (_manifest['protocol_handlers'] != undefined &&
          (
            await validateSingleField(
              'protocol_handlers',
              _manifest['protocol_handlers']
            )
          ).valid) ||
        false;
      analyticsInfo.properties.hasRelatedApps =
        (_manifest['related_applications'] != undefined &&
          (
            await validateSingleField(
              'related_applications',
              _manifest['related_applications']
            )
          ).valid) ||
        false;
      analyticsInfo.properties.hasScreenshots =
        (_manifest['screenshots'] != undefined &&
          (await validateSingleField('screenshots', _manifest['screenshots']))
            .valid) ||
        false;
      analyticsInfo.properties.hasShareTarget =
        (_manifest['share_target'] != undefined &&
          (await validateSingleField('share_target', _manifest['share_target']))
            .valid) ||
        false;
      analyticsInfo.properties.hasShortcuts =
        (_manifest['shortcuts'] != undefined &&
          (await validateSingleField('shortcuts', _manifest['shortcuts']))
            .valid) ||
        false;
      analyticsInfo.properties.hasThemeColor =
        (_manifest['theme_color'] != undefined &&
          (await validateSingleField('theme_color', _manifest['theme_color']))
            .valid) ||
        false;
      analyticsInfo.properties.hasRating =
        (_manifest['iarc_rating_id'] != undefined &&
          (
            await validateSingleField(
              'iarc_rating_id',
              _manifest['iarc_rating_id']
            )
          ).valid) ||
        false;
      analyticsInfo.properties.hasWidgets =
        (_manifest['widgets'] != undefined &&
          (await validateSingleField('widgets', _manifest['widgets'])).valid) ||
        false;
      analyticsInfo.properties.hasIcons =
        (_manifest['icons'] != undefined &&
          (await validateSingleField('icons', _manifest['icons'])).valid) ||
        false;
    }
    if (webAppReport.audits.serviceWorker) {
      analyticsInfo.properties.hasServiceWorker =
        webAppReport.audits.serviceWorker.score;

      if (webAppReport.audits.serviceWorker.details.features) {
        const _features = webAppReport.audits.serviceWorker.details.features;
        analyticsInfo.properties.hasBackgroundSync =
          _features.detectedBackgroundSync;
        analyticsInfo.properties.hasPeriodicBackgroundSync =
          _features.detectedPeriodicBackgroundSync;
        analyticsInfo.properties.hasSignsOfLogic =
          _features.detectedSignsOfLogic;
      }
    }
  } catch (e) {
    console.warn('Could not log entry', e);
    return;
  }
  trackEvent(analyticsInfo, null, true);
}

export class AnalyticsInfo {
  url: string | null = null;
  platformId: string | null = null;
  platformIdVersion: string | null = null;
  correlationId: string | null = null;
  properties: any;
}
