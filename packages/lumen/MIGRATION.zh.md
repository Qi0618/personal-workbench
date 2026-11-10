# 迁移清单

进度：第 0 步 ✅ · 第 1 步 ✅（后端插件 `@lumen/workbench-host`）· 第 2 步 ✅（前端插件 `@lumen/workbench-ui`，按新设计重做）· 第 3 步 ✅（品牌插件 `@lumen/brand` + 外壳补丁）

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

旧版对上游对话区、聊天区、文案的样式和品牌改动，已在第 3 步处理（品牌统一改用新设计的「光隙」标志和靛蓝主色，不再沿用旧版 C1 标志）：

- [x] `packages/client/locale/src/locales/en.ts`（修改）：不再需要。侧栏名称由 `@lumen/brand` 填入插槽；页面标题在构建时用 `DSH_CLIENT_TITLE=Lumen` 设置
- [x] `packages/client/locale/src/locales/zh.ts`（修改）：同上
- [ ] `packages/client/ui-chat/src/client/chat/ChatView.module.css`（修改）：**未迁移**。回复进行中的鲸鱼动画上游没有插槽，暂保留上游样式
- [ ] `packages/client/ui-chat/src/client/chat/running-whale@2x.png`（删除）：同上
- [ ] `packages/client/ui-chat/tsdown.config.ts`（修改）：同上
- [x] `packages/client/ui-conversation/src/client/locales.ts`（修改）：不迁移。旧版把空白对话页标题改成「上午好 / 下午好」；新设计的问候放在「全部项目」页，空白对话页保留上游标题（上游没有标题插槽）
- [x] `packages/client/ui-conversation/src/client/skeleton/EmptyHero.tsx`（修改）：标志改由 `@lumen/brand` 填入 `conversation.hero.brand.mark` 插槽
- [x] `packages/client/ui-conversation/src/client/skeleton/HeroShell.module.css`（修改）：同上
- [x] `packages/client/ui-conversation/src/client/skeleton/InputBar.module.css`（修改）：发送按钮改为跟随品牌主色（`@lumen/brand` 把上游蓝色色阶换成靛蓝）
- [ ] `packages/client/ui-settings-account/src/client/locales.ts`（修改）：**未迁移**，见下方登录引导页
- [x] `packages/client/ui-sidebar/src/client/SidebarRoot.module.css`（修改）：侧栏标志改由插槽提供，不再需要底色方块
- [x] `packages/client/ui-sidebar/src/client/locales.ts`（修改）：不再需要（旧版侧栏产品栏已由第 2 步的项目导航取代）

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

第 4 步需接上：启动脚本和打包流程构建时要设置 `DSH_CLIENT_TITLE=Lumen`，否则标签页标题仍是上游默认值；正式打包走 `official` 构建配置时，标题会被固定为 DeepSeek Harness，这一点需要在第 4 步一并处理。

