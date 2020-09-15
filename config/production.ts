export default {
  azure: {
    account_name: process.env.STORAGE_ACCOUNTNAME,
    access_key: process.env.STORAGE_ACCESSKEY,
  },
  platforms: [
    "windows10",
    "windows",
    "android",
    "ios",
    "web",
    "androidTWA",
    "samsung",
    "msteams",
  ],
  services: {
    generateImages:
      process.env.IMG_GEN_SVC_URL ||
      "http://appimagegenerator-prod.azurewebsites.net",
  },
};
