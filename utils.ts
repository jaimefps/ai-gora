import fs from "fs"
import path from "path"

export function getSchemas(fileName: string) {
  const schemaPath = path.join(__dirname, "schemas", fileName)
  return fs.readFileSync(schemaPath, "utf8")
}
