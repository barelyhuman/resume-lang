import fs from "node:fs";
import { parse } from "./src/index.js";

async function main() {
  try {
    const file = "./example/example.resume";
    const rootDir = "./example";
    const ast = parse(await fs.promises.readFile(file, "utf8"), {
      rootDir,
      readFile: (path) => fs.readFileSync(path, "utf8"),
    });
    const parsedAST = JSON.stringify(
      ast,
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
