# 即答 · Prompt Desk

更新：现已支持提示词与密钥保存在同一个本地配置文件，详见 [配置文件说明](CONFIG.md)。测试部署位置为 https://javaochen.github.io/prompt-desk/ ，以下“配置仅限内存”“尚未部署”等为初版说明，以本更新和部署结果为准。

免构建静态网页：大量提示词配置、API 流式回答、KaTeX 数学公式、本地文本编辑。

## 使用

在本目录执行 `python -m http.server 8080 --bind 127.0.0.1`，浏览器打开 http://localhost:8080 。也可直接打开 index.html，但文件读写与剪贴板功能可能受浏览器限制。

填写 API Base URL（例如 https://api.openai.com/v1）、你的模型 ID 和 API Key。接口必须兼容 Chat Completions `/chat/completions`、SSE 流式协议，且允许页面来源的 CORS 请求。不支持仅有 Responses 或 Anthropic 原生协议的地址。没有可用 API 密钥时无法得到真实回答。首字速度还取决于模型与网络；页面不等待完整响应才展示。

提示词集中放在 `prompts.js`，可自行增加分类和条目；页面内临时新增不落盘。每次请求独立；迭代文件时勾选附带全文，或选中局部点击优化选区。文件只在明确选择附带或优化选区时发送到所填接口。当前支持 UTF-8 文本文件，不支持 Word/PDF。输出保留纯文本和 LaTeX，公式自动渲染；尚未提供 Markdown 标题/表格/代码高亮。

打开 / 新建 → 选中文字 → 填写修改要求 → 优化选区 → 检查回答 → 替换到原选区 → 保存。生成途中修改了编辑器会拒绝应用旧结果；中断或截断结果不能应用。支持撤销最近的 AI 替换。Chrome/Edge 安全上下文中可直接写回经你选择的文件；其他环境降级为导入、下载副本。不自动写入磁盘，不保存聊天记录、API Key 或输入。

KaTeX 0.16.22 从 jsDelivr 加载，需要网络；加载失败时仍显示原始公式。后续可将 KaTeX 资源放进仓库以消除 CDN 依赖。

## GitHub Pages

将此文件夹内容放入独立仓库（例如 prompt-desk）的根目录，在仓库 Settings → Pages 中选择从主分支根目录发布。也可放进现有 github.io 仓库的 `prompt-desk/` 子目录，沿用其部署方式。全部资源使用相对路径。

源码没有公共密钥：每位使用者自行在页面填写。浏览器直连适用于自用验证，密钥会处于页面运行环境，不能将共用服务端密钥嵌入公开网站。需要面向多人提供服务时，另行增加有鉴权、限流和服务端密钥的 API 代理；GitHub Pages 仅托管静态文件。

当前未推送仓库或部署。未使用真实密钥进行联网生成验证。

协议参考：[Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)、[KaTeX](https://katex.org/docs/autorender)、[文件选择 API](https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker)。
