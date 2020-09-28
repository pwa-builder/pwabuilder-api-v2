import { Icon, Manifest } from "../utils/interfaces";

export const checkShortName = (data: Manifest) => {
  if (data.short_name) {
    return true;
  }
  else {
    return false;
  }
}

export const checkName = (data: Manifest) => {
  if (data.name) {
    return true;
  }
  else {
    return false;
  }
}

export const checkDesc = (data: Manifest) => {
  if (data.description && data.description.length > 0) {
    return true;
  }
  else {
    return false;
  }
}

export const checkDisplay = (data: Manifest) => {
  if (data.display && data.display.length > 0) {
    return true;
  }
  else {
    return false;
  }
}

export const checkStartUrl = (data: Manifest) => {
  if (data.start_url && data.start_url.length > 0) {
    return true;
  }
  else {
    return false;
  }
}

export const checkIcons = (data: Manifest) => {
  if (data.icons && data.icons.length > 0) {
    return true;
  }
  else {
    return false;
  }
}

export const checkMaskableIcon = (data: Manifest) => {
  const hasIcons = checkIcons(data);
  
  if (hasIcons) {
    let hasMask = false;

    data.icons.forEach((icon: Icon) => {
      if (icon.purpose && icon.purpose.includes('maskable')) {
        hasMask = true;
      }
    })

    return hasMask;
  }
  else {
    return false;
  }
}

export const checkScreenshots = (data: Manifest) => {
  if (data.screenshots && data.screenshots.length > 0) {
    return true;
  }
  else {
    return false;
  }
}

export const checkCategories = (data: Manifest) => {
  if (data.categories && data.categories.length > 0) {
    return true;
  }
  else {
    return false;
  }
}

export const checkRating = (data: Manifest) => {
  if (data.iarc_rating) {
    return true;
  }
  else {
    return false;
  }
}

export const checkRelatedApps = (data: Manifest) => {
  if (data.related_applications) {
    return true;
  }
  else {
    return false;
  }
}

export const checkRelatedPref = (data: Manifest) => {
  if (data.prefer_related_applications !== undefined && data.prefer_related_applications !== null) {
    return true;
  }
  else {
    return false;
  }
}

export const checkBackgroundColor = (data: Manifest) => {
  if (data.background_color) {
    return true;
  }
  else {
    return false;
  }
}

export const checkThemeColor = (data: Manifest) => {
  if (data.theme_color) {
    return true;
  }
  else {
    return false;
  }
}

export const checkOrientation = (data: Manifest) => {
  if (data.orientation) {
    return true;
  }
  else {
    return false;
  }
}