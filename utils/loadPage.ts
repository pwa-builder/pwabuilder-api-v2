import * as WebSocket from 'ws';
import * as puppeteer from 'puppeteer';
import { Context } from '@azure/functions';

export default async function loadPage(site: string, context?: Context): Promise<{ sitePage: puppeteer.Page, pageResponse: puppeteer.Response, browser: puppeteer.Browser }> {
  let browser: puppeteer.Browser;
  let sitePage: puppeteer.Page;
  let pageResponse: puppeteer.Response | null;

  const timeout = 120000;

  try {
    browser = await puppeteer.launch(
      {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      }
    );

    
    sitePage = await browser.newPage();

    await sitePage.setDefaultNavigationTimeout(timeout);

    pageResponse = await sitePage.goto(site, { waitUntil: ['domcontentloaded'] });

    // const cdpSession = await sitePage.target().createCDPSession();
    //sitePage.target().

    const endPoint = browser.wsEndpoint();
    console.log(endPoint);

    const ws = new WebSocket(endPoint, { perMessageDeflate: false });
    await new Promise(resolve => ws.once('open', resolve));

    const try1 = await wsSendMessage(ws, {
      id: 1,
      method: 'Target.targets'
    });


    context?.log(try1);

    const try2 = await wsSendMessage(ws, {
      id: 2,
      method: 'Browser.getVersion'
    });

    context?.log(try2);


    const try3 = await wsSendMessage(ws, {
      id: 3,
      method: 'ServiceWorker.setForceUpdateOnPageLoad',
      params: {
        forceUpdateOnPageLoad: false
      }
    });

    context?.log(try3);

    if (pageResponse) {
      return {
        sitePage: sitePage,
        pageResponse: pageResponse,
        browser: browser
      };
    }
    else {
      throw new Error("Could not get a page response")
    }
  }
  catch (err) {
    return err || err.message;
  }
}

async function wsSendMessage(websocket: WebSocket, command: any) {
  websocket.send(JSON.stringify(command));
  return new Promise(resolve => {
    websocket.on('message', (text: string) => {
      const response = JSON.parse(text);
      if (response.id === command.id) {
        resolve(response);
      }
    });
  });
}