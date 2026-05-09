# Mimo-Humanize

[OpenCode](https://opencode.ai) 的迭代开发插件，使用 [MiMo-V2.5-Pro](https://api.xiaomi.com) 同时实现代码编写和独立审查。通过一个 MiMo Agent 实现计划、另一个 MiMo Agent 独立审查进度的反馈循环，确保持续优化的质量。

**当前版本**: 0.1.0 | **[English](README.md)**

## 安装

将以下内容粘贴到 OpenCode 中，Agent 会自动为你安装：

```
Please install mimo-humanize from https://github.com/liangyu-suli/mimo-humanize
```

或手动运行一行命令：

```bash
git clone https://github.com/liangyu-suli/mimo-humanize.git /tmp/mimo-humanize && /tmp/mimo-humanize/scripts/install.sh --target "$(pwd)" && rm -rf /tmp/mimo-humanize
```

然后 **重启 OpenCode**（必须重新加载插件）。

重启后，输入 `/mimo` 查看所有命令：

```
/mimo-start-rlcr-loop   启动带 MiMo 审查的迭代循环
/mimo-gen-plan          从草稿生成计划
/mimo-gen-idea          通过并行探索生成想法
/mimo-refine-plan       处理审查者的注释
/mimo-cancel-rlcr-loop  取消活跃循环
```

> **前提条件：** 已安装 [OpenCode](https://opencode.ai) + 在 `~/.zshrc` 中设置了 `MIMO_API_KEY`

## 详细安装

### 前提条件

- 已安装 [OpenCode](https://opencode.ai)（`curl -fsSL https://opencode.ai/install | bash`）
- 小米 MiMo-V2.5-Pro API 密钥

### 方法一：Agent 自动安装（推荐）

将以下内容粘贴到 OpenCode 中：

```
Please install mimo-humanize from https://github.com/liangyu-suli/mimo-humanize
```

或直接粘贴命令：

```bash
git clone https://github.com/liangyu-suli/mimo-humanize.git /tmp/mimo-humanize && /tmp/mimo-humanize/scripts/install.sh --target "$(pwd)" && rm -rf /tmp/mimo-humanize
```

### 方法二：手动安装

```bash
# 设置 API 密钥（添加到 ~/.zshrc 或 ~/.bashrc 以持久化）
export MIMO_API_KEY=your-api-key-here

# 克隆并安装
cd /path/to/your/project
git clone https://github.com/liangyu-suli/mimo-humanize.git /tmp/mimo-humanize
/tmp/mimo-humanize/scripts/install.sh
rm -rf /tmp/mimo-humanize
```

安装脚本会将所有插件、Agent、命令、技能和配置复制到项目的 `.opencode/` 目录，并设置 `opencode.json`。

### 安装选项

```bash
# 安装到指定项目
./scripts/install.sh --target ~/my-project

# 全局安装（所有项目可用）
./scripts/install.sh --global

# 预览安装内容（干运行）
./scripts/install.sh --dry-run

# 从项目卸载
./scripts/install.sh --uninstall
```

### 安装后：重启 OpenCode

**必须重启 OpenCode 才能激活插件。** OpenCode 在启动时加载插件和发现命令，不支持热重载。

```bash
# 退出当前 OpenCode 会话（Ctrl+C 或 /exit）
# 然后重启：
opencode
```

重启后，可以通过两种方式访问 mimo-humanize：

**斜杠命令**（在 TUI 中输入 `/mimo`）：
```
/mimo-start-rlcr-loop   启动带 MiMo 审查的迭代循环
/mimo-gen-plan          从草稿生成实现计划
/mimo-gen-idea          通过并行探索生成想法
/mimo-refine-plan       处理计划中的审查注释
/mimo-cancel-rlcr-loop  取消活跃的 RLCR 循环
```

**插件工具**（通过 `@工具名` 或 Agent 调用）：
```
@mimo-start-rlcr-loop   以编程方式启动循环
@mimo-cancel-rlcr-loop  取消循环
@mimo-status            显示当前循环状态
@mimo-review            调用代码审查
```

## 使用方法

### 工作流一：从草稿到实现（完整流程）

最常用的工作流。从粗略想法开始，以经过审查的代码结束。

```
# 第一步：写一份草稿（用 markdown 描述你想要什么）
vim docs/draft.md

# 第二步：从草稿生成结构化计划
/mimo-gen-plan --input docs/draft.md --output docs/plan.md

# 第三步：审查计划，然后启动 RLCR 循环
/mimo-start-rlcr-loop docs/plan.md

# 第四步：处理任务。构建 Agent 会：
#   - 实现计划任务
#   - 编写轮次摘要
#   - 自动被 MiMo 审查
#   - 修复审查反馈中的问题
#   - 重复直到所有验收标准通过

# 第五步：审查者确认完成后循环自动结束
```

### 工作流二：审查现有代码

已经做了修改？无需完整计划即可获得审查。

```bash
/mimo-start-rlcr-loop --skip-impl
```

这会跳过实现阶段，直接进入代码审查。审查者会用 `[P0-9]` 严重性标记检查你当前的修改相对于基础分支的问题。

### 工作流三：快速计划生成

生成计划但不立即开始实现。

```
/mimo-gen-plan --input docs/draft.md --output docs/plan.md --direct
```

`--direct` 标志跳过构建和审查 Agent 之间的收敛循环，更快生成计划（但不够精细）。

### 工作流四：想法探索

不确定如何解决问题？使用定向群体探索。

```
/mimo-gen-idea 如何处理用户认证？
```

这会启动多个并行的探索 Agent，每个从不同角度调查，然后呈现选项供你选择。

## 命令参考

| 命令 | 描述 |
|------|------|
| `/mimo-start-rlcr-loop [plan.md]` | 启动带 MiMo 审查的迭代循环 |
| `/mimo-gen-plan --input X --output Y` | 从草稿生成实现计划 |
| `/mimo-gen-idea <topic>` | 通过并行探索生成想法 |
| `/mimo-refine-plan <plan.md>` | 处理计划中的审查注释 |
| `/mimo-cancel-rlcr-loop` | 取消活跃循环 |

### start-rlcr-loop 标志

| 标志 | 描述 |
|------|------|
| `--max N` | 最大审查迭代次数（默认：42） |
| `--full-review-round N` | 全面对齐检查间隔（默认：5） |
| `--skip-impl` | 跳过实现，直接进入代码审查 |
| `--skip-quiz` | 跳过计划理解测验 |
| `--yolo` | 跳过所有预检查 |
| `--privacy` | 启用隐私模式（默认） |

### gen-plan 标志

| 标志 | 描述 |
|------|------|
| `--input <path>` | 输入草稿文件（必填） |
| `--output <path>` | 输出计划文件（必填） |
| `--discussion` | 迭代收敛（默认） |
| `--direct` | 跳过收敛，直接生成 |
| `--auto-start-rlcr-if-converged` | 计划收敛时自动启动循环 |

## 工作原理

### RLCR 循环

```
你: /mimo-start-rlcr-loop plan.md
         |
         v
  [计划理解测验]
  （验证你已阅读计划）
         |
         v
  [构建 Agent 实现任务]
  （coding 任务 -> 直接执行，analyze 任务 -> 审查者）
         |
         v
  [构建 Agent 编写 round-N-summary.md]
         |
         v
  [会话空闲 -> 插件拦截]
         |
         v
  [审查 Agent 检查摘要]
         |
         +---> 发现问题：反馈 -> 构建 Agent 继续
         |
         +---> COMPLETE：进入代码审查阶段
                   |
                   v
              [审查者检查 git diff]
              [P0-9] 严重性标记
                   |
                   +---> 问题：构建 Agent 修复 -> 重新审查
                   |
                   +---> 无问题：循环结束
```

### 双 Agent 架构

两个 Agent 都使用 MiMo-V2.5-Pro，但系统提示和权限不同：

| Agent | 角色 | 可编辑？ | 可运行 Bash？ |
|-------|------|---------|--------------|
| **Build**（mimo-build） | 实现计划任务 | 是 | 是 |
| **Reviewer**（mimo-reviewer） | 审查工作质量 | 否 | 仅 Git/读取 |

这创造了功能多样性：审查者没有动机"批准自己的工作"，因为它使用完全不同的指令和权限集。

### 目标追踪系统

每个循环维护一个 `goal-tracker.md`，包含两个部分：

**不可变**（在第 0 轮设置，永不更改）：
- 终极目标
- 验收标准（AC-1, AC-2, ...）

**可变**（每轮更新）：
- 活跃任务
- 已完成项目
- 延期项目
- 计划演进日志

这防止了目标漂移——构建 Agent 不能"忘记"它应该做什么。

### BitLesson 知识捕获

每个项目维护 `.mimo-humanize/bitlesson.md`——一个记录遇到的问题和找到的解决方案的知识库。在每个任务之前，bitlesson-selector Agent 选择相关条目。随着时间推移，这可以防止重复过去的错误。

## 配置

### API 密钥

API 密钥从 `MIMO_API_KEY` 环境变量读取。在 shell 配置文件中设置：

```bash
# ~/.zshrc 或 ~/.bashrc
export MIMO_API_KEY=your-api-key-here
```

`opencode.json` 中引用为 `"{env:MIMO_API_KEY}"`。

### 提供商配置

位于项目根目录的 `opencode.json`：

```json
{
  "provider": {
    "xiaomi": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Xiaomi MiMo",
      "options": {
        "baseURL": "https://token-plan-sgp.xiaomimimo.com/v1",
        "apiKey": "{env:MIMO_API_KEY}"
      },
      "models": {
        "mimo-v2.5-pro": {
          "name": "MiMo-V2.5-Pro",
          "limit": { "context": 128000, "output": 32768 }
        }
      }
    }
  }
}
```

### Humanize 配置

三层配置（优先级从低到高）：

1. **插件默认值**：`config/default_config.json`
2. **用户配置**：`~/.config/mimo-humanize/config.json`
3. **项目配置**：`.mimo-humanize/config.json`

可用选项：

```json
{
  "max_iterations": 42,
  "full_review_round": 5,
  "bitlesson_model": "mimo-v2.5-pro",
  "agent_teams": false,
  "gen_plan_mode": "discussion",
  "alternative_plan_language": ""
}
```

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `max_iterations` | 42 | 强制停止前的最大审查轮数 |
| `full_review_round` | 5 | 每 N 轮进行全面对齐检查（第 4, 9, 14... 轮） |
| `bitlesson_model` | mimo-v2.5-pro | BitLesson 选择使用的模型 |
| `agent_teams` | false | 启用并行 Agent 团队 |
| `gen_plan_mode` | discussion | 计划生成模式：`discussion` 或 `direct` |
| `alternative_plan_language` | "" | 生成翻译计划变体（如 "Chinese", "Korean"） |

## 运行时文件

循环期间，插件会创建：

```
.mimo-humanize/
  rlcr/<timestamp>/
    state.md                     # 循环状态（YAML 前置数据）
    goal-tracker.md              # 目标追踪
    plan.md                      # 计划备份
    round-0-prompt.md            # 初始提示
    round-0-summary.md           # 第一轮摘要
    round-0-review-result.md     # 第一轮审查结果
    round-1-summary.md           # 第二轮摘要
    ...
    finalize-state.md            # 结束阶段状态
    complete-state.md            # 终态
  bitlesson.md                   # 知识库
  config.json                    # 项目配置覆盖
```

## 故障排除

### 安装后命令未显示

安装后必须重启 OpenCode。OpenCode 在启动时加载插件和命令，不支持热重载。

```bash
# 退出 OpenCode，然后：
opencode
```

### "No active RLCR loop found"

插件在 `.mimo-humanize/rlcr/` 中找不到 `state.md`。确保你用 `/mimo-start-rlcr-loop` 启动了循环。

### API 密钥未找到

验证环境变量是否已设置：

```bash
echo $MIMO_API_KEY
```

如果为空，在 shell 配置文件中添加 `export MIMO_API_KEY=your-key` 并重启终端。

### /models 中模型不可用

检查 `opencode.json` 中的提供商配置是否正确，以及你的 API 密钥是否有 MiMo-V2.5-Pro 的访问权限。

### 循环卡在审查中

如果审查者不断发现问题且循环无法结束：

1. 检查 `.mimo-humanize/rlcr/<timestamp>/round-N-review-result.md` 中的审查结果
2. 解决问题或判断为可接受
3. 使用 `/mimo-cancel-rlcr-loop` 强制停止

## 与 Humanize 的关系

本项目是 [PolyArch/humanize](https://github.com/PolyArch/humanize) 适配 OpenCode 的移植版本：

| Humanize (Claude Code) | Mimo-Humanize (OpenCode) |
|------------------------|--------------------------|
| Claude (Anthropic) | MiMo-V2.5-Pro (Xiaomi) |
| OpenAI Codex | MiMo-V2.5-Pro (Xiaomi) |
| Bash hooks (.sh) | TypeScript 插件 (.ts) |
| `.humanize/` 运行时 | `.mimo-humanize/` 运行时 |
| `CLAUDE.md` 项目规则 | `AGENTS.md` 项目规则 |

## 致谢

本项目离不开 **PolyArch** 的 [PolyArch/humanize](https://github.com/PolyArch/humanize)。原始 Humanize 插件为 Claude Code 引入了 RLCR（强化学习与代码审查）循环概念，创建了一个 AI Agent 实现代码、另一个独立审查的反馈循环。

Mimo-Humanize 是该架构到 OpenCode 的忠实移植，适配了核心概念：
- 双 Agent 审查循环
- 防止漂移的目标追踪
- BitLesson 知识捕获
- 带收敛的计划生成
- 完整的命令/技能/Agent 系统

RLCR 方法论、循环设计和迭代开发工作流的所有功劳归于原始 Humanize 项目。我们感谢 PolyArch 在 MIT 许可下开源了这项工作。

**原始仓库：** https://github.com/PolyArch/humanize

## 许可证

MIT
