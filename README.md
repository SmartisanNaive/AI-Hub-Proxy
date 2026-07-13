# AI-Hub-Proxy

一个基于 Deno + Docker Compose 的轻量级反向代理，用于统一转发多个 AI / LLM 服务 API。

![AI Hub Proxy Poster](./docs/post.png)

## 支持的服务

| 路径前缀 | 目标服务 |
|---------|---------|
| `/discord` | Discord API |
| `/telegram` | Telegram Bot API |
| `/openai` | OpenAI API |
| `/claude` | Anthropic API |
| `/gemini` | Google Gemini API |
| `/meta` | Meta AI API |
| `/groq` | Groq API |
| `/xai` | xAI API |
| `/cohere` | Cohere API |
| `/huggingface` | Hugging Face Inference API |
| `/together` | Together AI API |
| `/novita` | Novita AI API |
| `/portkey` | Portkey API |
| `/fireworks` | Fireworks AI API |
| `/openrouter` | OpenRouter API |

## 使用方式

### 1. 启动服务

```bash
docker compose up -d
```

服务默认映射到宿主机的 **9000** 端口。

### 2. 查看日志

```bash
docker compose logs -f
```

### 3. 停止服务

```bash
docker compose down
```

## 接口示例

```bash
# 访问首页（静态介绍页面）
curl http://localhost:9000/

# 健康检查
curl http://localhost:9000/health

# 调用 OpenAI（需要在请求头中传入 Authorization）
curl http://localhost:9000/openai/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"hello"}]}'
```

## 环境变量

| 变量 | 默认值 | 说明 |
|-----|-------|------|
| `PORT` | `8080` | 容器内服务监听端口 |
| `HOST` | `0.0.0.0` | 服务监听地址 |
| `INDEX_PATH` | `./public/index.html` | 首页静态 HTML 文件路径 |

## 静态页面

访问根路径 `/` 或 `/index.html` 会返回 `public/index.html`，一个介绍本项目用途与使用方式的静态页面。你可以直接修改该文件来自定义首页内容。

## 安全说明

- 只透传 `accept`、`content-type`、`authorization` 以及自定义 `x-` 开头的请求头。
- 响应头中添加了 `X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy` 等基础安全头。
