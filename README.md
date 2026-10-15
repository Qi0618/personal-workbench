<p align="center">
  <img src="apps/desktop/resources/icon-macos.png" width="96" height="96" alt="Lumen Logo">
</p>

# 个人工作台

**Lumen · 专业、克制的 AI 产品桌面工作台**

围绕项目整理想法、与 AI 讨论、审阅修改，并把结果保存为本地文档。桌面应用使用 Lumen 名称与 C1 光隙 Logo；本仓库提供源码，暂不提供可直接下载的安装包。

本项目基于 [Simin Lab](https://github.com/chusimin/Simin-Lab) 和 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 修改，是独立的社区项目，与上游作者及 DeepSeek 无官方隶属、合作或背书关系。

[使用流程](#使用流程) · [技能地图](#技能地图) · [从源码启动](#从源码启动) · [文件与服务](#文件与服务) · [问题速查](#问题速查) · [开发与来源](#开发与来源)

<a id="why-use-it"></a> <a id="what-you-can-do"></a> <a id="your-first-project"></a>

## 使用流程

1. 新建项目，把目标、背景和已有材料放到同一个工作空间。
2. 与助手讨论问题，补充证据，选用产品方法技能。
3. 在文档中阅读结果，审阅助手提出的修改，再决定是否写入。
4. 保存文档，之后回到项目继续工作。

工作台提供项目与文档导航、正文阅读和助手对话。文档与会话保存在本机；使用模型服务时，相关上下文会发送到你配置的服务商。

<a id="included-skills"></a>

## 技能地图

内置产品工作方法覆盖从问题定义到需求评审的主要环节，可在对话的技能选择器中选用。

| 工作阶段 | 技能 |
|---|---|
| 启动与定义 | [项目启动](.agents/skills/aipm-project-initiation/SKILL.md)、[问题定义](.agents/skills/aipm-problem-definition/SKILL.md) |
| 研究与分析 | [用户研究](.agents/skills/aipm-user-research/SKILL.md)、[用户分层](.agents/skills/aipm-user-segmentation/SKILL.md)、[产品拆解](.agents/skills/aipm-product-teardown/SKILL.md)、[竞品分析](.agents/skills/aipm-competitive-analysis/SKILL.md) |
| 需求与交付 | [需求管理](.agents/skills/aipm-requirements-management/SKILL.md)、[优先级与范围](.agents/skills/aipm-prioritization-scope/SKILL.md)、[用户旅程与协作](.agents/skills/aipm-journey-collaboration/SKILL.md)、[需求文档编写与评审](.agents/skills/aipm-prd-writing-review/SKILL.md) |

[全部技能入口](.agents/skills)。复制到其他兼容助手时，请复制整个技能文件夹及其参考材料。

<a id="run"></a> <a id="run-from-source"></a> <a id="run-the-desktop-app"></a> <a id="启动地图"></a>

## 从源码启动

### 首次安装与启动

准备 Node.js 24+、Corepack 和本机编译工具；macOS 需要 Xcode 命令行工具。仓库固定使用 pnpm 11.7.0，详细前置条件见[开发指南](docs/development.zh.md#前置条件)。

```sh
git clone https://github.com/Qi0618/personal-workbench.git
cd personal-workbench
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @deepseek-ai/dsh-desktop exec install-electron
DSH_DESKTOP_OPEN_DEVTOOLS=0 corepack pnpm run dev:desktop
```

`dev:desktop` 会构建源码、准备桌面运行时并启动应用。首次下载依赖和运行时需要联网，可能耗时较长。使用源码压缩包且没有 Git 历史时，构建前需将 `DSH_CLIENT_COMMIT_HASH` 设为下载源码的版本标识；克隆仓库时自动获取。

进入应用后，在「设置 → 模型与连接 → 打开设置」中配置自己的模型服务与 API Key，默认服务为 DeepSeek。桌面应用负责启动和关闭本地服务；保留一个桌面实例，并按系统提示允许访问所选文件夹。

### 日常打开与开发

已完成构建时，可以跳过源码构建启动：

```sh
DSH_DESKTOP_OPEN_DEVTOOLS=0 corepack pnpm run start:desktop
```

`start:desktop` 仍会准备开发项目并检查运行时，因此会在终端等待。macOS 首次成功启动后，可直接双击生成的 `apps/desktop/.desktop-build/development/Lumen.app`，跳过这段准备流程。该应用依赖当前源码目录、依赖与构建产物；请保留它们，可以为应用创建桌面替身。

修改源码后，重新运行 `dev:desktop` 构建并启动。仅构建、不启动时使用：

```sh
corepack pnpm run build
corepack pnpm run build:desktop
```

其他平台开发、调试和正式打包要求见[桌面端文档](apps/desktop/README.zh.md)。本仓库中的开发应用不等同于独立分发的签名安装包。

<a id="files-and-data"></a>

## 文件与服务

| 保存什么 | 默认位置 |
|---|---|
| 项目文档 | `projects/项目名/文档名.md` 或 `.txt` |
| 技能与参考材料 | `.agents/skills/` |
| 源码开发时的会话、设置与凭据 | `apps/desktop/.desktop-build/development/home/` |
| Electron 开发浏览器数据 | `apps/desktop/.desktop-build/development/electron-user-data/` |

启动前可用 `SIMIN_PROJECT_ROOT` 指定其他可写的项目根目录，建议使用绝对路径。备份时同时保存项目文档与桌面数据；模型服务的数据处理规则以你选择的服务商为准。

公开仓库不包含个人项目、会话、API Key、运行时缓存或构建产物。使用者需自行安装依赖、构建并配置凭据；请勿把自己的 `.env`、开发数据目录或日志提交到仓库。

## 问题速查

| 遇到的问题 | 处理方式 |
|---|---|
| 提示缺少构建产物 | 运行 `corepack pnpm run dev:desktop`，完成构建后再启动。 |
| 提示 Electron 未安装 | 运行 `corepack pnpm --filter @deepseek-ai/dsh-desktop exec install-electron`，然后重试。 |
| 终端启动等待较久 | 首次启动需要下载并准备运行时；macOS 日常使用可双击生成的 `Lumen.app`。 |
| 无法读取所选文件夹 | 检查系统权限提示和文件夹访问权限。 |
| 模型请求失败 | 在模型设置中检查 API Key、服务地址、网络与账户额度。 |

<a id="development"></a> <a id="credits-and-license"></a>

## 开发与来源

本仓库在上游的桌面外壳、工作台、助手能力与产品技能基础上，调整 Lumen 品牌名称、Logo 和相关界面资源。保留部分 `simin`、`dsh` 及 `@deepseek-ai` 内部标识，以兼容现有代码与数据；这些标识不表示官方归属。

- [Simin Lab](https://github.com/chusimin/Simin-Lab)：本项目直接修改的上游项目。
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)：底层助手框架与桌面基础。
- [Heroicons](https://github.com/tailwindlabs/heroicons)：部分界面图标来源。
- [MIT 许可证](LICENSE)：保留 DeepSeek 与 Simin Chu 的原版权声明。
- [第三方许可](THIRD_PARTY_NOTICES.md) · [执行安全说明](SAFETY.zh.md) · [反馈问题](https://github.com/Qi0618/personal-workbench/issues)。

<details>
<summary>开发入口与上游图文参考</summary>

[工作约定](AGENTS.md) · [架构说明](docs/architecture.zh.md) · [开发指南](docs/development.zh.md)

[界面与交互](packages/client/ui-layout/src/client/SiminShell.tsx) · [工作区与会话恢复](packages/client/ui-workspace/src/client/index.ts) · [本机接口](packages/bundle/web-app/src/aipm-products.ts) · [文档管理](packages/bundle/web-app/src/simin-files.ts) · [写入审阅](packages/bundle/web-app/src/simin-proposals.ts) · [桌面外壳](apps/desktop)

仓库保留的以下图文使用上游 Simin 品牌或示例数据，可用于了解工作流程，不代表当前 Lumen 界面的截图。

[产品概览](docs/assets/readme/01-overview.png) · [工作流程](docs/assets/readme/02-workflow.png) · [界面示意](docs/assets/readme/03-workspace.png) · [技能地图](docs/assets/readme/04-skills.png) · [启动说明](docs/assets/readme/05-start.png) · [数据地图](docs/assets/readme/06-data.png) · [常见问题](docs/assets/readme/07-help.png) · [架构与来源](docs/assets/readme/08-development.png)

[设计原型](prototypes/simin-v2/README.zh.md)使用示例数据；桌面应用读取真实文件。仓库保留上游构建与发布工具，相关服务和签名配置需由维护者自行准备。

</details>
