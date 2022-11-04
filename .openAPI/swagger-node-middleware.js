const express = require("express")
const httpProxy = require('http-proxy')
const apiProxy = httpProxy.createProxyServer(
  {target: { host: '0.0.0.0', port: 7071, protocol: 'http' }, changeOrigin: true}
)

const fs = require("fs")
const path = require('path')

const pathToSwaggerUi = require("swagger-ui-dist").absolutePath()

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