import fs from "node:fs";
import { join } from "node:path";

const DEFAULT_TRANSFORMS = [
  nestedStringLiteralTransform,
  dateTranform,
  urlTransfrom,
];

const KEYWORDS = [
  "section",
  "end",
  "text",
  "endtext",
  "label",
  "url",
  "date",
  "@import",
];

function tokenizer(code) {
  const tokens = code.split("");
  return tokens;
}

function createTokenTraverser(tokens) {
  return {
    tokens,
    pos: -1,
    value() {
      return this.tokens[this.pos];
    },
    next() {
      this.pos += 1;
      return this.tokens[this.pos];
    },
    prev() {
      this.pos -= 1;
      return this.tokens[this.pos];
    },
    peekPrev() {
      return this.tokens[this.pos - 1];
    },
    peekNext() {
      return this.tokens[this.pos + 1];
    },
  };
}

function createNode(type, value, parent) {
  return {
    type,
    value,
    children: [],
    parent,
  };
}

function toAst(tokens, rootDir) {
  const collector = [];
  const traverse = createTokenTraverser(tokens);
  let ast = {
    type: "root",
    children: [],
  };
  let astPointer = ast;
  while (traverse.next()) {
    const literal = collector.concat(traverse.value()).join("");
    if (KEYWORDS.includes(literal)) {
      switch (literal) {
        case "section": {
          let sectionId = "";
          while (traverse.next() != "\n") {
            sectionId += traverse.value();
          }
          const newNode = createNode("section", sectionId.trim(), astPointer);

          (astPointer.children ||= []).push(newNode);

          collector.length = 0;
          astPointer = newNode;
          break;
        }
        case "@import": {
          let importPath = "";
          for (;;) {
            traverse.next();
            if (!traverse.value()) break;
            if (traverse.value() === "\n") break;
            importPath += traverse.value();
          }

          if (!importPath.trim().startsWith('"')) {
            throw new Error(
              "`@imports` must be defined in single or double `\",'` quotes"
            );
          }

          const normalizeImportPath =
            nestedStringLiteralTransform(importPath).replace(/\.resume$/, "") +
            ".resume";

          const secondary = fs.readFileSync(
            join(rootDir, normalizeImportPath),
            "utf8"
          );
          const tree = parse(secondary);
          astPointer.children.push(...tree.children);
          break;
        }
        case "end": {
          astPointer = astPointer.parent;
          collector.length = 0;
          break;
        }
        case "label": {
          let labelId = "";
          while (traverse.next() != ":") {
            labelId += traverse.value();
          }
          let labelValue = "";
          while (traverse.next() != "\n") {
            labelValue += traverse.value();
          }
          const labelNode = createNode(
            "label",
            {
              id: runTransformers(labelId),
              value: runTransformers(labelValue),
            },
            astPointer
          );
          collector.length = 0;
          astPointer.children.push(labelNode);
          break;
        }
      }
    } else {
      if (traverse.value().trim() === "") continue;
      collector.push(traverse.value());
    }
  }
  return ast;
}

function runTransformers(literal) {
  let acc = literal;
  for (let tranform of DEFAULT_TRANSFORMS) {
    if (typeof acc === "object" && acc.type) {
      return acc;
    }
    acc = tranform(acc);
  }
  return acc;
}

function dateTranform(code) {
  const trimmedCode = code.trim();
  if (!trimmedCode.startsWith("date")) {
    return code;
  }

  const dateLiteral = trimmedCode.slice("date.length").trim();
  return createNode("date", new Date(dateLiteral));
}

function urlTransfrom(code) {
  const trimmedCode = code.trim();
  if (!trimmedCode.startsWith("url")) {
    return code;
  }

  const collector = [];
  let scopeDelim;
  const traverser = createTokenTraverser(
    trimmedCode.slice("url".length).split("")
  );

  let literals = [];
  while (traverser.next()) {
    if (/\s+/.test(traverser.value())) {
      if (!scopeDelim) {
        if (collector.length > 0) {
          literals.push(collector.join(""));
          collector.length = 0;
          continue;
        }
      }
    }

    if (traverser.value() === '"') {
      if (collector.length > 0 && scopeDelim === '"') {
        literals.push(collector.join(""));
        collector.length = 0;
        scopeDelim = "";
      } else {
        scopeDelim = '"';
      }
      continue;
    }
    collector.push(traverser.value());
  }

  if (collector.length > 0) {
    literals.push(collector.join(""));
  }

  if (literals.length == 2) {
    const alias = literals[0].trim();
    const value = literals[1].trim();
    return createNode("url", {
      alias: alias,
      link: value,
    });
  } else if (literals.length == 1) {
    const value = literals[0].trim();
    return createNode("url", {
      link: value,
    });
  }
  return code;
}

function nestedStringLiteralTransform(code) {
  const trimmedCode = code.trim();
  if (!(trimmedCode.startsWith('"') && trimmedCode.endsWith('"'))) {
    return trimmedCode;
  }
  return trimmedCode.slice(1, -1);
}

export function parse(code, rootDir) {
  const ast = toAst(tokenizer(code), rootDir);
  return ast;
}
