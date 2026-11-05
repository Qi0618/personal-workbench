# Lumen 定制层

本目录存放 Lumen（个人工作台）在 DeepSeek Harness 之上的全部定制。除了少量无法插件化的桌面外壳补丁外，上游代码保持原样。

## 设计原则

- **上游代码不改**。工作台、品牌等功能都以 Cordis 插件或组合包的形式挂载。
- **跟进上游只需 merge**。`git merge upstream/master` 产生的冲突应只出现在桌面外壳补丁上。
- **一个功能一个包**。每个包都按上游规范接入构建（`package.json`、`tsconfig.json`、README）。

## 计划中的包

| 目录 | 包名 | 职责 | 迁移步骤 |
|---|---|---|---|
| `workbench-host/` | `@lumen/workbench-host` | 项目文件、写入审阅、AIPM 接口路由（服务端插件） | 第 1 步 |
| `workbench-ui/` | `@lumen/workbench-ui` | SiminShell、产品侧栏、阶段面板、新建项目对话框（客户端插件，通过插槽挂载） | 第 2 步 |
| `brand/` | `@lumen/brand` | Lumen 名称、Logo、欢迎页文案 | 第 3 步 |
| `bundle/` | `@lumen/bundle` | 把以上插件组装成组合包，作为 desktop profile 的默认组合包 | 第 4 步 |

包会在对应步骤有代码时再创建，避免空包触发构建检查失败。

## Git 约定

| remote | 指向 | 用途 |
|---|---|---|
| `upstream` | `deepseek-ai/deepseek-harness` | 底层框架，定期 merge |
| `fork` | `Qi0618/personal-workbench` | 旧版代码，只作为迁移参考 |

- 工作分支是 `lumen/main`，从 `upstream/master` 拉出。
- 旧版基于 `dsh-v0.2.1-alpha.1`，查看旧改动用 `git diff dsh-v0.2.1-alpha.1 fork/main -- <路径>`。

## 改动过的上游文件

merge 上游时只有这些文件可能冲突。每处都只是追加几行，冲突时保留双方内容即可。

| 文件 | 改动 |
|---|---|
| `tsconfig.base.json` | 每个 Lumen 包一条路径别名 |
| `tsconfig.host.json` | 每个 Lumen 服务端包一条项目引用 |
| `.gitignore` | 忽略默认项目目录 `/projects/` |
| `pnpm-lock.yaml` | Lumen 包的依赖段；冲突时重新运行 `pnpm install` 生成 |

## 本地试运行

在组合包（第 4 步）完成之前，用开发 patch 挂载已迁移的插件：

```sh
LUMEN_PROJECT_ROOT=~/某个项目目录 pnpm dsh --profile web --patch packages/lumen/dev/workbench.patch.yml
```

不设置 `LUMEN_PROJECT_ROOT` 时，项目放在仓库内的 `projects/` 目录；旧变量 `SIMIN_PROJECT_ROOT` 仍然有效。

## 运行环境

需要 Node ≥ 24.9。工具链放在仓库外层的 `.toolchain/node-v24.22.2-darwin-arm64/` 中。

迁移进度见 [MIGRATION.zh.md](MIGRATION.zh.md)。
