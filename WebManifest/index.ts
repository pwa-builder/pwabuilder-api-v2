import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { checkBackgroundColor, checkCategories, checkDesc, checkDisplay, checkIcons, checkMaskableIcon, checkName, checkOrientation, checkRating, checkRelatedApps, checkRelatedPref, checkScreenshots, checkShortName, checkStartUrl, checkThemeColor } from './mani-tests';
import getManifest from "../utils/getManifest";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log('Web Manifest function processed a request.');

  const site = req.query.site;
  try {

    const maniData = await getManifest(site);

    if (maniData) {
      const results = {
        "required": {
          "short_name": checkShortName(maniData.json),
          "name": checkName(maniData.json),
          "display": checkDisplay(maniData.json),
          "start_url": checkStartUrl(maniData.json),
          "icons": checkIcons(maniData.json)
        },
        "recommended": {
          "screenshots": checkScreenshots(maniData.json),
          "description": checkDesc(maniData.json),
          "categories": checkCategories(maniData.json),
          "maskable_icon": checkMaskableIcon(maniData.json),
          "iarc_rating": checkRating(maniData.json),
          "related_applications": checkRelatedApps(maniData.json),
          "prefer_related_applications": checkRelatedPref(maniData.json),
          "background_color": checkBackgroundColor(maniData.json),
          "theme_color": checkThemeColor(maniData.json),
          "orientation": checkOrientation(maniData.json)
        },
        "optional": {

        }
      }

      context.res = {
        status: 200,
        body: {
          "data": results,
          "content": maniData
        }
      }
    }
  }
  catch (err) {
    context.res = {
      status: 400,
      body: {
        "error": { error: err, message: err.message }
      },
    };
  }
};

export default httpTrigger;
