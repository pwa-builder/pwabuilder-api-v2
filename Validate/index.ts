import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import validate from "../utils/schema";


const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.res = {
        // status: 200, /* Defaults to 200 */
        body: validate(req.body)
    };
};

export default httpTrigger;