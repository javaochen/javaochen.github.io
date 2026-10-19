---
title: How to continue observation and intervention during relational inference deployment
permalink: /reports/test-time-observation/
---

# How to continue observation and intervention during relational inference deployment


对于无监督推断新样本节点的不时变的成对关系类型和动力学的任务，已有模型已经对效果做了各种优化，但往往测试时的观测时长和训练时一样短，考虑实际部署时，测试时往往能观测很久且能适当干预，但都会分布偏移。实际上，现有模型测试时单轮观测的效果也假设了同分布

在收敛的神经关系推断基座上，考虑测试时多轮观测的实验和方法

## 直接融合多轮观测



不同轮数、不同数据上的效果：



## 优化多轮观测

## 干预方法

何时

随机程度

选哪些节点

干预位置、速度还是加速度

## 用于适应时变关系

dNRI

ORI

CRI

## 用于调控

NRI学习的动力学可以用来做调控，而干预的方法可以推广为调控的方法

参考任务：
    在可施加的影响有限的情况下，将Kuramoto调至指定同步程度
    输入动力学生成的医学指标、通过较安全的影响控制目标指标

初步实验见服务器上~/living_codes/experiments/Kuramoto_meanfield~hidden_node/module_boids_regulation.py及相关、如vsNRI_2026-08-14.md，但如有改进结构应能调整生成数据的参数在非全连接图上对于调控效果超过NRI

## 文献

Neural Relational Inference for Interacting Systems(NRI)
Online Relational Inference for Evolving Multi-agent Interacting System(ORI)
Collective relational inference for learning heterogeneous interactions(CRI)

# 附录



在从新样本的电荷运动轨迹推断类型时，只将NRI测试时的一段轨迹按原规则继续演化为K段，分别编码，累加同一条边的对数几率再分类，测试集上恢复边错误个数从36934（K=1）降到118（K≈75）；再往后（K=100）不再改善，反而升到138个。

对于电荷实验，在未随观测轮数收敛时，把继续观测换成继续干预反而效果下降。降低错误率2.5个量级所需的几十倍时间步对于实际测试时可能并不多，完全未改动训练。

但对弹簧和Kuramoto数据，继续观测可能不进反退，而干预还有些效果，测试时对弹簧可以换成之前减小几倍错误率的干预方案，考虑“自动判断何时干预”的问题，

还需要跑更多任务、比如对弱基座的效果，对更多关系类型的任务、对蛋白质别构、cri任务的效果，一方面又感觉"直接对多轮观测平均何时如此有效"很不显然，之前尝试的推导不太有效

弹簧实验（基座边恢复率99.8%）效果反降

kuramoto（基座边恢复率92%）效果不大
