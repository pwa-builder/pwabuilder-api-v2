// don't work anymore, for history only

import express from 'express'
import httpProxy from 'http-proxy'
const apiProxy = httpProxy.createProxyServer(
  {target: { host: '0.0.0.0', port: 7071, protocol: 'http' }, changeOrigin: true}
)

import fs from 'fs'
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { absolutePath } from 'swagger-ui-dist'

const __dirname = dirname(fileURLToPath(import.meta.url));
const pathToSwaggerUi = absolutePath();

const indexContent = fs.readFileSync(`${pathToSwaggerUi}/swagger-initializer.js`)
  .toString()
  .replace("https://petstore.swagger.io/v2/swagger.json", "/openAPI/open-api.yaml")

const app = express()
app.get("/swagger-initializer.js", (req, res) => res.send(indexContent))
app.use(express.static(pathToSwaggerUi))
app.use('/openAPI', express.static(path.join(__dirname, '.')))

app.all(/\/api\/*/, function(req, res) {
  apiProxy.web(req, res);
});

app.listen(80)