- [x] `apps/desktop/installer/assets/brand-2x.png`（修改）：由 `brand/scripts/render-brand-assets.ts` 生成
- [x] `apps/desktop/installer/assets/brand-dark-2x.png`（修改）：同上
- [x] `apps/desktop/installer/assets/brand-dark.png`（修改）：同上
- [x] `apps/desktop/installer/assets/brand.png`（修改）：同上
- [x] `apps/desktop/installer/assets/uninstaller-sidebar.png`（修改）：同上
- [x] `apps/desktop/renderer/assets/welcome-brand.svg`（修改）：同上
- [x] ~~`apps/desktop/renderer/welcome.css`（修改）~~：不迁移：旧版把欢迎页背景改成纯白，保留上游的半透明窗口材质
- [x] `apps/desktop/resources/icon-macos.png`（修改）：同上
- [x] `apps/desktop/resources/icon-macos.svg`（修改）：同上
- [x] `apps/desktop/resources/icon-windows.png`（修改）：同上
- [x] `apps/desktop/resources/icon-windows.svg`（修改）：同上；保留上游的 `tray-glyph` 和滤镜结构，托盘图标与网页安装图标继续用上游脚本生成
- [x] `apps/desktop/resources/icon.png`（修改）：同上
- [x] `apps/desktop/resources/icon.svg`（修改）：同上
- [x] ~~`apps/desktop/resources/lumen-mark.svg`（新增）~~：不再需要：标志几何统一在 `brand/src/mark.ts`
- [x] ~~`apps/desktop/resources/personal-icon-backup/simin-original.icns`（新增）~~：不再需要：个人图标备份
- [x] ~~`apps/desktop/resources/simin-avatar.png`（新增）~~：不再需要：旧版图标素材
- [x] ~~`apps/desktop/resources/simin.icns`（新增）~~：不再需要：旧版开发版应用图标
- [x] ~~`apps/desktop/resources/simin.svg`（新增）~~：不再需要：旧版图标素材
- [x] `apps/desktop/resources/tray-windows.ico`（修改）：用上游 `render:tray-icon` 从新图标生成
- [ ] `apps/desktop/scripts/dev.ts`（修改）：转到第 5 步：其中给开发版传 `DSH_DESKTOP_PRIMARY_RUNTIME_DIR` 的部分属于修复，需核对上游是否已修
- [ ] `apps/desktop/scripts/development-app.ts`（修改）：**未迁移**：桌面开发版的应用名和图标（「Harness Dev」→「Lumen」），只影响 `pnpm dev:desktop`，第 4 步再定
- [ ] `apps/desktop/scripts/package-simin-local.mjs`（新增）：转到第 4 步：本机打包脚本
- [x] `apps/desktop/scripts/render-lumen-brand.mjs`（新增）：由 `brand/scripts/render-brand-assets.ts` 取代
- [x] `apps/desktop/scripts/render-tray-icon.ts`（修改）：不再需要：新图标沿用上游坐标，脚本不用改
- [x] ~~`apps/desktop/src/client/WelcomePage.tsx`（修改）~~：不迁移：旧版隐藏了副标题，保留上游排版
- [x] `apps/desktop/src/locale.ts`（修改）：一行补丁：调用 `src/lumen-brand.ts` 把 8 种语言里的产品名统一替换，不逐条改译文
- [x] `apps/desktop/src/main.ts`（修改）：「关于」面板显示 Lumen；macOS 菜单栏标题由应用包名决定，不改
- [x] `apps/web/index.html`（修改）：主屏幕名称改为 Lumen；页面标题用构建变量 `DSH_CLIENT_TITLE=Lumen`
- [x] `apps/web/public/favicon-dark.svg`（修改）：由 `brand/scripts/render-brand-assets.ts` 生成；PNG 安装图标用上游 `render:app-icons` 生成
- [x] `apps/web/public/favicon.svg`（修改）：同上
- [x] `apps/web/public/manifest.webmanifest`（修改）：名称改为 Lumen
- [x] `apps/web/vite.config.ts`（修改）：不再需要：标题来自 `DSH_CLIENT_TITLE`
- [x] `packages/client/ui-brand-official/src/client/Brand.tsx`（修改）：由 `@lumen/brand` 填入品牌插槽取代；`ui-brand-official`（鲸鱼背景）在 patch 中禁用
- [ ] `packages/client/ui-chat/src/client/chat/RunningWhaleTail.tsx`（修改）：**未迁移**：回复进行中的鲸鱼动画，上游没有插槽
- [x] `packages/client/ui-primitives/src/AipmMark.tsx`（新增）：由 `@lumen/brand` 的 `LumenMark` 取代
- [x] `packages/client/ui-primitives/src/BrandWordmark.module.css`（新增）：同上
- [x] `packages/client/ui-primitives/src/BrandWordmark.tsx`（修改）：同上
- [x] `packages/client/ui-primitives/src/FishLogo.tsx`（修改）：同上
- [ ] `packages/client/ui-settings-account/src/client/OnboardingCreditStep.tsx`（修改）：**未迁移**：登录引导页的插图和文案是 DeepSeek 账号流程，上游没有插槽，暂保留
- [ ] `packages/client/ui-settings-account/src/client/OnboardingWelcomeStep.tsx`（修改）：同上
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-recharge-dark.png`（删除）：同上（登录引导页）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-recharge-dark.svg`（新增）：同上（登录引导页）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-recharge-zh-dark.png`（删除）：同上（登录引导页）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-recharge-zh.png`（删除）：同上（登录引导页）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-recharge.png`（删除）：同上（登录引导页）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-recharge.svg`（新增）：同上（登录引导页）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-welcome-dark.png`（删除）：同上（登录引导页）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-welcome-dark.svg`（新增）：同上（登录引导页）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-welcome-zh-dark.png`（删除）：同上（登录引导页）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-welcome-zh.png`（删除）：同上（登录引导页）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-welcome.png`（删除）：同上（登录引导页）
- [ ] `packages/client/ui-settings-account/src/client/assets/onboarding-welcome.svg`（新增）：同上（登录引导页）
- [ ] `packages/client/ui-settings-account/src/client/locales/onboarding.ts`（修改）：同上
- [x] `packages/client/ui-theme/src/styles/base.css`（修改）：品牌色由 `@lumen/brand/src/client/theme.module.css` 提供
- [x] ~~`packages/client/ui-theme/src/styles/design-platform.css`（修改）~~：不迁移：旧版把侧栏改成纯白，新设计沿用上游侧栏色
- [x] ~~`packages/client/web/src/boot-page.module.css`（修改）~~：不迁移：加载页只改文字，不加标志
- [x] `packages/client/web/src/boot-page.ts`（修改）：一行补丁：加载页文字改为 LUMEN（加载页在插件之前显示，无法插件化）

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
