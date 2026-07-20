# Comrade Assistant - 多服务商 AI 支持

## 概述

将原本仅支持 DeepSeek + Qwen 的单一模型架构重构为**可扩展的多服务商抽象层**，新增 OpenAI、Anthropic (Claude)、Google Gemini 支持。用户可在前端自由切换服务商和模型，所有 API Key 支持 `.env` 环境变量或前端手动输入。

---

## 架构

```
用户输入 → Fastify Server
              │
              ├─ Provider Router (provider 参数)
              │    │
              │    ├─ OpenAI-compatible (DeepSeek / OpenAI / ...)
              │    │   └─ OpenAI SDK (streaming + retry)
              │    │
              │    └─ Anthropic (原生)
              │        └─ @anthropic-ai/sdk (streaming adapter)
              │
              └─ Provider Registry
                   └─ 模型列表 / 价格 / 特性 / 环境变量映射
```

---

## 支持的服务商

| 服务商 | 模型 | 类型 | 推理能力 |
|--------|------|------|----------|
| DeepSeek | V4 Pro, V4 Flash, Chat | OpenAI-compatible | V4 Pro 深度思考 |
| OpenAI | GPT-4.1, GPT-4o, GPT-4o Mini, o3, o4-mini | OpenAI-compatible | o3/o4-mini |
| Anthropic | Claude Sonnet 4, Opus 4, 3.5 Sonnet, 3.5 Haiku | Native SDK | Sonnet/Opus 4 extended thinking |
| Google Gemini | Gemini 2.5 Pro, 2.5 Flash, 2.0 Flash | OpenAI-compatible (Google AI Studio) | — |
| Qwen (视觉) | VL Plus, VL Max | DashScope REST | 图片描述提取 |

---

## 文件清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `server/src/services/providers/types.ts` | 核心类型定义：`ProviderId`, `ProviderInfo`, `ModelInfo`, `ChatMessage`, `ChatOptions`, `StreamChunkCallback` |
| `server/src/services/providers/registry.ts` | 服务商注册表：DeepSeek/OpenAI/Anthropic 的完整元信息（模型、价格、环境变量名），以及 `getProvider()` / `getModelPricing()` / `isThinkingModel()` 工具函数 |
| `server/src/services/providers/openai-compatible.ts` | OpenAI SDK 通用流式客户端：支持任意 OpenAI-compatible 服务商，含 Token 滑动窗口截断、指数退避重试 |
| `server/src/services/providers/anthropic.ts` | Anthropic 原生 SDK 流式适配器：将 Anthropic 的 `message_start` / `content_block_delta` / `message_delta` 事件映射为统一 `StreamChunk` 格式，支持 extended thinking |
| `server/src/services/providers/index.ts` | 统一入口：`streamChat()` 根据 provider 类型分派到 OpenAI-compatible 或 Anthropic；`getProviderApiKey()` 优先读环境变量 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `server/src/routes/chat.ts` | 新增 `provider` 参数，使用 `streamChat()` 工厂方法；支持通过 `apiKeys` map 传递多服务商密钥 |
| `server/src/routes/vision.ts` | 推理阶段使用 `streamChat()` 替代硬编码 DeepSeek 调用；支持推理服务商切换 |
| `server/src/routes/config.ts` | `AppConfig` 扩展：`provider` / `apiKeys` / `models` / `openaiApiKey` / `anthropicApiKey` / `openaiModel` / `anthropicModel` |
| `server/src/services/cost.ts` | `CostSummary` 从硬编码 `deepseek`/`qwen` 改为动态 `providers: Record<string, ProviderStats>`（向后兼容旧格式）；通过 registry 查价格 |
| `server/src/services/deepseek.ts` | 保留向后兼容导出（仍被 `generate.ts` 的 `withRetry` 使用），修复 TS 类型转换 |
| `server/src/index.ts` | 新增 `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` 环境变量检测与启动日志；新增 `/api/providers` 端点返回服务商注册表 |
| `server/.env.example` | 文档化 `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` |
| `server/package.json` | 新增依赖 `@anthropic-ai/sdk` |
| `web/src/types/index.ts` | 新增 `ProviderInfo` / `ModelInfo` 类型；`AppConfig` 扩展 provider/keys/models 字段；`Conversation` 增加 `messages`；`CostSummary` 改为动态 |
| `web/src/lib/api.ts` | 新增 `fetchProviders()`；`streamChat()` / `streamVision()` 传递 `provider` 和 `apiKeys` |
| `web/src/hooks/useChat.ts` | 新增 `provider`/`apiKeys`/`models` 参数，`getProviderApiKey()` 和 `getProviderModel()` 解析当前服务商配置 |
| `web/src/components/Sidebar.tsx` | 设置页重构：服务商下拉选择、各服务商 API Key 输入、当前服务商模型选择器；从 `/api/providers` 动态加载可用模型 |
| `web/src/components/ChatArea.tsx` | 顶部显示当前服务商的模型名称 |
| `web/src/components/Dashboard.tsx` | 动态统计卡片和 7 日对比图，根据实际使用的服务商自动生成（不再硬编码 DeepSeek/Qwen） |
| `web/src/components/CostPanel.tsx` | 动态费用卡片，按服务商自动分组展示 |
| `web/src/hooks/useTheme.tsx` | 导出 `Theme` 类型 |

