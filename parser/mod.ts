import { marked } from "marked"

type Maybe<T> = T | undefined

/**
 * These options define how the parser can import
 * relative imports and are needed only when dealing with
 * a file system based setup.
 *
 * when using in a browser you are better of just writing it
 * as one single file holding the resume or writing a synchronous
 * setup to read other `.resume` files.
 */
export type ParserOptions = {
  rootDir: string
  readFile: (p: string) => string
}

/**
 * Each block of resume lang code is represented as a
 * Node and holds a reference to it's parent node.
 *
 * the `value` field of a Node can be identified based on the `type`
 * field and might have nested types.
 *
 * Eg:
 * ```coffeescript
 * label x: url http://reaper.is
 * ```
 * would give the output like so
 * ```json
 *  {
 *      "type": "label",
 *      "value": {
 *          "id": "x",
 *          "value": {
 *              "type": "url",
 *              "value": {
 *                  "alias": "http://reaper.is",
 *                  "link": "http://reaper.is"
 *              },
 *          }
 *      },
 *  }
 * ```
 *
 * Where the type `label` has a value of type `url` and then that is what
 * holds the value for the label.
 *
 * an easy way is to just look for objects in the `value` key. If it's an
 * `object` then you need to traverse inside if it's not an object you are at the value
 */
export type Node = {
  __type: "NODE"
  parent?: AST | Node
  type: string
  value: unknown
  children: Node[]
}

/**
 * Same as {@link Node}, except there's no `parent` or `value` key
 * and the `children` key holds the data to the language's AST
 */
export type AST = {
  __type: "ROOT_NODE"
  type: "root"
  children: Node[]
}

const join = (...paths: string[]) => {
  if (paths.find((d) => d == null)) {
    throw new Error("Paths cannot be `undefined`")
  }
  return paths.join("/").replace(/(\.\/)+/g, "./")
}

const DEFAULT_TRANSFORMS = [
  nestedStringLiteralTransform,
  dateTranform,
  urlTransfrom,
]

const KEYWORDS = ["section", "text", "end", "label", "url", "date", "@import"]

function tokenizer(code: string) {
  const tokens = code.split("")
  return tokens
}

function createTokenTraverser(tokens: string[]) {
  return {
    tokens,
    pos: -1,
    value() {
      return this.tokens[this.pos]
    },
    next(count = 1) {
      this.pos += count
      return this.tokens[this.pos]
    },
    prev(count = 1) {
      this.pos -= count
      return this.tokens[this.pos]
    },
    peekPrev(count = 1) {
      return this.tokens[this.pos - count]
    },
    peekNext(count = 1) {
      return this.tokens[this.pos + count]
    },
  }
}

function createNode<T>(type: string, value: T, parent?: AST | Node): Node {
  return {
    __type: "NODE",
    type,
    value,
    children: [],
    parent,
  }
}

