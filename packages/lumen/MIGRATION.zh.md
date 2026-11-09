# 迁移清单

进度：第 0 步 ✅ · 第 1 步 ✅（后端插件 `@lumen/workbench-host`）· 第 2 步 ✅（前端插件 `@lumen/workbench-ui`，按新设计重做）

来源：`git diff dsh-v0.2.1-alpha.1 fork/main`，已排除测试、README 和翻译文件。完成一项勾选一项；如果某项确认不再需要，划掉并注明原因。

## 代码文件

### 后端功能（→ 第 1 步：服务端插件）

- [x] `packages/bundle/web-app/cordis.patch.yml`（修改）：`projectRoot` 已改由 `LUMEN_PROJECT_ROOT` / `SIMIN_PROJECT_ROOT` 传给 `@lumen/workbench-host`；会话搜索开关转到零散修复
- [x] `packages/bundle/web-app/package.json`（修改）：依赖改由 `@lumen/workbench-host` 自己声明
- [x] `packages/bundle/web-app/src/aipm-products.ts`（新增）：→ `workbench-host/src/aipm-products.ts`；去掉了自写的本机校验，改走 `connection.requestRejection`
- [x] `packages/bundle/web-app/src/index.ts`（修改）：挂载逻辑 → `workbench-host/src/index.ts`
- [x] `packages/bundle/web-app/src/simin-files.ts`（新增）：→ `workbench-host/src/simin-files.ts`，未改动
- [x] `packages/bundle/web-app/src/simin-proposals.ts`（新增）：→ `workbench-host/src/simin-proposals.ts`；按当前工作目录判断，拦截名单新增 `pwsh`、`terminal_*`、`create_worktree`
- [x] `packages/bundle/web-app/src/simin-workspaces.ts`（新增）：→ `workbench-host/src/simin-workspaces.ts`，未改动
- [x] `packages/bundle/web-app/tsconfig.json`（修改）：项目引用改由新包自己声明
- [x] `packages/bundle/web-app/tsdown.config.ts`（新增）：不再需要：新包由根目录 tsdown 自动发现

### 前端界面（→ 第 2 步：客户端插件）

第 2 步按新设计（设计稿最终方案）重新实现为 `@lumen/workbench-ui`，没有逐行搬运旧代码。下面这些旧文件的功能已由新插件覆盖，旧代码不再需要：全部项目页、项目主页、左栏项目导航、写入确认（输入框上方卡片 + 右栏「待确认」标签）、新建/导入项目。

- [x] `packages/client/ui-layout/package.json`（修改）
- [x] `packages/client/ui-layout/src/client/AipmStagePanel.module.css`（新增）
- [x] `packages/client/ui-layout/src/client/AipmStagePanel.tsx`（新增）
- [x] `packages/client/ui-layout/src/client/AppFrame.module.css`（修改）
- [x] `packages/client/ui-layout/src/client/AppFrame.tsx`（修改）
- [x] `packages/client/ui-layout/src/client/CreateProjectDialog.module.css`（新增）
- [x] `packages/client/ui-layout/src/client/CreateProjectDialog.tsx`（新增）
- [x] `packages/client/ui-layout/src/client/SiminIcons.tsx`（新增）
- [x] `packages/client/ui-layout/src/client/SiminShell.module.css`（新增）
- [x] `packages/client/ui-layout/src/client/SiminShell.tsx`（新增）
- [x] `packages/client/ui-layout/src/client/aipm-product.ts`（新增）
- [x] `packages/client/ui-layout/src/client/index.ts`（修改）
- [x] `packages/client/ui-layout/src/client/simin-api.ts`（新增）
- [x] `packages/client/ui-layout/src/client/simin-locales.ts`（新增）
- [x] `packages/client/ui-layout/src/client/simin-state.ts`（新增）
- [x] `packages/client/ui-primitives/src/index.ts`（修改）
- [x] `packages/client/ui-primitives/src/locales.ts`（新增）
- [x] `packages/client/ui-settings-general/src/client/SettingsRoot.tsx`（修改）
- [x] `packages/client/ui-sidebar/src/client/AipmProductRail.module.css`（新增）
- [x] `packages/client/ui-sidebar/src/client/AipmProductRail.tsx`（新增）
- [x] `packages/client/ui-sidebar/src/client/SidebarRoot.tsx`（修改）
- [x] `packages/client/ui-sidebar/src/client/aipm-product.ts`（新增）
- [x] `packages/client/ui-workspace/src/client/index.ts`（修改）

