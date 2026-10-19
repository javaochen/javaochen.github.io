---
title: 研究经历
permalink: /about/research_log/
---

# 研究经历

经历不代表当前状态


试总结：发现隐藏结构及其动力学

## 本科阶段导师提供的参考

引号中为导师的语义

Neural relational inference for interacting systems(NRI)：无监督推断新样本每对节点的关系类型和动力学

Collective relational inference for learning heterogeneous interactions(CRI)

导师说探讨识别群体，“简单点：可以假设底层有些比较明显的集群效应（比较容易区分群体），但不同群体直接有交互（有向边）。难一点：底层可能没有很明显的集群效应，但可能可以通过算法自动去进行群体分类（较难区分群体），同样希望可以识别这些不同群体直接有交互（有向边），然后希望可以去根据结果反过来去做点解释。”

“群体可考虑超图，但不限于此”Hypergraph reconstruction from dynamics(THIS)

也可“处理隐藏节点或部分缺失数据”Reconstructing propagation networks with natural diversity and identifying hidden sources

Parameter Inference and Nonequilibrium Identification for Markov Networks Based on Coarse-Grained Observations

“很相关”Predicting long-term dynamics of complex networks via identifying skeleton in hyperbolic space

Connected Theorems: A Graph-Based Approach to Evaluating Mathematical Results，“不过是静态的  不涉及到动力学”“参考他们的想法，实验还是要有比较或者可以揭示什么规律”“就是有时候在微观层面  看不出什么东西，但是到宏观层面，可能就有比较明确的规律了”

因果涌现，如NIS+“跟之前和你讲的应该很接近”,Dynamical reversibility and a new theory of causal emergence based on SVD，causal emergence2.0

“在压缩的时候度量 压缩系统和原始系统的一致性应该是个关键”Parameter Inference and Nonequilibrium Identification for Markov Networks Based on Coarse-Grained Observations

Measuring Time-Series Dataset Similarity using Wasserstein Distance

Sparse Diffusion Autoencoder for Test-time Adapting Prediction of Complex Systems

Diffusion Model for Relational Inference in Interacting Systems

Neural relational inference to learn long-range allosteric interactions in proteins from molecular dynamics simulations

https://zhihangliu.cn/Renormalization-Group/zh/

Kuramoto Orientation Diffusion Models

Revisiting the IPIP-NEO personality hierarchy with taxonomic graph analysis

Network Renormalization,Nature Reviews Physics2025：重整化群的思想和推广

Laplacian renormalization group for heterogeneous networks

Universal resilience patterns in complex networks

The low-rank hypothesis of complex systems，"但我们想做的是  一种   multi-scale的"

Effective and Efficient Structural Inference with Reservoir Computing

Collective dynamics on higher-order networks，"这篇文章 也提到  重整化  降维"

Cross-Scale Reservoir Computing for large spatio-temporal forecasting and modeling

Discover network dynamics with neural symbolic regression

Interpreting deep learning by establishing a rigorous corresponding relationship with the renormalization group on the Ising model

我说考虑自上而下的多尺度，上层可以是韧性等，导师说“韧性本身也可以做”，如Deep learning resilience inference for complex networked systems

From Uniform to Learned Graph Priors：Diffusion for Structure Discovery

我想做得更落地，考虑用于调控，但当时又处理不好细节。考虑把调控能力作为动力学模型的学习指标，比如对未知图的Kuramoto系统调节序参量的能力，但当时没有理清可行性。

我觉得现有模型只利用一小段时间步，尝试只在测试时做加强，先干预,导师："和之前的方法相比，现在考虑的有啥本质区别，是否具有科学价值或意义，要有真正可以写成方法论文的科学问题。"；

我通过测试时干预在NRI收敛到99.8%弹簧任务上降低了几倍错误率，但论证不清方法，导师："我觉得主要还是强调到“干预如何提升关系结构的可识别性”，回答“为什么、何时、干预哪一个节点能够揭示原本不可辨识的结构”，然后最终能够形成类似这样的逻辑链“不可识别性 → 干预增加信息 → 最优干预设计”"；

电荷任务上只加多轮观测融合的改动就有显著改进，这是此前没估计到的。
但"这里面也可以探讨，何时继续观测、何时主动干预，差不多也就是个优化问题。"但我在那段时间为模型配置的可选任务只有两三个，忙于查证和犹豫模型



导师介绍我做建模具体电网的项目，说结合项目可以整理些东西

我整理了快变状态奇异摄动为代数方程的例子

我觉得更熟悉的还是沿语义的认知方式。考虑"是不是可以先冻结语言模型，看看能不能找到一些低维、稳定、可解释的语义状态，而且这些状态确实能预测后面的生成，粗粒化以后还能保留主要信息。 "


"你其实不是没想法，主要还是想得比较多，容易越做越复杂。现阶段可以先收一收，挑一个前期积累比较多多、最有把握的问题先做完整，也不一定非要完全跟着我的方向。先把一个东西真正搞明白、做清楚，后面其他想法再慢慢展开"