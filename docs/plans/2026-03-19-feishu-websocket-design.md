# 飞书 WebSocket 长连接设计

**日期**: 2026-03-19
**状态**: Approved

---

## 1. 背景

飞书集成原使用 Webhook 模式接收消息。现改为 WebSocket 长连接（Lark SDK `WSClient`）作为唯一连接方式，移除 Webhook。

优势：
- 无需公网可达的回调 URL，简化部署
- 更低延迟（无 HTTP 往返）
- 无需签名验证（SDK 内部处理）
- 用户无需在飞书开放平台手动配置回调地址

## 2. 架构

### Leader 选举

复用 Discord Gateway 的 DynamoDB Leader 选举机制。Leader Fargate Task 同时持有 Discord Gateway + 飞书 WSClient 连接。

```
Leader Task:
  ├── Discord Gateway (discord.js Client) — 已有
  ├── Feishu Gateway (Lark WSClient)      — 新增
  └── DynamoDB 锁续约 (每 15s)

Standby Tasks:
  └── 每 15s 轮询锁，Leader 崩溃 → 30s 内接管两个 Gateway
```

### 消息流

```
飞书用户发消息
    ↓
Lark WSClient (Leader Task) 收到 im.message.receive_v1
    ↓
FeishuGatewayManager.handleEvent()
    ↓
handleFeishuMessage() — 提取自 webhooks/feishu.ts
    ├── 过滤 bot 自身消息
    ├── 解析消息 (text/rich_text/image/file)
    ├── @bot 提及检测
    ├── 附件下载 → S3
    ├── 群组管理 (groupJid = feishu#{chatId})
    ├── DynamoDB 存储
    └── SQS FIFO dispatch
```

回复路径不变：Agent → SQS Reply → FeishuAdapter → REST API (im.message.create)

### 代码复用

将 `webhooks/feishu.ts` 的消息处理逻辑提取到 `feishu/message-handler.ts`，FeishuGatewayManager 调用。类似 Discord 的 `discord/message-handler.ts` 模式。

## 3. 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `control-plane/package.json` | 改 | 加 `@larksuiteoapi/node-sdk` |
| `control-plane/src/feishu/message-handler.ts` | 新建 | 核心消息处理逻辑（从 webhooks/feishu.ts 提取） |
| `control-plane/src/feishu/gateway-manager.ts` | 新建 | WSClient 生命周期、连接管理、事件分发 |
| `control-plane/src/index.ts` | 改 | Leader 启动时初始化 FeishuGatewayManager |
| `control-plane/src/webhooks/feishu.ts` | 删除 | 移除 webhook handler |
| `control-plane/src/webhooks/index.ts` | 改 | 移除 /webhook/feishu |
| `control-plane/src/webhooks/signature.ts` | 改 | 移除 verifyFeishuSignature |
| `control-plane/src/routes/api/channels.ts` | 改 | 飞书状态直接 connected |
| `web-console/src/pages/ChannelSetup.tsx` | 改 | 移除回调配置说明 |

## 4. 验证

1. 创建飞书 Channel → 状态直接 `connected`
2. WSClient 自动连接 → 日志显示连接成功
3. 群聊 @bot → 消息通过 WebSocket 到达 → Agent 处理 → 卡片回复
4. 模拟 Leader 崩溃 → Standby 30s 内接管 → WSClient 重新连接
