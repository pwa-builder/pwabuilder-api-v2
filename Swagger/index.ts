import { AzureFunction, Context, HttpRequest } from "@azure/functions"

import fs from 'fs';
import { readFile } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { absolutePath } from 'swagger-ui-dist'

const __dirname = dirname(fileURLToPath(import.meta.url + '/../../'));
const pathToSwaggerUi = absolutePath();

const swaggerContent = fs.readFileSync(`${pathToSwaggerUi}/swagger-initializer.js`)
  .toString()
  .replace("https://petstore.swagger.io/v2/swagger.json", "?file=open-api.yaml");

const indexContent = fs.readFileSync(`${pathToSwaggerUi}/index.html`)
  .toString()
  .replaceAll('"./', '"?file=').replace("index.css", "?file=index.css");


const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    let file=`index.html`
    let specsFolder = false;

    if (req.query.file){
        file = req.query.file;
        file = file.replace(/\//g, '');
    }
    else {
        context.res = {
            status: 200,
            body: indexContent,
            headers: {
                'Content-Type': 'text/html'
            }
        };
        return;
    }

    if (file.endsWith('.yaml')) {
        specsFolder = true;
    }
    else if (file == 'swagger-initializer.js') {
        context.res = {
            status: 200,
            body: swaggerContent,
            headers: {
                'Content-Type': 'application/javascript'
            }
        };
        return;
    }

    const filePath = (specsFolder ? `${__dirname}/.openAPI/` : `${pathToSwaggerUi}/`) + file;

    let content;
    try {
        content = await readFile(filePath);
    }  catch (error) {}
    
    if (content) {
        context.res = {
            status: 200, 
            body: content,
            isRaw: true
        };
    }
    else {
        context.log.warn(`Swagger: file not found: ${filePath}`);

        context.res = {
            status: 404, 
            body: "Not Found"
        };
    }
};

export default httpTrigger;

