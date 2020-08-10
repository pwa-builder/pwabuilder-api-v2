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