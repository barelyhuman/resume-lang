import { assertSnapshot } from "@std/testing/snapshot";
import { parse } from "./main.ts";

// removes the circular dep on the `parent`
// nodes and creates a simpler Object
function toJSON(ast: any) {
  return JSON.parse(
    JSON.stringify(ast, (k, v) => (k === "parent" ? undefined : v), 2)
  );
}

Deno.test("parse isolated labels", async (t) => {
  const output = parse(
    `
label :"Siddharth Gelera"
label E-Mail: url ahoy@barelyhuman.dev mailto:ahoy@barelyhuman.dev
label Website: url https://reaper.is`,
    {
      rootDir: ".",
      readFile: (_path) => ``,
    }
  );
  await assertSnapshot(t, toJSON(output));
});

Deno.test("parse basic section", async (t) => {
  const output = parse(
    `section Basic
    label :"Siddharth Gelera"
    label E-Mail: url ahoy@barelyhuman.dev mailto:ahoy@barelyhuman.dev
    label Website: url https://reaper.is
end`,
    {
      rootDir: ".",
      readFile: (_path) => ``,
    }
  );
  await assertSnapshot(t, toJSON(output));
});

Deno.test("parse nested sections", async (t) => {
  const output = parse(
    `section Education
    section College
      label "Grade":"1"
      label "BatchOf":"2013"
    end
end`,
    {
      rootDir: ".",
      readFile: (_path) => ``,
    }
  );
  await assertSnapshot(t, toJSON(output));
});

Deno.test("imports", async (t) => {
  const fileOne = `section Education
  section College
    label "Grade":"1"
    label "BatchOf":"2013"
  end
end`;
  const fileTwo = `label x:y`;
  const output = parse(
`
@import "./fileOne"
@import "./fileTwo"
`,
    {
      rootDir: ".",
      readFile: (path) => {
        return (path === "./fileOne.resume" ? fileOne : fileTwo)
      },
    }
  );
  await assertSnapshot(t, toJSON(output));
});
