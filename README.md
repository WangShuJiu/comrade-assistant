# Comrade Assistant

基于 **DeepSeek V4 Pro** 深度思考引擎与 **Qwen 多模态模型** 的高性能 AI 编程助手。商业级全栈架构，支持 Markdown/KaTeX 渲染、视觉级联推理、AI 图像生成、实时费用监控。
<img width="1819" height="926" alt="图片" src="https://github.com/user-attachments/assets/834c6e01-e594-4b55-aff6-7380bcc01d6c" />
<img width="1823" height="919" alt="图片" src="https://github.com/user-attachments/assets/fe33ba4f-a9d9-423c-9d00-beea45f2e10b" />
<img width="1800" height="916" alt="图片" src="https://github.com/user-attachments/assets/9751fa9b-a9cc-463a-94b6-d7c69843423e" />


---

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Node.js 22+ · Fastify 5 · better-sqlite3 · SSE 流式 |
| 前端 | React 19 · TypeScript · Vite 6 · Tailwind CSS |
| AI 模型 | DeepSeek V4 Pro / Flash（深度推理）· Qwen-VL Plus（视觉） · Wanx-v1（生图） |
| 部署 | start.sh 一键脚本 · Docker + docker-compose |

---

## 快速开始

### 前置环境

- **Node.js** ≥ 18（推荐 22）
- **npm** ≥ 9
- （可选）Docker ≥ 24 + docker-compose

### 1. 克隆项目

```bash
git clone git@github.com:WangShuJiu/comrade-assistant.git
cd comrade-assistant
```

### 2. 配置 API 密钥

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`：

```env
DEEPSEEK_API_KEY=sk-your-deepseek-key
QWEN_API_KEY=sk-your-qwen-key
PORT=3090
HOST=0.0.0.0
```

> API Key 也可在启动后在网页左侧「设置」面板中手动填入，但 `.env` 优先级更高。

### 3. 一键启动

```bash
bash start.sh
```

脚本自动完成：依赖安装 → 前端构建 → 端口检测 → 启动服务。

启动后访问 **http://localhost:3090**

---

## Docker 部署

```bash
# 创建 .env
cp server/.env.example server/.env
# 填入密钥后启动
docker compose up -d
```

---

## 项目结构

```
comrade-assistant/
├── start.sh                    # 一键启动脚本
├── Dockerfile                  # 多阶段构建
├── docker-compose.yml          # Docker 编排
├── server/                     # 后端
│   ├── .env.example            # 环境变量模板
│   └── src/
│       ├── index.ts            # Fastify 入口
│       ├── routes/             # API 路由
│       │   ├── chat.ts         # DeepSeek 流式对话
│       │   ├── vision.ts       # Qwen-VL 视觉级联
│       │   ├── generate.ts     # Wanx-v1 图像生成
│       │   ├── history.ts      # 对话历史 CRUD + 置顶搜索
│       │   ├── config.ts       # 配置读写
│       │   └── usage.ts        # 费用统计
│       └── services/
│           ├── deepseek.ts     # DeepSeek API · 滑动窗口 · 重试
│           ├── qwen.ts         # Qwen/Wanx API
│           ├── cost.ts         # 费用追踪 (SQLite)
│           └── database.ts     # SQLite 初始化
├── web/                        # 前端
│   └── src/
│       ├── components/
│       │   ├── ChatArea.tsx    # 对话界面 · /draw 指令
│       │   ├── Sidebar.tsx     # 设置 · 历史 · 主题
│       │   ├── MessageBubble.tsx # Markdown · KaTeX · 代码高亮
│       │   ├── Dashboard.tsx   # 监控大盘
│       │   └── CostPanel.tsx   # 费用面板
│       ├── hooks/
│       │   ├── useChat.ts      # 对话状态 · 视觉级联 · 重试
│       │   └── useTheme.tsx    # 深浅主题
│       └── lib/api.ts          # API 客户端
└── data/                       # 运行时数据（SQLite 数据库）
```

---

## 核心功能

### 深度对话

- **DeepSeek V4 Pro** 深度思考引擎，支持思考过程可视化
- **Token 滑动窗口**自动截断，保证长上下文不超出限制
- **SSE 流式输出**，打字机效果实时呈现
- 流式生成中**自由滚动**，向上翻阅不被拉回底部

### 视觉级联推理

```
用户上传图片 → Qwen-VL Plus 提取图像特征 → DeepSeek V4 Pro 深度推理 → 流式返回结果
```

- 多阶段 Loading：`正在提取图像特征...` → `正在深度思考...`
- Qwen-VL 描述默认折叠，展开后 Markdown 渲染

### AI 图像生成

- 输入 `/draw 一只猫` 即可触发 Wanx-v1 生成
- 或点击底部 `✨` 按钮进入生图面板
- 支持高清下载

### 历史管理

- SQLite 持久化，支持新建、删除、切换
- **置顶**常用对话
- **搜索框**快速过滤（标题 + 内容匹配）

### 数学公式

- KaTeX 渲染，支持 `$...$` `$$...$$` `\(...\)` `\[...\]` 四种定界符

### 费用监控

- Dashboard 大盘：预算进度条、双 Provider 统计、7 日对比、调用记录
- 底部常驻费用面板，点击展开详情
- 自动计算 Token 消耗和费用

### 主题切换

- 深色 / 浅色一键切换，localStorage 记忆偏好
- CSS Variables 驱动的全站统一配色

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 + 运行时长 |
| `GET` | `/api/env-keys` | 检查环境变量密钥状态 |
| `GET/POST` | `/api/config` | 读写用户配置 |
| `POST` | `/api/chat/stream` | DeepSeek SSE 流式对话 |
| `POST` | `/api/vision/stream` | 图片视觉级联分析 |
| `POST` | `/api/generate/image` | Wanx-v1 图像生成 |
| `GET/POST/DELETE` | `/api/history` | 对话历史 CRUD |
| `PATCH` | `/api/history/:id/pin` | 置顶/取消置顶 |
| `GET` | `/api/usage` | 费用统计 |

---

## 常见问题

**Q: 启动后聊天没反应？**
A: 检查「设置」面板是否已填入 API Key，或确认 `server/.env` 文件密钥正确。

**Q: Qwen-VL 图片识别失败？**
A: 千问 API Key 需开通 DashScope 百炼平台的 `qwen-vl-plus` 和 `wanx-v1` 模型权限。

**Q: 如何重置所有数据？**
A: 删除 `data/comrade.db` 后重启即可。

**Q: 端口被占用？**
A: `start.sh` 会自动寻找下一个可用端口。也可通过 `.env` 的 `PORT` 变量指定。

---

## License

MIT
