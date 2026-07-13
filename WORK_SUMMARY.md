# Comrade Assistant - 智能温度/场景分类功能总结

## 概述

实现了基于用户输入文本的**场景自动分类与参数动态调整**功能。系统根据用户提问内容，自动判断所属场景（12 类），并匹配对应的 **temperature（温度）** 和 **system prompt（系统提示词）**，从而优化 DeepSeek API 的回答风格。

同时保留手动模式，用户可通过前端开关自由切换自动/手动控制。

---

## 架构

```
用户输入 → Node.js (Fastify)
              │
              ├─ useAutoDetect = true (默认)
              │    │
              │    ├─ Python 服务 (127.0.0.1:8765)
              │    │   └─ Erlangshen-Roberta-330M-NLI 零样本分类
              │    │       ↓
              │    ├─ 置信度 ≥ 0.3 → 采用模型结果
              │    └─ 置信度 < 0.3 → 关键词规则纠正
              │
              └─ useAutoDetect = false
                   └─ 使用用户手动设置的 temperature + systemPrompt
```

---

## 12 种场景分类

| #   | 场景   | 温度   | 提示词基调             |
| --- | ---- | ---- | ----------------- |
| 1   | 代码编程 | 0.05 | 资深软件工程师，精确、代码正确可用 |
| 2   | 事实知识 | 0.1  | 百科全书助手，准确客观、不虚构   |
| 3   | 翻译   | 0.1  | 专业翻译，忠实准确、直接输出    |
| 4   | 学术科研 | 0.15 | 严谨学术研究者，逻辑严密、有据可查 |
| 5   | 健康医疗 | 0.2  | 负责任健康顾问，循证医学、谨慎建议 |
| 6   | 学习教育 | 0.3  | 耐心导师，通俗易懂、循序渐进    |
| 7   | 分析推理 | 0.4  | 策略分析师，多角度拆解、深度洞察  |
| 8   | 办公效率 | 0.5  | 办公助手，格式规范、直接可用    |
| 9   | 生活饮食 | 0.6  | 热爱生活的朋友，推荐具体、接地气  |
| 10  | 日常闲聊 | 0.7  | 友善聊天伙伴，自然流畅       |
| 11  | 营销文案 | 0.9  | 资深文案，抓眼球、有感染力     |
| 12  | 艺术创意 | 1.2  | 富有灵气的创作者，文笔优美     |

---

## 文件清单

### 新增文件

| 文件                                   | 说明                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| `server/src/services/temperature.ts` | 核心分类逻辑：12 类场景定义、关键词匹配、Python 服务调用、`getTemperature()` / `getTemperatureAndPrompt()` |
| `server/py_service/main.py`          | Python FastAPI 微服务，加载 Erlangshen-Roberta-330M-NLI 做零样本分类                           |
| `server/py_service/requirements.txt` | Python 依赖：transformers, torch, fastapi, uvicorn                                    |

### 修改文件

| 文件                               | 变更                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `server/src/routes/chat.ts`      | 接收 `useAutoDetect` / `temperature` / `systemPrompt` 字段；自动模式调用 `getTemperatureAndPrompt()` 注入匹配的提示词和温度 |
| `server/src/routes/vision.ts`    | 同上，视觉推理阶段使用自动检测温度                                                                                     |
| `server/src/routes/config.ts`    | 新增 `useAutoDetect` / `temperature` / `systemPrompt` 持久化字段                                             |
| `web/src/types/index.ts`         | `AppConfig` 新增 `useAutoDetect` / `temperature` / `systemPrompt`                                       |
| `web/src/App.tsx`                | 状态中恢复温度/提示词字段                                                                                         |
| `web/src/hooks/useChat.ts`       | 向前后端传递 `useAutoDetect` / `temperature` / `systemPrompt`                                               |
| `web/src/lib/api.ts`             | `streamChat()` / `streamVision()` 新增上述字段                                                              |
| `web/src/components/Sidebar.tsx` | 新增「智能分类」切换开关；关闭时显示温度滑杆和提示词输入框                                                                         |
| `start.sh`                       | 新增步骤 6：启动 Python 分类服务（端口 8765）                                                                        |
| `stop.sh`                        | 新增 Python 服务停止逻辑                                                                                      |
| `server/package.json`            | 依赖：`@xenova/transformers`（已弃用，保留以备后续）、`@huggingface/transformers`（已弃用）                                |

### 技术演进历程

| 阶段  | 方案                                             | 结果                        |
| --- | ---------------------------------------------- | ------------------------- |
| 1   | `@xenova/transformers` + DistilBERT            | 英文模型，中文分类接近随机             |
| 2   | `@xenova/transformers` + BART-Large-MNLI       | 英文模型，中文改善有限               |
| 3   | `@huggingface/transformers` (v4) + mDeBERTa-v3 | ONNX 推理中文输出为噪声            |
| 4   | `@xenova/transformers` (v2) + mDeBERTa-v3      | 同上，ONNX 不可靠               |
| 5   | **纯关键词匹配**                                     | ✅ 准确，但依赖关键词覆盖度            |
| 6   | **Python 微服务 + Erlangshen-Roberta-330M-NLI**   | ✅ 当前方案，高置信度采用模型，低置信度关键词兜底 |

### 最终结论

- **ONNX 运行时在 Node.js 中对中文零样本分类不可靠**（经历了 4 轮模型 + 2 个库的验证）
- **Erlangshen-Roberta-330M-NLI** 是专为中文 NLI 训练的 330M 参数模型，在 Python 原生环境推理效果良好
- **混合策略**：模型高置信度时采用模型，低置信度时关键词规则兜底，平衡准确性和鲁棒性

---

## 运行方式

```bash
# 完整启动（前端构建 + Python 服务 + Node.js 服务）
./start.sh

# 停止
./stop.sh

# 单独启动 Python 服务（调试用）
cd server/py_service
HF_ENDPOINT=https://hf-mirror.com python main.py

# 查看日志
tail -f server.log        # Node.js 日志
tail -f py_service.log    # Python 服务日志
```

---

## 前端操作

1. 打开侧边栏 → 设置标签页
2. 「智能分类」开关：
   - **开启**（蓝色）：自动检测场景，温度和提示词自动匹配
   - **关闭**（灰色）：露出温度滑杆（0.0 ~ 2.0）和系统提示词输入框，手动设定
3. 点「保存设置」持久化