---

## 环境变量

```bash
# .env
DEEPSEEK_API_KEY=sk-xxx     # DeepSeek
OPENAI_API_KEY=sk-xxx       # OpenAI
ANTHROPIC_API_KEY=sk-xxx    # Anthropic (Claude)
GEMINI_API_KEY=sk-xxx       # Google Gemini
QWEN_API_KEY=sk-xxx         # 通义千问 (视觉)
PORT=3090
HOST=0.0.0.0
```

---

## 前端操作

1. 打开侧边栏 → 设置标签页
2. 「服务商选择」下拉切换 DeepSeek / OpenAI / Anthropic
3. 对应输入各服务商的 API Key（`.env` 中配置的优先）
4. 当前服务商的模型下拉选择具体模型
5. Qwen 视觉模型和密钥独立配置（用于图片分析）
6. 点「保存设置」持久化

---

---

## 多图片上传 & PDF 文档分析

### 概述

将原本的单张图片上传扩展为**多图片 + PDF 文档**分析能力。支持同时上传多张图片进行批量视觉分析，以及 PDF 文档的逐页解析与描述。

### 处理流程

```
用户上传 (多图/PDF)
    │
    ├─ 图片 → 直接转为 base64
    │
    └─ PDF → pdfToImages() (pdftocairo 每页渲染为 PNG)
              │
              └─ 多页图片 → 合并统一发送
    │
    ▼
Qwen VL (视觉模型) → 图片描述提取
    │
    ▼
推理模型 (DeepSeek/OpenAI/Anthropic) → 流式回答
```

### 新增文件

| 文件 | 说明 |
|------|------|
| `server/src/services/pdf.ts` | PDF 转图片服务：使用 `pdftocairo` (poppler-utils) 将 PDF 每页渲染为 PNG，支持页数限制和 DPI 配置 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `web/src/types/index.ts` | `ChatMessage.image` (单对象) → `images` (数组) |
| `web/src/lib/api.ts` | `streamVision()` 参数：`imageBase64`/`mimeType` → `images[]` |
| `web/src/hooks/useChat.ts` | `sendMessage()` / 重试逻辑适配多图数组 |
| `web/src/components/ChatArea.tsx` | 多文件上传、PDF 文件支持、拖拽粘贴、多预览卡片（PDF 显示图标）/ 单独删除 |
| `web/src/components/MessageBubble.tsx` | 多图片网格展示、图片弹窗支持多张预览 |
| `server/src/routes/vision.ts` | PDF 解析流水线、自适应 Prompt（单图/多图/PDF）、多图片发送至 Qwen VL |
| `server/src/routes/history.ts` | `ChatMessage.image` → `images` 类型 |
| `Dockerfile` | 新增 `poppler-utils` 依赖（pdftocairo） |
| `.env.example` | 文档化 `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` |

### 功能特性

