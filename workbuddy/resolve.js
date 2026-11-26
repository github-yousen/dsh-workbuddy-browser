// Machine-specific transport resolution for the WorkBuddy browser MCP server.
//
// `browser-mcp.exe` and the Native Messaging host name vary between machines:
// the executable lives under the user profile, and the host name differs
// between the domestic and international WorkBuddy builds. Resolving them here
// keeps `cordis.patch.yml` free of one user's absolute paths and makes the
// detection independently testable, without importing the MCP client.
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** Marker accepted in `command`/`env` for "work it out from the machine". */
export const AUTO = 'auto'

/**
 * The Native Messaging host names WorkBuddy registers, most preferred first.
 * `com.workbuddy.extension` is the domestic build; `com.workbuddy_ai.extension`
 * is the international one. The extension itself tries both, but `browser-mcp`
 * is launched by us and takes exactly one, so a wrong guess yields a healthy
 * connection that lists zero browsers.
 */
export const HOST_NAMES = ['com.workbuddy.extension', 'com.workbuddy_ai.extension']

/**
 * Places `browser-mcp.exe` is known to ship. The first entry is the runtime
 * WorkBuddy extracts for its own agent; the second is the plugin cache copy.
 * Both carry the same binary today, but only the runtime one is guaranteed to
 * track the installed WorkBuddy version.
 * @param {string} home - resolved user profile directory.
 * @returns {string[]} candidate absolute paths, most preferred first.
 */
export function candidateExecutables(home) {
  const bin = ['bin', 'browser-mcp.exe']
  return [
    join(home, '.workbuddy', 'native-runtimes', 'browser-use', 'browser-use', ...bin),
    join(home, '.workbuddy', 'plugins', 'cache', 'workbuddy-browser-use', 'browser-use', '1.2.1', ...bin),
  ]
}

/**
 * Resolve a usable `browser-mcp.exe`. An explicit existing path wins so a user
 * who pointed the config at their own build keeps it.
 * @param {string} configured - the `command` from the patch, possibly `auto`.
 * @param {string} home - resolved user profile directory.
 * @param {(path: string) => boolean} [exists] - existence probe, injectable for tests.
 * @returns {{ command: string, missing: boolean }} the chosen path and whether nothing was found.
 */
export function resolveCommand(configured, home, exists = existsSync) {
  const explicit = typeof configured === 'string' ? configured.trim() : ''
  if (explicit && explicit !== AUTO && exists(explicit)) return { command: explicit, missing: false }
  for (const candidate of candidateExecutables(home)) {
    if (exists(candidate)) return { command: candidate, missing: false }
  }
  return { command: explicit && explicit !== AUTO ? explicit : candidateExecutables(home)[0], missing: true }
}

/**
 * Pick the Native Messaging host name actually present on this machine.
 * @param {string} configured - the `env` value from the patch, possibly `auto`.
 * @param {string} home - resolved user profile directory.
 * @param {(path: string) => boolean} [exists] - existence probe, injectable for tests.
 * @returns {string} a host name, falling back to the domestic one.
 */
export function resolveHostName(configured, home, exists = existsSync) {
  const explicit = typeof configured === 'string' ? configured.trim() : ''
  if (explicit && explicit !== AUTO) return explicit
  const dir = join(home, '.workbuddy', 'browser-runtime', 'native-host')
  for (const name of HOST_NAMES) {
    if (exists(join(dir, `${name}.json`))) return name
  }
  return HOST_NAMES[0]
}

/**
 * The user profile directory, or an empty string when neither variable is set.
 * @param {Record<string, string | undefined>} [env] - environment to read.
 * @returns {string} an absolute directory, or ''.
 */
export function resolveHome(env = process.env) {
  return (env.USERPROFILE || env.HOME || '').trim()
}
