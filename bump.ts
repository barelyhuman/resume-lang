import { parseArgs } from "@std/cli/parse-args"
import semver from "npm:semver"
import { curry } from "jsr:@barelyhuman/mini"

const cliFlags = parseArgs(Deno.args)

const currentSemver = await readVersion()

if (cliFlags._.length == 0) {
  printHelp()
  Deno.exit(0)
}

const bump = curry((type: string, version: string): string =>
  semver.inc(version, type)
)
const bumpMajor = bump("major")
const bumpMinor = bump("minor")
const bumpPatch = bump("patch")
let nextVersion = currentSemver

if (cliFlags._.indexOf("major") > -1) {
  nextVersion = bumpMajor(currentSemver)
} else if (cliFlags._.indexOf("minor") > -1) {
  nextVersion = bumpMinor(currentSemver)
} else if (cliFlags._.indexOf("patch") > -1) {
  nextVersion = bumpPatch(currentSemver)
}

await writeVersion(nextVersion)
await createVersionTag(nextVersion)

async function readDenoJSON() {
  const currentData = await Deno.readTextFile("./parser/deno.json", {})
  const denoJSON = JSON.parse(currentData)
  return denoJSON
}

async function readVersion() {
  const denoJSON = await readDenoJSON()
  return denoJSON.version as string
}

async function writeVersion(version: string) {
  const denoJSON = await readDenoJSON()
  denoJSON.version = version
  await Deno.writeTextFile(
    "./parser/deno.json",
    JSON.stringify(denoJSON, null, 2),
  )
}

async function createVersionTag(version: string) {
  const commandsToRun = [
    ["git", "add", "-A"],
    ["git", "commit", "-m", `chore: bump to version, ${version}`],
    ["git", "tag", `v${version}`],
    ["git", "push", "--follow-tags"],
    ["git", "push", "--tags"],
  ]

  for (
    let commandIndex = 0;
    commandIndex < commandsToRun.length;
    commandIndex += 1
  ) {
    const command = commandsToRun[commandIndex]
    const proc = new Deno.Command(command[0], {
      args: command.slice(1),
    })
    const spawnedProcess = proc.spawn()
    const done = await spawnedProcess.status
    if (done.code !== 0) {
      const leftOutCommands = commandsToRun.slice(commandIndex)
      console.error(
        `oops, looks like we failed to create a release tag for you,
you can try again or run the following commands manually. 
    COMMANDS 
        ${leftOutCommands.map((d) => ["$"].concat(d).join(" ")).join("\n")}
    `,
      )
      Deno.exit(done.code)
    }
  }
}

function printHelp() {
  console.log(`
    > bump 
        Simple semver bump script 
    
    ex: 
        $ deno task bump major # bump the major
        $ deno task bump minor # bump the minor
        $ deno task bump patch # bump the patch
        $ deno task bump major minor # bumps the major and ignores the minor
    `)
}