function toAst(tokens: string[], parseOptions: ParserOptions) {
  const collector = []
  const traverse = createTokenTraverser(tokens)
  const ast: AST = {
    __type: "ROOT_NODE",
    type: "root",
    children: [],
  }
  try {
    let astPointer: AST | Node = ast
    while (traverse.next()) {
      const literal = collector.concat(traverse.value()).join("")
      if (KEYWORDS.includes(literal)) {
        switch (literal) {
          case "section": {
            let sectionId = ""
            for (;;) {
              traverse.next()
              if (!traverse.value()) break
              if (traverse.value() === "\n") break
              sectionId += traverse.value()
            }
            const nodeDef: Node = createNode(
              "section",
              sectionId.trim(),
              astPointer,
            )
            ;(astPointer.children ||= []).push(nodeDef)

            collector.length = 0
            astPointer = nodeDef
            break
          }
          case "@import": {
            let importPath = ""
            for (;;) {
              traverse.next()
              if (!traverse.value()) break
              if (traverse.value() === "\n") break
              importPath += traverse.value()
            }

            if (!importPath.trim().startsWith('"')) {
              throw new Error(
                "`@imports` must be defined in single or double `\",'` quotes",
              )
            }

            const normalizeImportPath =
              nestedStringLiteralTransform(importPath).replace(
                /\.resume$/,
                "",
              ) + ".resume"

            const secondary = parseOptions.readFile(
              join(parseOptions.rootDir, normalizeImportPath),
            )
            const tree = parse(secondary, parseOptions)
            astPointer.children.push(...tree.children)
            collector.length = 0
            break
          }
          case "end": {
            if (astPointer.__type !== "ROOT_NODE") {
              astPointer = astPointer.parent!
            }
            collector.length = 0
            break
          }
          case "text": {
            let textId = ""
            for (;;) {
              traverse.next()
              if (!traverse.value()) break
              if (traverse.value() === ":") break
              textId += traverse.value()
            }
            const textValue: string[] = []
            const posBeforeParse = traverse.pos
            for (;;) {
              traverse.next()
              if (!traverse.value()) break
              textValue.push(traverse.value())
            }

            let lookingForEndAt
            outer: for (
              lookingForEndAt = 0;
              lookingForEndAt < textValue.length;
              lookingForEndAt += 1
            ) {
              let currentPos = lookingForEndAt
              const token = textValue[lookingForEndAt]
              if (token === "\n") {
                const walker = []
                inner: for (;;) {
                  currentPos += 1
                  walker.push(textValue[currentPos])
                  if (
                    !textValue[currentPos] ||
                    textValue[currentPos] === "\n"
                  ) {
                    if (walker.join("").trim() === "end") {
                      lookingForEndAt += currentPos - lookingForEndAt
                      break outer
                    }
                    break inner
                  }
                }
              }
            }
            // was already at `posBeforeParse`, then moved up till the nearest `end` which was
            // found at lookingForEndAt, we need to move back just before the last `end`
            traverse.pos = posBeforeParse + lookingForEndAt
            const asString = textValue
              .slice(0, lookingForEndAt - "end".length)
              .join("")

            const node = createNode(
              "rich-text",
              {
                id: runTransformers(textId),
                original: asString.trim(),
                transformed: marked(asString),
              },
              astPointer,
            )
            astPointer.children.push(node)
            collector.length = 0
            break
          }
          case "label": {
            let labelId = ""
            for (;;) {
              traverse.next()
              if (!traverse.value()) break
              if (traverse.value() === ":") break
              labelId += traverse.value()
            }
            let labelValue = ""
            for (;;) {
              traverse.next()
              if (!traverse.value()) break
              if (traverse.value() === "\n") break
              labelValue += traverse.value()
            }

            let transformedLabelValue = runTransformers(labelValue)
            if (
              typeof transformedLabelValue != "object" &&
              typeof transformedLabelValue === "string"
            ) {
              transformedLabelValue = {
                type: "text",
                value: transformedLabelValue,
              }
            }
            const labelNode = createNode(
              "label",
              {
                id: runTransformers(labelId),
                value: transformedLabelValue,
              },
              astPointer,
            )
            collector.length = 0
            astPointer.children.push(labelNode)
            break
          }
        }
      } else {
        if (traverse.value().trim() === "") continue
        collector.push(traverse.value())
      }
    }
    return ast
  } catch (_err) {
    return ast
  }
}

function runTransformers(literal: string | Record<string, unknown>) {
  let acc = literal
  for (const tranform of DEFAULT_TRANSFORMS) {
    if (typeof acc === "object" && acc.type) return acc
    if (typeof acc === "string") acc = tranform(acc)
  }
  return acc
}

function dateTranform(code: string) {
  const trimmedCode = code.trim()
  if (!trimmedCode.startsWith("date")) {
    return code
  }

  const dateLiteral = trimmedCode.slice("date".length).trim()
  return createNode("date", new Date(dateLiteral))
}

function urlTransfrom(code: string) {
  const trimmedCode = code.trim()
  if (!trimmedCode.startsWith("url")) {
    return code
  }

  const collector = []
  let scopeDelim
  const traverser = createTokenTraverser(
    trimmedCode.slice("url".length).split(""),
  )

  const literals = []
  while (traverser.next()) {
    if (/\s+/.test(traverser.value())) {
      if (!scopeDelim) {
        if (collector.length > 0) {
          literals.push(collector.join(""))
          collector.length = 0
          continue
        }
      }
    }

    if (traverser.value() === '"') {
      if (collector.length > 0 && scopeDelim === '"') {
        literals.push(collector.join(""))
        collector.length = 0
        scopeDelim = ""
      } else {
        scopeDelim = '"'
      }
      continue
    }
    collector.push(traverser.value())
  }

  if (collector.length > 0) {
    literals.push(collector.join(""))
  }

  if (literals.length == 2) {
    const alias = literals[0].trim()
    const value = literals[1].trim()
    return createNode("url", {
      alias: alias,
      link: value,
    })
  } else if (literals.length == 1) {
    const value = literals[0].trim()
    return createNode("url", {
      alias: value,
      link: value,
    })
  }
  return code
}

function nestedStringLiteralTransform(code: string) {
  const trimmedCode = code.trim()
  if (!(trimmedCode.startsWith('"') && trimmedCode.endsWith('"'))) {
    return trimmedCode
  }
  return trimmedCode.slice(1, -1)
}

const _defaultRootDir = "."
const _defaultReadFile = (_s: string) => ``

const defaultOptions: ParserOptions = {
  rootDir: _defaultRootDir,
  readFile: _defaultReadFile,
}

/**
 * resume-lang parser responsible for converting the DSL into an easy block style
 * AST to traverse
 * @param {string} code
 * @param {ParserOptions} options
 * @returns
 */
export function parse(
  code: string,
  {
    rootDir = _defaultRootDir,
    readFile = _defaultReadFile,
  }: Maybe<Partial<ParserOptions>> = defaultOptions,
): AST {
  const ast = toAst(tokenizer(code), { rootDir, readFile })
  return ast
}