旧版对上游对话区、聊天区、文案的样式和品牌改动，归入第 3 步一起处理：

- [ ] `packages/client/locale/src/locales/en.ts`（修改）
- [ ] `packages/client/locale/src/locales/zh.ts`（修改）
- [ ] `packages/client/ui-chat/src/client/chat/ChatView.module.css`（修改）
- [ ] `packages/client/ui-chat/src/client/chat/running-whale@2x.png`（删除）
- [ ] `packages/client/ui-chat/tsdown.config.ts`（修改）
- [ ] `packages/client/ui-conversation/src/client/locales.ts`（修改）
- [ ] `packages/client/ui-conversation/src/client/skeleton/EmptyHero.tsx`（修改）
- [ ] `packages/client/ui-conversation/src/client/skeleton/HeroShell.module.css`（修改）
- [ ] `packages/client/ui-conversation/src/client/skeleton/InputBar.module.css`（修改）
- [ ] `packages/client/ui-settings-account/src/client/locales.ts`（修改）
- [ ] `packages/client/ui-sidebar/src/client/SidebarRoot.module.css`（修改）
- [ ] `packages/client/ui-sidebar/src/client/locales.ts`（修改）

其余：

- [ ] `packages/client/ui-conversation/src/client/input/editor/keymap.ts`（修改）：发送快捷键偏好（Enter / ⌘Enter），新界面尚未提供，待定是否保留
- [ ] `packages/client/ui-renderer/src/client/index.ts`（修改）：应用级崩溃恢复，转到零散修复（第 5 步）核对

新界面尚未实现的旧功能（后续补）：

- [ ] 文档库页（跨项目按名称筛选文档）
- [ ] 模板页（想法 / 事实 / 下一步三个起始模板）
- [ ] 回收站页（恢复、彻底删除）
- [ ] 项目重命名、删除
- [ ] 跨项目与会话的全文搜索
- [ ] 英文界面文案（目前只有中文）
- [ ] 工作台请求排队导致文档读取偏慢（后端 `/aipm/*` 全部串行处理）

### 品牌与桌面外壳（→ 第 3 步）

