export default {
  extends: "lighthouse:default",
  artifacts: [
    {id: 'ServiceWorker', gatherer: 'service-worker'},
  ],
  audits: ["service-worker"],
  categories: {
    "pwa-builder": {
      title: "PWA Builder",
      description: "Custom audits for PWA Builder",
      supportedModes: ['navigation'],
      auditRefs: [
        {
          id: "service-worker",
          weight: 1,
          group: 'pwa-optimized'
        },
      ],
    },
  },
};