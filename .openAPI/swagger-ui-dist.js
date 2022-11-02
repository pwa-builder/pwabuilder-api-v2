const fs = require("fs")
const path = require('path')
const express = require("express")
const pathToSwaggerUi = require("swagger-ui-dist").absolutePath()

const indexContent = fs.readFileSync(`${pathToSwaggerUi}/swagger-initializer.js`)
  .toString()
  .replace("https://petstore.swagger.io/v2/swagger.json", "/openAPI/open-api.yaml")

const app = express()
app.get("/swagger-initializer.js", (req, res) => res.send(indexContent))
app.use(express.static(pathToSwaggerUi))
app.use('/openAPI', express.static(path.join(__dirname, '.')))

app.listen(80)