type apiUrl = string;

interface Config {
  azure: {
    account_name: string;
    access_key: string;
  };
  services: {
    generateImages: apiUrl;
  };
}

export default <Config>(
  require(`./${process.env.NODE_ENV || "development"}`).default
);
