import { checkBackgroundColor, checkCategories, checkDesc, checkDisplay, checkIcons, checkMaskableIcon, checkName, checkOrientation, checkRating, checkRelatedApps, checkRelatedPref, checkScreenshots, checkShortName, checkStartUrl, checkThemeColor } from './mani-tests';
import { Manifest } from "./interfaces";

export default async function testManifest(mani: Manifest) {
  if (mani) {
    const results = {
      "required": {
        "short_name": checkShortName(mani),
        "name": checkName(mani),
        "display": checkDisplay(mani),
        "start_url": checkStartUrl(mani),
        "icons": checkIcons(mani)
      },
      "recommended": {
        "screenshots": checkScreenshots(mani),
        "description": checkDesc(mani),
        "categories": checkCategories(mani),
        "maskable_icon": checkMaskableIcon(mani),
        "iarc_rating": checkRating(mani),
        "related_applications": checkRelatedApps(mani),
        "prefer_related_applications": checkRelatedPref(mani),
        "background_color": checkBackgroundColor(mani),
        "theme_color": checkThemeColor(mani),
        "orientation": checkOrientation(mani)
      }
    }

    return results;
  }
}