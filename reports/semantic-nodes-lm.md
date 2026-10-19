---
title: 通过语义节点的多尺度思考（面向已训练语言模型）
permalink: /reports/semantic-nodes-lm/
---

# 通过语义节点的多尺度思考（面向已训练语言模型）




本文大部分内容未定，大量想法未写过来

## 问题

大语言模型即使有能力验证输出的结果，也容易陷入幻觉。即使加强推理训练、或者规范化推理步骤，也容易知错不改。根本在于推理基于模糊的注意力，重要的语义会在输入或输出一段话后被稀释掉，不能形成可靠的约束，具体来说：

人的思考大体也是模糊的，如果要全部清晰会太复杂，但一个核心组块可以切换大量语义和行为

一种更理性可控的认知方式是，模型内部维持它的语义网络，重要的语义的表征直接参与生成时每一步的动力学。但以往隐式的关系如何表达为显式动力学？语言每步只输出一个词，如何让以往的语义稳定地参与生成而非被淹没？且语义间存在大量包含和重叠，更简明、更能突出不同信息的是通过不同尺度的语义节点承载彼此特有的信息、相互继承，但相近的词语的语义尚且不易判断是否和如何合并，粗尺度的语义又如何确定？并且，在新的输入和输出下，需要调整旧的语义节点，增加新的语义节点，推断节点间的关系，这又如何可控？

至少希望呈现出生成每个词时，激活了哪些语义

不重新训练语言模型

## 相关研究

语义网络

GoT

CB-LLM

LMP聚合相关的历史信息、表述知识图谱并输入语言模型

时序知识图谱

TGA

对于无监督推断新样本每对节点的关系类型和动力学的问题，NRI利用变分自编码器结合Gumbel-Softmax优化边类型，但这是对约几十节点的系统基于大量样本学出未知关系类型，而对语言模型，节点数目增加了几个数量级，但推断关系往往能直接由模型本身完成

网络重整化，

快慢尺度分离

因果涌现

## 模型

所有语言可以统一视为不同尺度的语义节点，包括词、句、段落、文章等，同一语义可以用不同的更细尺度语言表述。语义间的联系构成一个复杂网络

一次输出视为这段话的语义节点与模型内的整个语义网络交互后的轨迹。

### 假设和约束



## 实验方案

## 文献

Concept Bottleneck Large Language Models(CB-LLM)

Graph of Thoughts Solving Elaborate Problems with Large Language Models(GoT)

A Survey on Temporal Knowledge Graph:Representation Learning and Applications,arXiv 2024

Digest the Knowledge  Large Language Models empowered Message Passing for Knowledge Graph Question Answering,ACL2025(LMP)

Revisiting the IPIP-NEO personality hierarchy with taxonomic graph analysis(TGA)

Neural Relational Inference for Interacting Systems(NRI)



# 附录


