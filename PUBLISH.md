# 发布记录

本文件记录已经完成的操作和当前状态。全部用真实凭据执行，可回查。

## 已完成

| 步骤 | 结果 |
|---|---|
| GitHub 仓库 | <https://github.com/github-yousen/dsh-workbuddy-browser> 已创建并推送 |
| `dsh-plugin` topic | 已添加（连同 `dsh-bundle` / `deepseek-harness` / `browser-automation` / `workbuddy` / `mcp`） |
| Release v1.2.0 | 已发布，产物 `dsh-workbuddy-browser-1.2.0.tgz`（20,896 bytes）已上传 |
| 市场 PR | <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/18934> 已开 |

## 安装方式（均已实测）

**Release tarball**（推荐，预构建，免构建授权）：

```sh
dsh plugin --profile web add https://github.com/github-yousen/dsh-workbuddy-browser/releases/download/v1.2.0/dsh-workbuddy-browser-1.2.0.tgz
```

**源码**（市场与 `install` 字段用的就是这条）：

```sh
dsh plugin --profile web add github:github-yousen/dsh-workbuddy-browser
```

两条都在全新 profile 里装过，插件行均正常激活，`browser-mcp.exe` 被真实拉起，
`skills/workbuddy-browser/SKILL.md` 到位，无 `did not activate`、无 import 报错。

## 为什么没有 npm 包

`npm whoami` 返回 `ENEEDAUTH`，本机没配置 registry.npmjs.org 的凭据（只有腾讯镜像的
registry 设置，没有 auth token）。npm 发布**不是收录的必要条件** —— 官方指南明确写了
「listing is unaffected either way」，没有 npm 包只是少了下载量数字。

如果之后想补，务必先 `npm login`，发布后按指南验证产物：

```sh
npm view dsh-workbuddy-browser dist-tags.latest     # 必须等于 1.2.0
npm view dsh-workbuddy-browser dist.tarball         # 该 URL 必须能下载
```

新包名首次发布有已知的 `0.0.0-stage` 占位坑，`npm publish` 打印 `+ pkg@ver` 不代表能装。

## PR 当前状态

CI 第 5–16 步全部 success（`dsh.bundle` 校验、stale-fork、README 一致性、awesome-lint、
各回归测试）。只有第 17 步 `Build` 仍在跑——提交时该仓库有 **156 个** in_progress 的
workflow 在排队，所以慢是队列造成的，不是这次提交的问题。

**已知会拦一次**：收录要求仓库创建满 1 天，而仓库是 2026-11-26 建的。按官方说明，
被这条挡住不是拒绝，「gate 结论是快照，过期的会自动重跑」，隔天无需做任何操作即可达标。
如果 CI 报这条，等满 24 小时就行，或者直接关掉这个 PR 明天重开。

## 仍需你决定的两件事

1. **QQ 浏览器**：描述里已改为「未验证，只承诺 Chrome 与 Edge」。WorkBuddy 在 win32 只
   注册 Chrome / Edge / Chromium 三个 Native Messaging 键。若你实测 QQ 能用，告诉我改回。
2. **真实截图**：`screenshots.json` 我删掉了。生成的线框图不是真实截图，标成 screenshots
   会误导评审。你在真实工作流里截一张放进 `assets/`，再加回 `screenshots.json` 即可，
   不用再提 PR——市场下次构建自动生效。
