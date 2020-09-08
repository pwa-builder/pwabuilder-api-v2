import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import * as puppeteer from "puppeteer";
import { ifFile } from './helpers';

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('HTTP trigger function processed a request.');
    const site = req.query.site;
    const isFile = req.method === "POST" && ifFile(req)

    if (isFile) {
        // const file = req.body;
        context.res = {
            status: 400,
            body: {
                message: "not supported yet"
            }
        }
    }

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: {
            a: true
        }
    };

};

export default httpTrigger;