- **多图片上传**：文件选择器支持多选（Ctrl/Shift），粘贴板支持多张图片
- **PDF 文档分析**：上传 PDF → pdftocairo 按页渲染 → 逐页描述 → 推理模型综合分析
- **PDF 页数限制**：默认最多处理 10 页，可通过 `pdfPagesLimit` 参数自定义
- **自适应 Prompt**：
  - 单张图片：「请详细描述这张图片...」
  - 多张图片：「请详细描述以上所有图片...」
  - PDF 文档：「以上是PDF文档的各页截图，请逐页详细描述...保持内容逻辑连贯性」
- **文件大小限制**：图片 10MB，PDF 20MB

---

## 费用监控修复 & DeepSeek 实时余额查询

### 问题

软件内费用监控显示的金额与实际 DeepSeek API 平台 (https://platform.deepseek.com/usage) 不一致。根本原因有二：

1. **定价过期**：代码中 DeepSeek V4 模型定价与实际官方定价严重不符
2. **未区分 cache hit/miss**：DeepSeek 对 context caching 的 cache hit 和 cache miss 采用不同计费（cache hit ~120倍更便宜），原代码未解析此数据

### 定价修正

| 模型 | 原 input | 新 input | 原 output | 新 output | cache hit |
|------|---------|---------|-----------|-----------|-----------|
| `deepseek-v4-pro` | $0.55 | **$0.435** | $2.19 | **$0.87** | $0.003625 |
| `deepseek-v4-flash` | $0.14 | $0.14 | $0.55 | **$0.28** | $0.0028 |

### Cache Hit/Miss 分级计费

DeepSeek API 返回的 `usage.prompt_tokens_details.cached_tokens` 字段被解析，用于区分缓存命中和未命中的输入 token：

```
cost = cacheMissTokens/1M * inputPrice + cacheHitTokens/1M * cacheHitPrice + outputTokens/1M * outputPrice
```

### DeepSeek 实时余额查询

新增 `/api/balance` 端点，通过 DeepSeek 官方 API `GET /user/balance` 实时查询账户余额：

- 总余额、充值余额、赠送余额
- 账户可用状态
- 监控大盘中实时展示，链接到平台使用详情页

| 新增文件 | 说明 |
|------|------|
| `server/src/services/deepseek-balance.ts` | DeepSeek `GET /user/balance` API 调用服务 |

| 修改文件 | 变更 |
|------|------|
| `server/src/services/providers/types.ts` | `ModelInfo.pricing` 新增 `inputCacheHit?`，`ChatStreamResult` 新增 `cacheHitInputTokens` |
| `server/src/services/providers/registry.ts` | 更新 DeepSeek V4 定价为官方最新数据；`deepseek-chat` 标记为即将下线；`getModelPricing` 返回类型扩展 |
| `server/src/services/providers/openai-compatible.ts` | 解析 `prompt_tokens_details.cached_tokens` 并返回 `cacheHitInputTokens` |
| `server/src/services/providers/anthropic.ts` | `ChatStreamResult` 新增 `cacheHitInputTokens: 0`（暂不支持） |
| `server/src/services/cost.ts` | `calcCost()` 支持 cache hit/miss 分级计费；`recordChatCost()` / `recordVisionCost()` 新增 `cacheHitInputTokens` 参数 |
| `server/src/routes/chat.ts` | 传递 `cacheHitInputTokens` 至成本记录 |
| `server/src/routes/vision.ts` | 传递 `cacheHitInputTokens` 至推理阶段成本记录 |
| `server/src/routes/usage.ts` | 新增 `GET /api/balance` 端点，支持 `api_key` 查询参数和环境变量回退 |
| `web/src/types/index.ts` | 新增 `DeepSeekBalanceInfo` 接口 |
| `web/src/lib/api.ts` | 新增 `fetchBalance(apiKey?)` 函数 |
| `web/src/components/Dashboard.tsx` | 新增 DeepSeek 账户余额卡片（总余额/充值/赠送）、可用状态指示、平台链接 |
| `web/src/App.tsx` | 新增 `deepseekBalance` 状态和 `refreshBalance()` 回调；初始加载和刷新时同步查询余额 |

---

## 运行方式

```bash
# 完整启动
./start.sh

# 停止
./stop.sh
```
