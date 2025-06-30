const fs = require("fs")
const path = require("path")

function getInstructions(fileName) {
  const schemaPath = path.join(__dirname, "schemas", fileName)
  return fs.readFileSync(schemaPath, "utf8")
}

module.exports = {
  getInstructions,
}
