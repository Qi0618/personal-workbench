# Lumen 定制层

本目录存放 Lumen（个人工作台）在 DeepSeek Harness 之上的全部定制。除了少量无法插件化的桌面外壳补丁外，上游代码保持原样。

## 设计原则

- **上游代码尽量不改**。工作台、品牌等功能都以 Cordis 插件或组合包的形式挂载；无法插件化的少数地方（桌面外壳、加载页、图标文件）以「外壳补丁」形式改动，见下表。
- **跟进上游只需 merge**。`git merge upstream/master` 产生的冲突应只出现在桌面外壳补丁上。
- **一个功能一个包**。每个包都按上游规范接入构建（`package.json`、`tsconfig.json`、README）。

## 计划中的包

| 目录 | 包名 | 职责 | 迁移步骤 |
|---|---|---|---|
| `workbench-host/` | `@lumen/workbench-host` | 项目文件、写入审阅、AIPM 接口路由（服务端插件） | 第 1 步 ✅ |
| `workbench-ui/` | `@lumen/workbench-ui` | 全部项目页、项目主页、左栏项目导航、写入确认卡片和右栏「待确认」（客户端插件，通过插槽挂载） | 第 2 步 ✅ |
| `brand/` | `@lumen/brand` | 侧栏与空白对话页的 Lumen 标志和名称、靛蓝主色（客户端插件）；`scripts/render-brand-assets.ts` 生成所有替换上游的图标文件 | 第 3 步 ✅ |
| `bundle/` | `@lumen/bundle` | 把以上插件组装成组合包，叠加在上游 web 配置之上；同时关掉鲸鱼背景、「预览版说明」弹窗和客户端热重载（见 `cordis.patch.yml`） | 第 4 步 ✅（网页版） |

包会在对应步骤有代码时再创建，避免空包触发构建检查失败。

## Git 约定

| remote | 指向 | 用途 |
|---|---|---|
| `upstream` | `deepseek-ai/deepseek-harness` | 底层框架，定期 merge |
| `fork` | `Qi0618/personal-workbench` | 本项目的 GitHub 仓库，`main` 即 `lumen/main` |

- 工作分支是 `lumen/main`，从 `upstream/master` 拉出。
- 旧版 `main` 已被新版替换，本地保留为标签 `legacy-main`。旧版基于 `dsh-v0.2.1-alpha.1`，查看旧改动用 `git diff dsh-v0.2.1-alpha.1 legacy-main -- <路径>`。

## 改动过的上游文件

merge 上游时只有这些文件可能冲突。每处都只是追加几行，冲突时保留双方内容即可。

| 文件 | 改动 |
|---|---|
| `tsconfig.base.json` | 每个 Lumen 包一条路径别名 |
| `tsconfig.host.json` | 每个 Lumen 服务端包和组合包一条项目引用 |
| `tsconfig.client.json` | 每个 Lumen 客户端包一条项目引用 |
| `.gitignore` | 忽略默认项目目录 `/projects/` |
| `pnpm-lock.yaml` | Lumen 包的依赖段；冲突时重新运行 `pnpm install` 生成 |

### 外壳补丁（第 3 步）

这些改动无法插件化。冲突时保留上游版本，再按「处理方式」重做。

| 文件 | 改动 | 冲突时的处理方式 |
|---|---|---|
| `apps/desktop/src/lumen-brand.ts` | 新文件：把桌面端文案里的产品名替换为 Lumen | 无需处理 |
| `apps/desktop/src/locale.ts` | 字典定义后加一行 `applyLumenName(dictionaries)` | 重新加这一行 |
| `apps/desktop/src/main.ts` | 「关于」面板的 `applicationName` 改为 `LUMEN_PRODUCT_NAME` | 重新改这一处 |
| `apps/desktop/tsconfig.client.json` | `include` 加入 `src/lumen-brand.ts` | 重新加 |
| `packages/client/web/src/boot-page.ts` | 加载页文字 `HARNESS` → `LUMEN` | 重新改这一处 |
| `apps/web/index.html`、`apps/web/public/manifest.webmanifest` | 主屏幕名称、应用名改为 Lumen | 重新改 |
| 图标文件：`apps/web/public/` 的 favicon 与 PNG，`apps/desktop/resources/` 的图标，`apps/desktop/renderer/assets/welcome-brand.svg`，`apps/desktop/installer/assets/` | Lumen 标志 | 依次运行：`pnpm --filter @lumen/brand render-assets`、`pnpm --filter @deepseek-ai/dsh-desktop render:tray-icon`、`pnpm --filter @deepseek-ai/dsh-web-frontend render:app-icons` |
| 上游测试：`apps/desktop/tests/` 中的 `background-notice`、`quit-confirmation`、`tray`、`main-startup` 和 `expected/` 下的快照，`packages/client/web/tests/boot-page.client.spec.ts`，`apps/web/tests/pwa-manifest.e2e.ts`（另含 favicon 颜色） | 期望值中的产品名改为 Lumen | 重新替换产品名；快照用 `vitest run -u` 更新 |

浏览器标签页标题来自构建变量 `DSH_CLIENT_TITLE`，用 `pnpm --filter @lumen/bundle build:app` 构建即可带上。

## 构建与启动

```sh
pnpm --filter @lumen/bundle build:app      # 完整构建，标签页标题为 Lumen
packages/lumen/bundle/scripts/web.sh --host 127.0.0.1 --port 3081
```

`web.sh` 第一次运行时在 `$DSH_HOME/profiles/lumen` 建一个配置：以上游 web 配置为模板，再用 `dsh plugin add` 链接本仓库的 `@lumen/bundle`；之后直接启动它。会话和设置存放在 `$DSH_HOME` 下，与上游 web 配置共用。外层的 `启动DSH.command` 调用的就是这个脚本。

- 项目目录：`LUMEN_PROJECT_ROOT`（旧变量 `SIMIN_PROJECT_ROOT` 仍有效）；不设置时放在仓库内的 `projects/`。
- 配置名：`LUMEN_PROFILE`，默认 `lumen`。
- 本机构建原生模块时如遇 `libSystem.B.tbd: unknown architecture`，设置 `SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.5.sdk` 再构建。
- 「预览版说明」弹窗由组合包标记为已读。上游更新弹窗版本时 `bundle/tests/bundle.spec.ts` 会失败，届时把 `cordis.patch.yml` 中的版本号改成新值。

## 运行环境

需要 Node ≥ 24.9。工具链放在仓库外层的 `.toolchain/node-v24.22.2-darwin-arm64/` 中。

迁移进度见 [MIGRATION.zh.md](MIGRATION.zh.md)。
