// WorkBuddy Browser Use as an MCP server for DSH.
//
// This bundle does three things beyond inserting a stock MCP client row:
//
// 1. It presents itself in Plugin Manager. A row's title, description and icon
//    come from the *module specifier* named in the patch, so the row names this
//    subpath instead of `@deepseek-ai/dsh-mcp-client`; otherwise users saw a
//    generic "MCP client" row with generic artwork.
// 2. It resolves the two machine-specific transport fields (`command` and
//    `env.BROWSER_NATIVE_HOST_NAME`) before delegating, so the same published
//    tarball works on any Windows machine with WorkBuddy installed.
// 3. It registers the bundled skill, so the guidance that makes these 32 tools
//    usable ships with them rather than depending on the user having copied a
//    file into `~/.dsh/skills`.
//
// Everything else is the client's own `apply`, unchanged.
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as client from '@deepseek-ai/dsh-mcp-client'
import { candidateExecutables, resolveCommand, resolveHome, resolveHostName } from './resolve.js'
import { registerBundledSkill } from './skill.js'

export { Config, inject } from '@deepseek-ai/dsh-mcp-client'

/**
 * Directory holding this bundle's skill, resolved from this module rather than
 * from the process CWD so a linked checkout and an installed tarball behave
 * alike.
 */
const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'workbuddy-browser')

/**
 * Startup guidance shown in the Plugin Manager row when activation cannot
 * proceed. It names the exact click path, because "the extension is missing"
 * without a destination is the failure this plugin previously could not
 * explain.
 * @param {string} detail - the specific problem.
 * @returns {string} a self-contained, actionable diagnostic.
 */
export function unavailable(detail) {
  return [
    `WorkBuddy 浏览器插件无法启动：${detail}`,
    '',
    '请按顺序检查：',
    '1. 安装并运行 WorkBuddy（扩展与本地中继都由它提供）',
    '2. 打开 WorkBuddy → 设置 → 智能体 → 浏览器操控',
    '3. 在目标浏览器旁边点「前往安装」，装好扩展并保持启用',
    '   Chrome  https://chromewebstore.google.com/detail/workbuddy/ajnnogdfpilbhkeggdjlcokgglijmdde',
    '   Edge    https://microsoftedge.microsoft.com/addons/detail/workbuddy/ndbfelmlimfjklodckmbalfioaehegpc',
    '4. 在该浏览器里至少打开一个标签页',
    '5. 回到 DSH 重新开启本插件',
    '',
    '若 WorkBuddy 装在非默认位置，把本插件配置里的 command 设成你自己的',
    'browser-mcp.exe 绝对路径，或把 env.BROWSER_NATIVE_HOST_NAME 设成实际宿主名。',
  ].join('\n')
}

/**
 * Connect the WorkBuddy browser MCP server, after making the machine-specific
 * transport settings concrete.
 *
 * Declared `async` for the same reason the client's own entry point is: Cordis
 * treats a prototype-bearing ordinary function as a constructor, whose returned
 * Promise would not be awaited as startup work.
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context carrying the tool registry.
 * @param {object} config - the row config, with `command`/`env.BROWSER_NATIVE_HOST_NAME` possibly `auto`.
 * @returns {Promise<void>} startup readiness once the connection and first tool sync settle.
 */
export async function apply(ctx, config) {
  const home = resolveHome()
  if (home === '') throw new Error(unavailable('无法确定用户目录（USERPROFILE 与 HOME 都为空）。'))

  const { command, missing } = resolveCommand(config?.command, home)
  if (missing) {
    throw new Error(unavailable(`没有找到 browser-mcp.exe，已尝试：\n  ${candidateExecutables(home).join('\n  ')}`))
  }

  // Register before connecting: a connection failure should still leave the
  // guidance in place, because the guidance is what tells the user how to fix it.
  registerBundledSkill(ctx, SKILL_DIR)

  const env = { ...(config?.env ?? {}) }
  env.BROWSER_NATIVE_HOST_NAME = resolveHostName(env.BROWSER_NATIVE_HOST_NAME, home)

  ctx.logger?.info?.(`workbuddy-browser: ${command} (host ${env.BROWSER_NATIVE_HOST_NAME})`)
  return client.apply(ctx, { ...config, command, env })
}
