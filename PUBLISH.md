# 发布 dsh-workbuddy-browser

本目录已完成上架所需的全部准备。发布需要你的 GitHub / npm 凭据，我无法代为登录，
所以最后三步留给你执行。下面每条命令都可直接粘贴。

## 0. 前置检查

```sh
node --version          # 需要 >= 18
git config user.name    # 应为 senyou
```

## 1. 建 GitHub 仓库并推送

在 <https://github.com/new> 创建 **`senyou/dsh-workbuddy-browser`**（public，不要勾选任何
模板或 README —— 本地已有内容）。

```sh
cd D:/temp/dsh-workbuddy-browser
git remote add origin https://github.com/senyou/dsh-workbuddy-browser.git
git branch -M main
git push -u origin main
```

## 2. 加 `dsh-plugin` topic（CI 硬性检查）

仓库页 → 右上齿轮 **About** → **Topics** 填 `dsh-plugin` → Save。
或用 CLI：

```sh
gh repo edit senyou/dsh-workbuddy-browser --add-topic dsh-plugin --description "Drive your own logged-in Chrome or Edge through the WorkBuddy browser extension, as 32 MCP tools in DeepSeek Harness."
```

## 3. 发布到 npm

```sh
npm login
cd D:/temp/dsh-workbuddy-browser
npm publish --access public
```

发布后**必须验产物**，不能只看 `+ pkg@ver` 那一行（官方贡献指南明确警告过）：

```sh
npm view dsh-workbuddy-browser dist-tags.latest     # 应等于 1.2.0
npm view dsh-workbuddy-browser dist.tarball         # 该 URL 必须能下载
```

若 `latest` 指向 `0.0.0-stage` 占位包，把同一版本再发一次；若是国内镜像滞后：

```sh
curl -X PUT https://registry.npmmirror.com/dsh-workbuddy-browser/sync
```

## 4. 提交到市场收录列表

市场（dsh-market / DSH 插件页）只安装 `awesome-dsh-plugin` 收录的来源，所以要在那个仓库提 PR。

```sh
gh repo fork awesome-dsh-plugin/awesome-dsh-plugin --clone
cd awesome-dsh-plugin
cp D:/temp/dsh-workbuddy-browser/market-entry/senyou__dsh-workbuddy-browser.yml data/plugins/
npm ci && node scripts/generate-readme.mjs     # 本地校验，出错会非零退出
git checkout -b add-workbuddy-browser
git add data/plugins/senyou__dsh-workbuddy-browser.yml
git commit -m "Add senyou/dsh-workbuddy-browser"
git push -u origin add-workbuddy-browser
gh pr create --title "Add senyou/dsh-workbuddy-browser" --body "Browser control for DSH through the WorkBuddy browser extension: 32 MCP tools that drive your own logged-in Chrome or Edge."
```

条目文件已经按 CI 规则校验过：文件名 slug 与 `url` 一致、`category: browser` 合法、
`description.en` 单行且以句号结尾、`icon` 是 GitHub 托管的 PNG。

**注意两条会拖时间的规则：**

- 仓库必须**创建满 1 天**，CI 才放行。今天建仓、今天提 PR 会被拦；隔天重提不影响任何评价。
- 一个 PR 最多 3 条，你只有 1 条，不涉及。

## 发布前已经验证过的事

| 项目 | 结果 |
|---|---|
| `dsh plugin --profile <新profile> add <tgz>` | 成功，bundle 自动选入 `dsh.profile.bundles` |
| 干净 profile 启动后插件行 | active，无 `did not activate`、无 import 报错 |
| `browser-mcp.exe` 是否被真实拉起 | 是，路径由 `auto` 解析到 native-runtimes |
| `resolve.js` 单测 | 10/10 |
| `skill.js` 单测（含 frontmatter 剥离、异常降级） | 20/20 |
| `npm pack` 产物 | 18 个文件，含 `skills/workbuddy-browser/SKILL.md` |
| 市场条目 YAML | 通过全部 CI 校验项 |

## 已知但未解决

- **QQ 浏览器**仍写在描述里，但 WorkBuddy 在 win32 只注册 Chrome / Edge / Chromium 三个
  Native Messaging 键，QQ 那条路大概率不通。上架前建议从描述里去掉，或实测后保留。
- **没有真实截图**。`screenshots.json` 我删掉了——生成的线框图不是真实截图，标成
  screenshots 会误导评审。等你有机会在真实工作流里截一张，放进 `assets/` 再声明。
- **`tabs_finalize` 的 handoff 关页行为**沿用历史实测结论，本轮未复测（避免动真实标签页）。
