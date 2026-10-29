# 文件夹说明

这个文件只有你自己（和协作者）看得到。文件名以 `_` 开头，Jekyll 默认不输出，所以不会出现在网站上（2026-10-29 核实：改名前 `NOTES.md` 曾以 `/NOTES.html` 发布，已修正）。改名后不要再去掉下划线。

## 目录结构

```
/
├── index.md                       首页（访问 /）
├── semantic-node_note.md          文档呈现语义节点（暂放根目录，地址 /semantic-node_note/）
├── about/                         关于我（访问 /about/）
│   ├── index.md                   入口页，列出下面几个子页的链接
│   ├── review.md         研究状态
│   ├── research_log.md            研究经历（导师给的参考文献线索）
│   ├── group_hidden_node.md       联合推断时序中的群体作用和隐藏节点
│   └── powergid_research.md       城市电网承载力项目
├── reports/                       研究报告（访问 /reports/）
│   ├── index.md                   报告目录页
│   ├── der-kuramoto.md            DER 电网的类 Kuramoto 模型
│   ├── test-time-observation.md   关系推断部署时的持续观测与干预
│   ├── hidden-multiscale.md       联合推断隐藏节点与多尺度动力学结构
│   └── semantic-nodes-lm.md       通过语义节点的多尺度思考
├── tools/                         本地脚本（会被一起发布，但不影响阅读）
│   ├── check-links.ps1            链接校验
│   ├── rename-page.ps1            改名并同步所有引用
│   └── git-sync.ps1               一条命令提交并推送
├── search.json                    搜索索引（Liquid 生成，列出所有有 title 的页面）
├── search/index.md                搜索页（访问 /search/）
├── _includes/head-custom.html     给每一页注入搜索脚本、快捷键
├── _private/                      私有部分（本地 git，不推送、不发布，见下）
├── archive/                       归档，一年内用不到的内容（目前为空）
└── assets/
    ├── css/                       主题样式（GitHub Pages 主题自带）
    └── js/search.js               全站搜索（无依赖）
```

## 私有部分 `_private/`

`_private/` 是本仓库内的私有笔记，有自己的 git 历史（进到该目录后照常 `git add` / `git commit`），但外层 `.gitignore` 忽略了它：

- 不会出现在 GitHub 仓库里（不会被 push）
- 不会被 Jekyll 发布（`_` 开头的目录默认跳过）

状态细节、未成形的想法、临时计算都可以放这里。注意它没有任何远端备份，换电脑或重装前手动复制。

## 怎么新建一个页面

**第一步**：新建 `xxx.md`（放 `about/` 或 `reports/`），开头写：

```markdown
---
title: 页面标题
permalink: /about/xxx/
---
```

**第二步**：在**首页 `index.md`** 里加一行链接。本站约定：**新文档都从主页链接**，这样访客和 AI 都能从一处找到全部内容。

```markdown
- [页面标题](https://javaochen.github.io/about/xxx/)
```

链接用**全网址**（`https://javaochen.github.io/...`），不用相对路径——两者都行，但全网址在复制、粘贴给 AI 时不会因为「从哪个页面解析」而出错。

## 一条重要规则：permalink 和链接必须逐字相同

这是这个站最容易出错的地方，已经有两次实际踩坑。

**`permalink` 写什么，网址就是什么。GitHub Pages 不会自动补斜杠，也不会帮你跳转。**

| `permalink` | 能打开的网址 | 打不开的网址 |
|---|---|---|
| `/about/xxx/` | `/about/xxx/` | `/about/xxx` |
| `/about/xxx` | `/about/xxx` | `/about/xxx/` |

所以 `about/index.md` 里的链接**必须和那个文件的 `permalink` 一个字不差**。

**本站统一约定：一律带结尾斜杠。**

- 写 `permalink: /about/xxx/`，不写 `/about/xxx`
- 写链接 `[标题](xxx/)`，不写 `[标题](xxx)`

**为什么统一选带斜杠**：带斜杠时浏览器把它当**目录**，页面里写 `../assets/x.png` 会正确解析；不带斜杠时被当成**文件**，相对路径会指到错误位置。以后放图片必然踩这个坑。

**另外**：链接不要带 `.html` 后缀（例如 `xxx.html`），因为我们用 `permalink` 把 URL 定成了干净形式。

## 图片怎么放

图片放到 `assets/` 下，在 markdown 里这样引用：

```markdown
![说明文字](../assets/图片名.png)
```

## 搜索

任何页面按 `Ctrl+K`（或在不是输入框的地方按 `/`）打开搜索框，页面右下角也有按钮；也可以直接访问 `/search/`。

索引来自根目录的 `search.json`，它用 Liquid 遍历 `site.pages`：**新建页面只要写了 `title`，就自动进索引**，不用手工维护条目。跳转后会滚动到页面里第一个匹配处并短暂高亮，逻辑在 `assets/js/search.js`。

## 改完怎么发布

```powershell
cd C:\Users\lenovo\Downloads\javaochen.github.io
git add -A
git commit -m "更新说明"
git -c http.proxy=http://127.0.0.1:17890 push
```

注意：这台机器的 `.git/config` 里 `http.proxy` 指向已失效的 `7890`，所以裸 `git push` 会失败；上面这条加上 17890 代理可以直接推。代理没开时改用 `git -c http.proxy= push` 走直连（2026-10-29 实测直连时好时坏）。

推完等 30～60 秒，Pages 会自动重新构建。
