# 本地配置文件

API 设置中点击“保存配置”，将提示词、API 地址、模型和密钥存进 `prompt-desk.private.json`。下次访问点击“打开配置文件”恢复。支持编辑当前提示词、添加提示词后保存；也可手动编辑 JSON 中的 prompts 数组。

文件含明文密钥，请保存在私人目录，不要放进公开仓库或分享。配置文件不上传 GitHub；API 请求会把密钥发送到你填写的接口地址。页面不使用 localStorage 或数据库保存密钥、输入和回答。浏览器不会自动扫描本地文件，每次重新打开页面需手动选取配置。

Chrome/Edge 支持的安全上下文可写回所选配置文件；其他浏览器降级为导入、下载副本。“另存配置”选择新文件。未保存修改不会自动落盘。

配置结构：`{version:1, api:{baseURL,model,key}, prompts:[{name,category,body}]}`。默认公共提示词位于 `prompts.js`，不包含私人密钥。

`node check.cjs` 验证 UTF-8 分块、SSE、选区替换保护、撤销、中断、截断、配置校验及文件读写往返，不调用真实 API。

网页发布到 `javaochen/javaochen.github.io` 的 `prompt-desk/` 子目录，沿用现有 Pages 构建。仅发布源码，不发布私人配置。访问 https://javaochen.github.io/prompt-desk/ 。
