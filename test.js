import fs from "node:fs";
import { parse } from "./src/index.js";

async function main() {
  try {
    const file = "./example/example.resume";
    const rootDir = "./example";
    const parsedAST = JSON.stringify(
      parse(await fs.promises.readFile(file, "utf8"), rootDir),
      (k, v) => {
        if (k === "parent") {
          return undefined;
        }
        return v;
      },
      2
    );
    await fs.promises.writeFile("./parsed.ast.json", parsedAST, "utf8");
    return;
  } catch (err) {
    console.error(err);
  }
}

main();
