// Load the bundled skill into the agent's skill catalog.
//
// The bundle ships a `SKILL.md` that turns 32 raw `mcp__workbuddy__*` tools into
// usable browser-driving behaviour: which tool to reach for, which failures are
// the page's fault rather than the tool's, and the one destructive trap that
// looks like cleanup. Registering it from the Host means a fresh install
// behaves like the WorkBuddy app itself instead of handing a stranger 32
// undocumented tools and wishing them luck.
//
// Kept separate from `index.js` so it can be exercised without the MCP client,
// and so a profile without a skill registry simply loses the guidance rather
// than the tools.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Published skill identifier; the registry requires kebab-case. */
export const SKILL_NAME = 'workbuddy-browser'

/**
 * Split a skill file into its frontmatter fields and instruction body.
 *
 * The registry takes `name` and `description` as fields, so the YAML block must
 * not stay in the body — it would otherwise reach the model as literal text.
 * Parsing is deliberately narrow: only the two keys the registry validates are
 * read, and a missing or malformed block degrades to "no description" rather
 * than throwing during activation.
 * @param {string} markdown - the raw `SKILL.md` contents.
 * @returns {{ description: string, content: string }} fields plus the body.
 */
export function parseSkillFile(markdown) {
  const normalized = markdown.replace(/^\uFEFF/, '')
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(normalized)
  if (match === null) return { description: '', content: normalized.trim() }

  const frontmatter = match[1]
  const content = normalized.slice(match[0].length).trim()

  // Take the first `description:` line and unwrap a simple quoted scalar.
  const line = /^description:[ \t]*(.+)$/m.exec(frontmatter)
  let description = line?.[1]?.trim() ?? ''
  if ((description.startsWith('"') && description.endsWith('"'))
    || (description.startsWith("'") && description.endsWith("'"))) {
    description = description.slice(1, -1)
  }

  return { description, content }
}

/**
 * Read and parse the skill shipped beside a plugin module.
 * @param {string} skillDir - the skill directory holding `SKILL.md`.
 * @returns {{ description: string, content: string, path: string } | undefined} `undefined` when unreadable.
 */
export function readSkill(skillDir) {
  const path = join(skillDir, 'SKILL.md')
  let markdown
  try {
    markdown = readFileSync(path, 'utf8')
  } catch {
    return undefined
  }
  return { ...parseSkillFile(markdown), path }
}

/**
 * Register the bundled skill for the lifetime of this plugin instance.
 *
 * A profile without `ctx.skills` keeps working browser tools and only loses the
 * guidance, so the absence of a skill registry is a debug line, not a failure.
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context.
 * @param {string} skillDir - directory holding the shipped `SKILL.md`.
 * @returns {boolean} whether the skill was registered.
 */
export function registerBundledSkill(ctx, skillDir) {
  const skills = typeof ctx?.get === 'function' ? ctx.get('skills') : undefined
  if (skills === undefined || typeof skills.register !== 'function') {
    ctx?.logger?.debug?.('workbuddy-browser: this profile has no skill registry; the bundled skill is skipped')
    return false
  }

  const skill = readSkill(skillDir)
  if (skill === undefined) {
    ctx.logger?.warn?.(`workbuddy-browser: the bundled skill is unreadable at ${skillDir}`)
    return false
  }

  ctx.effect(
    () => skills.register({
      name: SKILL_NAME,
      description: skill.description,
      content: skill.content,
      path: skill.path,
      source: 'bundled',
      resourceBase: { kind: 'directory', path: skillDir },
    }),
    'workbuddy-browser.skill',
  )
  return true
}
