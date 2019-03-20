---
title: Spring Cloud微服务-1
tags: [Spring Cloud, 微服务]
date: 2019-03-18 18:56:58
categories: 微服务
---

微服务学习笔记

# 什么是微服务

https://martinfowler.com/articles/microservices.html

>"Microservices" - yet another new term on the crowded streets of software architecture. Although our natural inclination is to pass such things by with a contemptuous glance, this bit of terminology describes a style of software systems that we are finding more and more appealing. We've seen many projects use this style in the last few years, and results so far have been positive, so much so that for many of our colleagues this is becoming the default style for building enterprise applications. Sadly, however, there's not much information that outlines what the microservice style is and how to do it.

<!--more-->

>For as long as we've been involved in the software industry, there's been a desire to build systems by plugging together components, much in the way we see things are made in the physical world. During the last couple of decades we've seen considerable progress with large compendiums of common libraries that are part of most language platforms.

>When talking about components we run into the difficult definition of what makes a component. Our definition is that a component is a unit of software that is independently replaceable and upgradeable.

>Microservice architectures will use libraries, but their primary way of componentizing their own software is by breaking down into services. We define libraries as components that are linked into a program and called using in-memory function calls, while services are out-of-process components who communicate with a mechanism such as a web service request, or remote procedure call. (This is a different concept to that of a service object in many OO programs [3].)

>One main reason for using services as components (rather than libraries) is that services are independently deployable. If you have an application [4] that consists of a multiple libraries in a single process, a change to any single component results in having to redeploy the entire application. But if that application is decomposed into multiple services, you can expect many single service changes to only require that service to be redeployed. That's not an absolute, some changes will change service interfaces resulting in some coordination, but the aim of a good microservice architecture is to minimize these through cohesive service boundaries and evolution mechanisms in the service contracts.


单体应用 -> 微服务应用

[从0开始学微服务-胡忠想](https://time.geekbang.org/column/article/13882)


## 单体架构存在的缺点

* 复杂性逐渐变高
* 技术债务逐渐上升
* 部署速度逐渐变慢
* 阻碍技术创新
* 无法按需伸缩

## 什么是微服务

* Martin Fowler：简而言之，微服务架构风格这种开发方法，是以开发一组小型服务的方式来开发一个独立的应用系统。**其中每个小型服务都运行在自己的进程中，并经常采用HTTP资源API这样轻量的机制来相互通信。**这些服务围绕这些功能进行构建，并能通过全自动的部署机制来进行独立部署。**这些微服务可以使用不同的语言来编写，并且可以使用不同的数据存储技术。**对这些微服务我们仅做最低限度的集中管理。
* 微服务架构是一种架构模式，它提倡将单一应用程序划分成一组小的服务，服务之间相互协调、相互配合，为用户提供最终价值。没饿服务运行在其独立的进程中，服务于服务间采用轻量级的通信机制互相沟通（通常是基于HTTP的RESTful API）。每个服务都围绕着具体的业务进行构建，并且能够独立地被部署到生产环境、类生产环境等。另外，应尽量避免统一的、集中式的服务管理机制，对具体的一个服务而言，应根据业务上下文，选择合适的语言、工具对其进行构建。
* 微服务是一种架构风格，一个大型复杂软件应用由一个或多个微服务组成。系统中的各个微服务可被独立部署，各个微服务之间是松耦合的。每个微服务仅关注完成一件任务并很好地完成该任务。在所有情况下，每个任务代表着一个小的业务能力。

## 微服务是一种架构风格

* 服务组件化（Componentization via Services）
* 服务围绕业务（Organized around Business Capabilities）
* 产品开发模式（Products not Projects）
* 轻量级通信机制（Smart endpoints and dumb pipes）
* 去中心化治理（Decentralized Governance）
* 去中心化数据设计（Decentralized Data Management）
* 故障处理设计（Design for failure）
* 演进式设计（Evolutionary Design）
* 基础设施自动化（Infrastructure Automation）

## 微服务的优点和挑战

* 开发简单
* 技术栈灵活
* 服务独立
* 按需扩展

---
* 运维复杂
* 数据一致性问题
* 集成测试复杂
* 重复代码
* 监控困难

### 微服务具备的特性

* 每个微服务可独立运行在自己的进程里
* 一系列独立运行的微服务共同构建起了整个系统
* 每个服务为独立的业务开发，一个微服务一般完成某个特定的功能，比如：订单管理，用户管理等
* 微服务之间通过一些轻量的通信机制进行通信，例如通过REST API或者RPC的方式进行调用

### 微服务的优点

* 易于开发和维护
* 启动较快
* 局部修改容易部署
* 技术栈不受限
* 按需伸缩
* DevOps

### 微服务带来的挑战

* 运维要求较高
* 分布式的复杂性
* 接口调整成本高
* 重复劳动

### 微服务的设计原则

* 单一职责原则
* 服务自治原则
* 轻量级通信原则
* 接口明确原则

# Spring Cloud

