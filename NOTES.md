# 文件夹说明

这个文件只有你自己（和协作者）看得到，它不会被发布到网站上。

## 目录结构

```
/
├── index.md                       首页（访问 /）
├── about/                         关于我（访问 /about/）
│   ├── index.md                   入口页，列出下面几个子页的链接
│   ├── bio.md                     学术背景
│   ├── my_behavior.md             我的行为
│   ├── group_hidden_node.md       联合推断时序中的群体作用和隐藏节点
│   └── powergid_research.md       城市电网承载力项目
├── archive/                       归档，一年内用不到的内容
│   └── 控制理论基础/2.1.md
└── assets/                        图片等资源
```

## 怎么新建一个页面

**第一步**：在 `about/` 下新建 `xxx.md`，开头写三行：

```markdown
---
title: 页面标题
permalink: /about/xxx/
---
```

**第二步**：在 `about/index.md` 的列表里加一行：

```markdown
- [页面标题](xxx/)
```

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

## 改完怎么发布

```powershell
cd C:\Users\32475\Downloads\javaochen.github.io
git add -A
git commit -m "更新说明"
git push
```

注意：这台机器上直接 `git push` 会因为凭据问题失败。要么用带 token 的地址推送，要么直接让 AI 代推。

推完等 30～60 秒，Pages 会自动重新构建。
