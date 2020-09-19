export default {
  azure: {
    // account_name: "manifolddev",
    account_name: "vleonlepwabuilderapiv2",
    // access_key:
    //   "y4nxuSBfRtukWKATRZR7Ji3zx+6hEtAGUwKxUQmuUY7q94lp1NqO453nNbiX/tYg7xnPUSojXMY8lQ5xJqClmw==",
    access_key:
      "Mr0Z1EBkalo9VVYrSMcpx4k2akgZt/MgqWFu19oTDhKVOQ1eLqwKurqhWd77Xn8BF/s1wok7Im/SJaRvXSmRoA==",
    devSecret: "a0~zPHMQzq-Qj_GM~v8m3d~Px5k0V2HfWb",
  },
  services: {
    generateImages: process.env.IMG_GEN_SVC_URL || "http://localhost:49080/",
  },
};
