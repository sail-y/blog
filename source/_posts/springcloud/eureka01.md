---

title: Eureka源码01-eureka启动流程
date: 2020-03-15 17:05:39
tags: [spring-cloud,eureka]
categories: eureka
---



# 如何阅读一个开源框架的源码

如果要阅读一个开源框架的源码，我们应该从什么地方入手。首先应该想到的是，从框架启动的入口入手，比如Eureka，肯定是从Eureka服务本身启动的入口开始。或者我们也可以从框架的单元测试开始看，因为单元测试都包含了框架的核心流程和功能。所以我们通过这2个入口，可以通过打断点执行的方式阅读代码的逻辑。下面我将开始学习Eureka的源码，我将基于[https://github.com/Netflix/eureka.git](https://github.com/Netflix/eureka.git) 的v1.7.2分支进行阅读，因为我目前所用的SpringCloud引入的就是这个版本。
<!--more-->
# 环境准备

IDE选用idea2018版本进行阅读，为什么选2018版本，eureka的源码是基于gradle构建的，v1.7.2的分支是基于2.10的gradle版本，这个现在已经比较旧了，在JDK10以上的版本，无法运行，而dea2019已经开始用JDK11开始运行，具体情况可以看这篇文章，[https://blog.csdn.net/jiajane/article/details/103014036](https://blog.csdn.net/jiajane/article/details/103014036)，是类似的问题。经过一番倒腾我最终也没有能在2019版本上加载依赖，所以我还是选择了2018版本开始源码的阅读，使用上没有区别。

先看下Eureka的核心流程，核心功能包括：

* 服务注册
* 服务发现
* client向server发送心跳
* client向server获取服务注册表
* 服务实例摘除
* 自我保护机制
* 通信

下面将从源码找到eureka的启动类，并作为入口进行源码分析。

# 启动流程分析

eureka-server依赖了eureka-client和eureka-core2个模块，server又当服务器，又当作客户端，因为在集群模式下，他们也会相互注册。注册中心相关核心的代码都在eureka-core模块里，也能看出来eureka是基于jersey（类似spring mvc)开发的接口，和客户端http请求，在服务之间相互通信。

<img src="/img/spring-cloud/image-20200315153312195.png" alt="image-20200315153312195"  /><img src="/img/spring-cloud/image-20200315153257597.png" alt="image-20200315153257597"  />

然后eureka-resources里，其实就是一些css、js和jsp文件。

<img src="/img/spring-cloud/image-20200315153346879.png" alt="image-20200315153346879"  />

那么eureka-server本质上其实就是一个web应用，并且在eureka-server里发现还有一个web.xml文件，所以我们应该重点分析下`web.xml`文件，里面包含了一些listener和filter，这些类应该都是我们要重点看一下的源码，先猜一下这几个类都是干什么的。

* com.netflix.eureka.EurekaBootStrap（初始化逻辑？）
* com.netflix.eureka.StatusFilter（状态管理？）
* com.netflix.eureka.ServerRequestAuthFilter（授权认证相关？）
* com.netflix.eureka.RateLimitingFilter（限流控制？）
* com.netflix.eureka.GzipEncodingEnforcingFilter（压缩和编码相关？）
* com.sun.jersey.spi.container.servlet.ServletContainer（jersey框架初始化加载类，类似Spring MVC的DispatcherServlet）

文件下面的filter-mapping里默认没有开启限流的过滤器，Gzip也只过滤`/v2/apps`路径下的请求。

## EurekaBootStrap（启动类，重要）

这个类在eureka-core里，监听器要关注`contextInitialized`方法，这里就是eureka-server启动，初始化的入口。

```java
@Override
public void contextInitialized(ServletContextEvent event) {
  try {
    initEurekaEnvironment();
    initEurekaServerContext();

    ServletContext sc = event.getServletContext();
    sc.setAttribute(EurekaServerContext.class.getName(), serverContext);
  } catch (Throwable e) {
    logger.error("Cannot bootstrap eureka server :", e);
    throw new RuntimeException("Cannot bootstrap eureka server :", e);
  }
}
```

### initEurekaEnvironment

1. 在initEurekaEnvironment中，ConfigurationManager.getConfigInstance()初始化ConcurrentCompositeConfiguration实例，基于**双检锁单例模式**的配置管理器，管理eureka的所有配置，。
2. 初始化dataCenter，数据中心的配置，如果没有配置的话，就给个默认的（default）。
3. 初始化eureka.environment，默认是test环境。

### initEurekaServerContext

#### 加载eureka-server.properties文件中的配置

```java
EurekaServerConfig eurekaServerConfig = new DefaultEurekaServerConfig();
```

```
String eurekaPropsFile = EUREKA_PROPS_FILE.get();
```

DefaultEurekaServerConfig的init方法中，加载了一个properties文件，文件名默认叫eureka-server.properties（`EUREKA_PROPS_FILE`变量），通过ConfigurationManager加载到内存中，然后EurekaServerConfig的方法，再用configInstance获取对应的值。EurekaServerConfig是个接口，有很多get方法，包含了eureka server需要的所有配置，都可以通过这个接口获取。通过接口，对properties文件里的配置项进行了封装，增加了代码的可读性，不像我们自己可能做的有些项目里，读取配置文件都是去调用get某个key。

在DefaultEurekaServerConfig的方法中，也能看到大量的硬编码配置项和默认值。

#### 初始化ApplicationInfoManager

```java
EurekaInstanceConfig instanceConfig = isCloud(ConfigurationManager.getDeploymentContext())
  ? new CloudInstanceConfig()
  : new MyDataCenterInstanceConfig();

applicationInfoManager = new ApplicationInfoManager(
  instanceConfig, new EurekaConfigBasedInstanceInfoProvider(instanceConfig).get());
```

查看ApplicationInfoManager的javadoc说明，这个类用来初始化服务注册和被其他服务发现的一些配置，其中配置通过EurekaInstanceConfig设置，从MyDataCenterInstanceConfig的父类的构造方法可以看到，其实也是读取的eureka-client.properties文件加载的。和`DefaultEurekaServerConfig`一样`EurekaInstanceConfig`也是提供了一些方法，实际是从配置文件读取，同时也提供了默认值。

`new EurekaConfigBasedInstanceInfoProvider(instanceConfig).get()`方法返回了InstanceInfo。InstanceInfo是服务实例本身的信息，用**构造器模式**`InstanceInfo.Builder.newBuilder()`构造了一个`InstanceInfo.Builder`实例，从instanceConfig里获取了大量配置，再加创建的几个类完成了构造。

最后，EurekaInstanceConfig和InstnaceInfo，构造了ApplicationInfoManager，作为服务实例的一个管理器。

#### 初始化eureka-server内部的一个eureka-client（用来跟其他的eureka-server节点注册和通信的）

```java
EurekaClientConfig eurekaClientConfig = new DefaultEurekaClientConfig();
eurekaClient = new DiscoveryClient(applicationInfoManager, eurekaClientConfig);
```

DefaultEurekaClientConfig一样也是面向接口的配置项读取方式，也同样是读取了eureka-client.properties配置，不过它只读取了eureka开头的配置项，在DefaultEurekaTransportConfig里可看到，包含了很多client相关的配置项。**EurekaClientConfig**配置，和前面构建好的**ApplicationInfoManager**（包含了服务的实例信息、配置，作为服务实例管理的一个组件）构建了eurekaClient的子类DiscoveryClient。

DiscoveryClient我们可以看一下构造方法，初始化了很多东西，重点处理：

1. 是否需要拉取注册信息，shouldRegisterWithEureka
2. 是否要注册自己，shouldRegisterWithEureka
3. 初始化调度线程池，scheduler
4. 初始化心跳线程池，heartbeatExecutor
5. 初始化缓存刷新的线程池，cacheRefreshExecutor
6. new EurekaTransport()，支持底层eureka client和eureka server通信的一些初始化。
7. 如果要抓取注册表，则抓取注册表表，fetchRegistryFromBackup();
8. 初始化调度任务，initScheduledTasks(); 定时抓取注册表、心跳。初始化服务实例副本传播器（instanceInfoReplicator），服务实例状态变更监听器（statusChangeListener）。

#### 处理注册相关的事情

```java
registry = new PeerAwareInstanceRegistryImpl(
        eurekaServerConfig,
        eurekaClient.getEurekaClientConfig(),
        serverCodecs,
        eurekaClient
);
```

通过javadoc看下PeerAwareInstanceRegistryImpl是干什么用的：将所有操作复制到集群里对等的Eureka节点，以使它们保持同步。复制的主要操作是Registers,Renewals,Cancels,Expirations 和 Status Changes。

#### 处理peer节点相关的事情

```java
PeerEurekaNodes peerEurekaNodes = getPeerEurekaNodes(
        registry,
        eurekaServerConfig,
        eurekaClient.getEurekaClientConfig(),
        serverCodecs,
        applicationInfoManager
);
```

初始化Eureka集群的信息，PeerEurekaNode包含了每个节点自己分享给其他节点的信息。

#### 完成eureka-server上下文（context）的构建以及初始化

```java
serverContext = new DefaultEurekaServerContext(
        eurekaServerConfig,
        serverCodecs,
        registry,
        peerEurekaNodes,
        applicationInfoManager
);
EurekaServerContextHolder.initialize(serverContext);
```

serverContext.initialize方法中调用了peerEurekaNodes.start();，定时当前的eureka server同步集群里其他eureka server的一些信息。

registry.init(peerEurekaNodes);

用从集群获取的到的信息，初始化本实例的注册表。其实就是和集群之间的信息同步，这个研究这块的时候再细看。

#### 从相邻的eureka节点拷贝注册信息

```java
int registryCount = registry.syncUp();
```

看syncUp的javadoc，从一个节点拷贝注册信息，如果失败就换个节点。细节后面再看。

#### 处理监控统计项

```java
EurekaMonitors.registerAllStats();
```

注册一些监控和统计。

# 总结

启动流程，到这里就结束了，我们总结一下，源码里用了不少设计模式和优秀的实现机制，例如基于双检锁的单例模式、构建器模式，面向接口的配置读取等，这都是我们值得去学习的。

![eureka server启动流程图](/img/spring-cloud/eureka server启动流程图.jpg)