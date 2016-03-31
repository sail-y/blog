title: Spring cloud项目实践(一)
date: 2016-03-21 20:58:33
tags: [spring-cloud,微服务]
categories: spring
---
# 基本概念和重要组件

最近看了一篇[文章](https://mp.weixin.qq.com/s?__biz=MjM5MDE0Mjc4MA==&mid=400645575&idx=1&sn=da55d75db55117046c520de88dde1123&scene=1&srcid=0315vVImLcHZpO2tTRVKg1w8&key=710a5d99946419d9ff6bc76720229c7216fbcf348001d543434dfad7944207441ed01f44e57b0d87a834f8e8b6f673b7&ascene=0)，了解到微服务架构的组成部分和概念，以前有看过一点dubbo，文章里介绍到Netflix这么一个公司：


>Netflix是一家成功实践微服务架构的互联网公司，几年前，Netflix就把它的几乎整个微服务框架栈开源贡献给了社区，这些框架和组件包括

* Eureka:　服务注册发现框架
* Zuul:　服务网关
* Karyon:　服务端框架
* Ribbon:　客户端框架
* Hystrix:	服务容错组件
* Archaius: 服务配置组件
* Servo: Metrics组件
* Blitz4j: 日志组件

>Netflix的开源框架组件已经在Netflix的大规模分布式微服务环境中经过多年的生产实战验证，正逐步被社区接受为构造微服务框架的标准组件。Pivotal去年推出的Spring Cloud开源产品，主要是基于对Netflix开源组件的进一步封装，方便Spring开发人员构建微服务基础框架。对于一些打算构建微服务框架体系的公司来说，充分利用或参考借鉴Netflix的开源微服务组件(或Spring Cloud)，在此基础上进行必要的企业定制，无疑是通向微服务架构的捷径。

Spring Cloud是微服务工具包，为开发者提供了在分布式系统的配置管理、服务发现、断路器、智能路由、微代理、控制总线等开发工具包。

觉得挺不错的，就找找资料尝试实战一下。
在此记录和回顾一下过程中遇到的问题和实际项目中需要解决的一些问题。
<!--more-->
接下来我看了2个文章	
第一个是	
http://www.kennybastani.com/2015/07/spring-cloud-docker-microservices.html	
中文版的：http://www.chinacloud.cn/show.aspx?id=20968&cid=12	
第二个是	
http://www.cnblogs.com/skyblog/category/774535.html	

在继续往下看之前，可以先把上面2个文章看了。第一个是老外写的，用一个实例的demo演示了spring-cloud构建微服务架构的项目。

第二个文章则很好的介绍了spring-cloud各个子项目的作用。也用了一个demo演示了spring-cloud构建的微服务架构的项目。建议也看看动手试试，我这里就不再赘述了。后面的文章都是在基于看过这2篇文章后的基础上写的，很多东西没有再进行二次解释。这里贴一下spring-cloud的子项目。		
>目前来说spring主要集中于spring boot（用于开发微服务）和spring cloud相关框架的开发，spring cloud子项目包括：

* Spring Cloud Config：配置管理开发工具包，可以让你把配置放到远程服务器，目前支持本地存储、Git以及Subversion。
* Spring Cloud Bus：事件、消息总线，用于在集群（例如，配置变化事件）中传播状态变化，可与Spring Cloud Config联合实现热部署。
* Spring Cloud Netflix：针对多种Netflix组件提供的开发工具包，其中包括Eureka、Hystrix、Zuul、Archaius等。
* Netflix Eureka：云端负载均衡，一个基于 REST 的服务，用于定位服务，以实现云端的负载均衡和中间层服务器的故障转移。
* Netflix Hystrix：容错管理工具，旨在通过控制服务和第三方库的节点,从而对延迟和故障提供更强大的容错能力。
* Netflix Zuul：边缘服务工具，是提供动态路由，监控，弹性，安全等的边缘服务。
* Netflix Archaius：配置管理API，包含一系列配置管理API，提供动态类型化属性、线程安全配置操作、轮询框架、回调机制等功能。
* Spring Cloud for Cloud Foundry：通过Oauth2协议绑定服务到CloudFoundry，CloudFoundry是VMware推出的开源PaaS云平台。
* Spring Cloud Sleuth：日志收集工具包，封装了Dapper,Zipkin和HTrace操作。
* Spring Cloud Data Flow：大数据操作工具，通过命令行方式操作数据流。
* Spring Cloud Security：安全工具包，为你的应用程序添加安全控制，主要是指OAuth2。
* Spring Cloud Consul：封装了Consul操作，consul是一个服务发现与配置工具，与Docker容器可以无缝集成。
* Spring Cloud Zookeeper：操作Zookeeper的工具包，用于使用zookeeper方式的服务注册和发现。
* Spring Cloud Stream：数据流操作开发包，封装了与Redis,Rabbit、Kafka等发送接收消息。
* Spring Cloud CLI：基于 Spring Boot CLI，可以让你以命令行方式快速建立云组件。

# 实践

在了解了微服务的概念，以及spring-cloud各个子项目之间的关系后。		
接下来我们就自己动手构建一个项目，做一个能跑起来的项目实际上需要3个模块：		

1. Spring Cloud Config
2. Spring Cloud Eureka
3. 自己的项目

在配置好这几个项目后，我会用jenkins自动build项目，然后发布到docker中再启动容器。其中还可以针对生产和测试环境采用不同的配置。我的服务器环境是centos6.5。

我的服务应用目前做了以下2个配置。
1.mongodb
2.mybatis

下篇文章详细讲解。



