Please use our [main repository for any issues/bugs/features suggestion](https://github.com/pwa-builder/PWABuilder/issues/new/choose).

# pwabuilder-tests

Azure functions that use Puppeteer + Chromium to test websites to see if they are a Progressive Web App and if so return information about that PWA. These functions power [PWABuilder](https://www.pwabuilder.com), but can also be cloned and run independently.

## Test Details

Details about what info is pulled from each PWA. All of this info is gathered using Puppeteer and its APIs.

### Required:
  - A manifest with at least the following:
      - Name *
      - Short name *
      - Start url *
      - Icons **
      - Display mode *

  - A service worker that has cache handlers

  - Valid https cert with no mixed content

If a site has these things then it is a PWA.

### Recommended
- Screenshots
- Categories
- Iarc rating
- Related applications
- Prefer related
- Background color 
- Theme color 
- Description 
- Orientation 
- At least one maskable icon
- At least one monochrome icon\
- At least one 512x512 or larger square icon]
  Offline support

If a PWA has these then it is a store ready PWA, such as for the Microsoft or Google Play store.

## Development

https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference
https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node


