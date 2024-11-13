import fs from "node:fs"
import { parse } from "./index.js";

async function main(){
  const parsedAST = JSON.stringify(
    parse(await fs.promises.readFile("./example/example.resume", "utf8")),
    (k, v) => {
      if (k === "parent") {
        return undefined;
      }
      return v;
    },
    2
  )
  await fs.promises.writeFile("./parsed.ast.json",parsedAST,"utf8")
  return 
}

main()