import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { checkBackgroundColor, checkCategories, checkDesc, checkDisplay, checkIcons, checkMaskableIcon, checkName, checkOrientation, checkRating, checkRelatedApps, checkRelatedPref, checkScreenshots, checkShortName, checkStartUrl, checkThemeColor } from './mani-tests';
import getManifest from "../utils/getManifest";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  context.log(`Web Manifest function is processing a request for site: ${req.query.site}`);

  let site = null;
  let maniObject = null;
  let maniUrl = null;

  // set our variables to actual values
  // if the values are available
  if (req.query && req.query.site) {
    site = req.query.site;
  }

  if (req.body && req.body.manifest) {
    maniObject = req.body.manifest;
  }

  if (req.body && req.body.maniurl) {
    maniUrl = req.body.maniurl;
  }

  try {

    if (maniObject && (maniUrl || site)) {
      context.log(`Web Manifest function has a raw manifest object for site: ${req.query.site}`);

      const results = {
        "required": {
          "short_name": checkShortName(maniObject),
          "name": checkName(maniObject),
          "display": checkDisplay(maniObject),
          "start_url": checkStartUrl(maniObject),
          "icons": checkIcons(maniObject)
        },
        "recommended": {
          "screenshots": checkScreenshots(maniObject),
          "description": checkDesc(maniObject),
          "categories": checkCategories(maniObject),
          "maskable_icon": checkMaskableIcon(maniObject),
          "iarc_rating": checkRating(maniObject),
          "related_applications": checkRelatedApps(maniObject),
          "prefer_related_applications": checkRelatedPref(maniObject),
          "background_color": checkBackgroundColor(maniObject),
          "theme_color": checkThemeColor(maniObject),
          "orientation": checkOrientation(maniObject)
        },
        "optional": {

        }
      }

      context.res = {
        status: 200,
        body: {
          "data": results,
          "content": {
            json: maniObject,
            url: maniUrl || site
          }
        }
      }

      context.log(`Web Manifest function is DONE processing for site: ${req.query.site}`);
    }
    else if (site) {
      context.log(`Web Manifest function is grabbing manifest object for site: ${req.query.site}`);
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

        context.log(`Web Manifest function is DONE processing for site: ${req.query.site}`);
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

    context.log(`Web Manifest function has ERRORED while processing for site: ${req.query.site} with this error: ${err.message}`);
  }
};

export default httpTrigger;
