# 即答 · Prompt Desk

测试网页：https://javaochen.github.io/prompt-desk/

免构建静态网页：搜索 / 自定义提示词，兼容 Chat Completions 的 API 流式回答，KaTeX 数学公式，本地文本编辑与选区优化。

## 快速使用

打开“API 设置” → “参考配置” → 选择服务商示例 → 填写对应密钥 → “创建 / 保存配置”。首次默认打开下载目录，保存为 `prompt-desk.private.json`。之后配置自动写回同一文件，浏览器允许时下次自动恢复；权限失效时点击“沿用上次配置”。完整说明见 [CONFIG.md](CONFIG.md)。

选择讲解 / 命名提示词并提问。每次请求独立，不自动附带历史。接口需兼容 `/chat/completions` SSE 流并允许页面来源的 CORS。首字速度取决于模型和网络；参考配置不等于所有服务商支持浏览器直连。

默认提示词集中在 `prompts.js`。讲解尽量补全中间推导、注明依据和假设；命名面向命题或论文关键步骤，给出中文 / 英文称呼、首次引入与后续回指示例，区分标准术语与描述性命名，避免编造外部引用。

## 本地编辑

打开 / 新建 UTF-8 文本 → 选中文字 → 填写修改要求 → 优化选区 → 检查 → 替换到原选区 → 保存。支持撤销 AI 替换，原文变化后拒绝应用旧结果；中断或截断结果不能直接应用。不支持 Word/PDF。

打开文件本身不会发送内容；勾选“附带编辑器全文”才发送全文，选区优化只发送选区与修改要求。编辑文件始终手动保存，与配置自动保存分开。不支持原位文件写入时下载副本。

KaTeX 0.16.22 通过 jsDelivr 加载，失败时保留原始公式。暂不提供 Markdown 排版与代码高亮。API 密钥位于页面运行环境，不能把共用服务端密钥嵌入公开源码；多人共享服务需要鉴权代理。

## 开发

`python -m http.server 8080 --bind 127.0.0.1`，访问 http://localhost:8080 。

`node check.cjs` 检查 UTF-8 分块、SSE、选区替换保护、撤销、中断、截断、配置读写、下载目录默认值、原文件复用和权限拒绝。模拟检查不调用真实 API，不能代替浏览器授权与真实服务商验证。

仅将发布清单内的静态源码提交到 Pages 仓库的 `prompt-desk/`。私人配置和密钥不发布。

参考：[DeepSeek](https://api-docs.deepseek.com/)、[Kimi](https://www.kimi.ai/help/kimi-api/api-troubleshooting)、[通义千问](https://help.aliyun.com/en/model-studio/model-calling-in-sub-workspace)、[文件系统 API](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)。
