# 文件夹说明

这个文件只有你自己（和协作者）看得到，它不会被发布到网站上。

## 目录结构

```
/
├── index.md                  首页（访问 /）
├── about/                    关于我（访问 /about/）
│   ├── index.md              入口页，列出下面几个子页的链接
│   ├── bio.md                学术背景
│   ├── research.md           研究兴趣
│   └── contact.md            联系方式
├── archive/                  归档，一年内用不到的内容
│   └── 控制理论基础/2.1.md
└── assets/                   图片等资源
```

## 怎么新建一个页面

在 `about/` 下新建 `xxx.md`，开头写三行：

```markdown
---
title: 页面标题
permalink: /about/xxx/
---
```

然后在 `about/index.md` 的列表里加一行：

```markdown
- [页面标题](xxx/)
```

## 一条重要规则

**链接里的 `xxx/` 不要带 `.html` 后缀。** 就是 `文件名/`。因为我们在 front matter 里用 `permalink` 把 URL 定成了干净形式，带上后缀反而会 404。

## 图片怎么放

图片放到 `assets/` 下，在 markdown 里这样引用：

```markdown
![说明文字](../assets/图片名.png)
```