- [ ] `apps/desktop/installer/assets/brand-2x.png`（修改）
- [ ] `apps/desktop/installer/assets/brand-dark-2x.png`（修改）
- [ ] `apps/desktop/installer/assets/brand-dark.png`（修改）
- [ ] `apps/desktop/installer/assets/brand.png`（修改）
- [ ] `apps/desktop/installer/assets/uninstaller-sidebar.png`（修改）
- [ ] `apps/desktop/renderer/assets/welcome-brand.svg`（修改）
- [ ] `apps/desktop/renderer/welcome.css`（修改）
- [ ] `apps/desktop/resources/icon-macos.png`（修改）
- [ ] `apps/desktop/resources/icon-macos.svg`（修改）
- [ ] `apps/desktop/resources/icon-windows.png`（修改）
- [ ] `apps/desktop/resources/icon-windows.svg`（修改）
- [ ] `apps/desktop/resources/icon.png`（修改）
- [ ] `apps/desktop/resources/icon.svg`（修改）
- [ ] `apps/desktop/resources/lumen-mark.svg`（新增）
- [ ] `apps/desktop/resources/personal-icon-backup/simin-original.icns`（新增）
- [ ] `apps/desktop/resources/simin-avatar.png`（新增）
- [ ] `apps/desktop/resources/simin.icns`（新增）
- [ ] `apps/desktop/resources/simin.svg`（新增）
- [ ] `apps/desktop/resources/tray-windows.ico`（修改）
- [ ] `apps/desktop/scripts/dev.ts`（修改）
- [ ] `apps/desktop/scripts/development-app.ts`（修改）
- [ ] `apps/desktop/scripts/package-simin-local.mjs`（新增）
- [ ] `apps/desktop/scripts/render-lumen-brand.mjs`（新增）
- [ ] `apps/desktop/scripts/render-tray-icon.ts`（修改）
- [ ] `apps/desktop/src/client/WelcomePage.tsx`（修改）
- [ ] `apps/desktop/src/locale.ts`（修改）
- [ ] `apps/desktop/src/main.ts`（修改）
- [ ] `apps/web/index.html`（修改）
- [ ] `apps/web/public/favicon-dark.svg`（修改）
- [ ] `apps/web/public/favicon.svg`（修改）
- [ ] `apps/web/public/manifest.webmanifest`（修改）
- [ ] `apps/web/vite.config.ts`（修改）
- [ ] `packages/client/ui-brand-official/src/client/Brand.tsx`（修改）
- [ ] `packages/client/ui-chat/src/client/chat/RunningWhaleTail.tsx`（修改）
- [ ] `packages/client/ui-primitives/src/AipmMark.tsx`（新增）
- [ ] `packages/client/ui-primitives/src/BrandWordmark.module.css`（新增）
- [ ] `packages/client/ui-primitives/src/BrandWordmark.tsx`（修改）
- [ ] `packages/client/ui-primitives/src/FishLogo.tsx`（修改）
- [ ] `packages/client/ui-settings-account/src/client/OnboardingCreditStep.tsx`（修改）
- [ ] `packages/client/ui-settings-account/src/client/OnboardingWelcomeStep.tsx`（修改）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-recharge-dark.png`（删除）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-recharge-dark.svg`（新增）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-recharge-zh-dark.png`（删除）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-recharge-zh.png`（删除）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-recharge.png`（删除）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-recharge.svg`（新增）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-welcome-dark.png`（删除）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-welcome-dark.svg`（新增）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-welcome-zh-dark.png`（删除）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-welcome-zh.png`（删除）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-welcome.png`（删除）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-welcome.svg`（新增）
- [ ] `packages/client/ui-settings-account/src/client/locales/onboarding.ts`（修改）
- [ ] `packages/client/ui-theme/src/styles/base.css`（修改）
- [ ] `packages/client/ui-theme/src/styles/design-platform.css`（修改）
- [ ] `packages/client/web/src/boot-page.module.css`（修改）
- [ ] `packages/client/web/src/boot-page.ts`（修改）

### 零散修复（→ 第 5 步：逐条核对）

- [ ] `packages/bundle/web-app/cordis.patch.yml` 中的 `session-query-sqlite.openAt`：desktop profile 下首次搜索时才开启会话全文搜索
- [ ] `packages/client/modules/src/index.ts`（修改）：**已确认必要**。在 iCloud 同步的文件夹里，产物的 ctime 会自行变化，上游的客户端热重载会因此反复重载浏览器插件，导致页面崩溃。开发配置暂时关闭了 `client-hmr`，正式修复时移植旧版的“只有 ctime 变化不重载”逻辑，或提交给上游
- [ ] `packages/client/web/src/boot.ts`（修改）
- [ ] `packages/client/web/src/mount.ts`（修改）
- [ ] `packages/extensions/cordis-client-runner/src/client/slot-catalog.ts`（修改）
- [ ] `packages/extensions/tool-cordis/src/api-catalog.ts`（修改）

## 非代码内容

- [ ] `.agents/skills/aipm-*`：10 个产品经理技能，直接复制
- [ ] `docs/` 中 Simin 和 Lumen 相关的说明与图片（39 个文件），按需复制
- [ ] `prototypes/simin-v2/`：设计原型
- [ ] 根目录 `README*`：最后改写为 Lumen 版本
- [ ] `LICENSE`：保留 DeepSeek 与 Simin Chu 的版权声明
- [ ] `snapshots/`：跟随界面改动重新生成，不手工搬
