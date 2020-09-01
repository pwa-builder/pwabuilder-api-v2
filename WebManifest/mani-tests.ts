export const checkShortName = (data) => {
  if (data.short_name) {
    return true;
  }
  else {
    return false;
  }
}

export const checkName = (data) => {
  if (data.name) {
    return true;
  }
  else {
    return false;
  }
}

export const checkDesc = (data) => {
  if (data.description && data.description.length > 0) {
    return true;
  }
  else {
    return false;
  }
}

export const checkDisplay = (data) => {
  if (data.display && data.display.length > 0) {
    return true;
  }
  else {
    return false;
  }
}

export const checkStartUrl = (data) => {
  if (data.start_url && data.start_url.length > 0) {
    return true;
  }
  else {
    return false;
  }
}

export const checkIcons = (data) => {
  if (data.icons && data.icons.length > 0) {
    return true;
  }
  else {
    return false;
  }
}

export const checkScreenshots = (data) => {
  if (data.screenshots && data.screenshots.length > 0) {
    return true;
  }
  else {
    return false;
  }
}

export const checkCategories = (data) => {
  if (data.categories && data.categories.length > 0) {
    return true;
  }
  else {
    return false;
  }
}

export const checkRating = (data) => {
  if (data.iarc_rating) {
    return true;
  }
  else {
    return false;
  }
}

export const checkRelatedApps = (data) => {
  if (data.related_applications) {
    return true;
  }
  else {
    return false;
  }
}

export const checkRelatedPref = (data) => {
  if (data.prefer_related_applications && data.prefer_related_applications !== undefined && data.prefer_related_applications !== null) {
    return true;
  }
  else {
    return false;
  }
}

export const checkBackgroundColor = (data) => {
  if (data.background_color) {
    return true;
  }
  else {
    return false;
  }
}

export const checkThemeColor = (data) => {
  if (data.theme_color) {
    return true;
  }
  else {
    return false;
  }
}

export const checkOrientation = (data) => {
  if (data.orientation) {
    return true;
  }
  else {
    return false;
  }
}