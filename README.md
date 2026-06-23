# Android Remote Control MVP

这个原型用于验证“iPhone/浏览器控制端 -> Android 被控端”的核心链路。

## 当前包含

- `server/`：Node.js WebSocket 信令与指令转发服务。
- `web/`：iPhone Safari、Android Chrome、桌面浏览器都能打开的控制端。
- `android/`：Android 被控端 Kotlin 工程骨架，包含辅助功能服务和屏幕共享授权入口。

## 本机运行控制端

```bash
npm install
npm start
```

打开：

```text
http://localhost:3000
```

如果用 iPhone 访问，把 `localhost` 换成电脑局域网 IP，例如：

```text
http://192.168.1.20:3000
```

## 两台手机不在同一个网络

不要使用 `localhost` 或 `192.168.x.x`、`10.x.x.x` 这类局域网地址。需要把本项目部署到公网服务器，让 iPhone 和 Android 都访问同一个公网 HTTPS 地址。

部署后地址一般类似：

```text
https://remote-control.example.com
```

控制端打开：

```text
https://remote-control.example.com
```

Android 端填写：

```text
wss://remote-control.example.com
```

注意：网页是 `https://` 时，WebSocket 必须是 `wss://`。

### Render 快速部署

1. 把 `remote-android-control-mvp` 上传到 GitHub。
2. 在 Render 新建 Web Service，选择这个仓库。
3. Build Command 使用：

```bash
npm ci
```

4. Start Command 使用：

```bash
npm start
```

5. 部署完成后，用 Render 给你的 `https://xxx.onrender.com` 访问控制端。
6. Android 端填写 `wss://xxx.onrender.com`。

### 自己的服务器 Docker 部署

```bash
docker build -t remote-android-control-mvp .
docker run -p 3000:3000 remote-android-control-mvp
```

正式使用建议在前面放 Nginx/Caddy，配置 HTTPS，然后用 `wss://你的域名` 连接。

## Android 端下一步

1. 用 Android Studio 打开 `android/`。
2. 真机安装调试包。
3. 在 App 中点击“开启辅助功能权限”，启用 `Remote Control`。
4. 点击“授权屏幕共享”，允许 MediaProjection。
5. 输入 `ws://电脑IP:3000`，点击“连接控制端”。
6. 控制页点击测试区域，Android 端会收到 `tap/swipe/key/text` 并调用 `RemoteAccessibilityService`。
7. 增加 WebRTC，把 MediaProjection 的画面推到控制端。

## 指令协议

控制端发送的坐标是 0 到 1 的归一化比例，Android 端需要乘以真实屏幕宽高。

```json
{ "type": "tap", "x": 0.5, "y": 0.5 }
```

```json
{
  "type": "swipe",
  "fromX": 0.5,
  "fromY": 0.8,
  "toX": 0.5,
  "toY": 0.2,
  "durationMs": 300
}
```

```json
{ "type": "key", "key": "back" }
```

```json
{ "type": "text", "text": "hello" }
```

## 生产化建议

- 用 WebRTC DataChannel 替代或补充 WebSocket 指令通道。
- 部署 Coturn，保证 NAT 环境下可连接。
- 房间号必须升级为一次性邀请码，并增加端到端加密或至少 TLS。
- Android 端必须始终显示前台通知和被控状态。
- 上架前准备 AccessibilityService 用途说明、隐私政策、权限说明页面。
