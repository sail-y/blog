---
title: Spring Cloud 不停机发布服务(0-downtime Blue/Green deployments)
date: 2018-04-14 14:06:48
tags: [spring-cloud,微服务,灰度发布]
categories: spring
---


## 背景

项目初期由于BUG和需求改动可能都会比较多，我们会很频繁的发布我们的应用。但是如果不进行处理，在升级的过程中会导致用户服务中断。
<!--more-->

通常我们需要发布的内容如下：

1. 某一个服务BUG紧急修复。
2. 某一个服务新的需求上线。



实际上针对这两种情况，在传统的应用中我们是很容易做到不停机升级的。例如nginx负载均衡2台tomcat实例，在升级的时候切断其中一台访问，升级完成以后切换流量，再升级另外一台。但是我这里用的是Spring Cloud，所有的实例状态都维护在Eureka中，Eureka本身也提供了很多保护机制，所以你的服务在down掉的时候，不会立马从服务列表中剔除掉。具体的配置项可以周立老师一篇文章里查看：[如何解决Eureka Server不踢出已关停的节点的问题](http://www.itmuch.com/spring-cloud-sum-eureka/)。

所以如果我们想要做到不停机去升级/发布一个服务，需要我们从Spring Cloud架构本身上着手去进行一些改造。我们需要去了解Eureka的使用方式，Spring Retry的使用，Spring Cloud的负载均衡规则等等，最终达到这个目的。



## 思路

如果一个不了解Spring Cloud的人来做这种不停机发布，比如运维部门的同事。他会将某个需要升级的实例新版本启动起来，然后将老版本的进程杀掉。但是因为Spring Cloud的特性，被干掉的实例并没有被踢出服务列表，客户端仍然会访问到一个不存在的实例，直接返回500错误。可能需要等1~2分钟以后才能恢复正常。

我们知道这个是因为Eureka的机制问题，但是它注定不可能做成实时感知上下线的。Eureka是通过定期扫描去下线已经down掉的服务，不过他的默认时间是60秒，我们可以优化这个配置，让它能比较快的感知到服务已经下线。


## 关于Eureka的常见问题

* 问题可以参考：[Spring Cloud中，Eureka常见问题总结](http://www.itmuch.com/spring-cloud-sum-eureka/)

* 生产环境最佳配置：[eureka缓存细节以及生产环境的最佳配置](http://www.saily.top/2018/04/14/spring-cloud-eureka/)


**中小规模生产环境参考配置：**

**Eureka Server**

```yaml
eureka:
  server:
    enable-self-preservation: false           # 中小规模下，自我保护模式坑比好处多，所以关闭它
    eviction-interval-timer-in-ms: 5000       # 续期时间，即扫描失效服务的间隔时间（缺省为60*1000ms）从服务列表中剔除
    use-read-only-response-cache: false       # 禁用readOnlyCacheMap
  instance:
      lease-renewal-interval-in-seconds: 5      # 心跳时间，即服务续约间隔时间（缺省为30s）
      lease-expiration-duration-in-seconds: 10  # 没有心跳的淘汰时间，10秒，即服务续约到期时间（缺省为90s）
  client:
    service-url:
      defaultZone: ${defaultZone:http://peer2:8760/eureka/}
```


**Eureka Client**

```yaml
eureka:
  instance:
    lease-renewal-interval-in-seconds: 5      # 心跳时间，即服务续约间隔时间（缺省为30s）
    lease-expiration-duration-in-seconds: 10  # 没有心跳的淘汰时间，10秒，即服务续约到期时间（缺省为90s）
  client:
    # 向注册中心注册
    fetch-registry: true
    # 服务清单的缓存更新时间，默认30秒一次
    registry-fetch-interval-seconds: 5
    service-url:
      defaultZone: ${defaultZone:http://${DISCOVERY_URL:discovery}:8761/eureka/}
```

通过优化Eureka配置，服务在启动后能够较快的被使用上，Eureka也能较快的感知到服务以及下线并踢出服务列表。

## 巧用Spring Retry重试机制

我在搜寻解决方案的时候，也看到了Github上讨论的一个issue：[Best practices for using Eureka for 0-downtime Blue/Green deployments #1290](https://github.com/spring-cloud/spring-cloud-netflix/issues/1290).

这里面讨论了利用重试机制去实现不停机发布的一种方式。前面的Eureka配置已经缩短了服务上线和服务下线的时间，但是这中间仍然一段延迟，可能还是会有请求随机访问一个不存在的服务实例上。

重试机制的原理就是利用Spring Cloud提供的重试机制在请求访问出现错误的时候自动重试当前实例或者其他实例，而不是直接返回错误。

主要配置如下：

```yaml
ribbon:
  # ribbon缓存时间
  ServerListRefreshInterval: 2000
  ReadTimeout: 30000
  ConnectTimeout: 30000
  # 是否所有操作都重试
  # OkToRetryOnAllOperations: true
  # 重试负载均衡其他的实例最大重试次数,不包括首次server
  MaxAutoRetriesNextServer: 0
  # 同一台实例最大重试次数,不包括首次调用
  MaxAutoRetries: 0
zuul:
  retryable: true
```

但是这里要注意一点，`OkToRetryOnAllOperations`如果设置为true，那么ribbon超时时间最好设置长一点，否则post等请求如果超时会被提交多次，还要注意hystrix的超时时间要大于ribbion的超时时间，否则hystrix会先超时。

```yaml
hystrix:
  command:
    default:
      execution:
        isolation:
          thread:
            timeoutInMilliseconds: 40000
```



在不同的版本中，Spring Cloud的重试机制是比较混乱的，周立老师对重试机制的详细解释：http://www.itmuch.com/spring-cloud-sum/spring-cloud-retry/

Feign本身也具备重试能力，在早期的Spring Cloud中，Feign使用的是 `feign.Retryer.Default#Default()` ，重试5次。但Feign整合了Ribbon，Ribbon也有重试的能力，此时，就可能会导致行为的混乱。

Spring Cloud意识到了此问题，因此做了改进，将Feign的重试改为 `feign.Retryer#NEVER_RETRY` ，如需使用Feign的重试，只需使用Ribbon的重试配置即可。因此，对于Camden以及以后的版本，Feign的重试可使用如下属性进行配置：

```yaml
ribbon:
  MaxAutoRetries: 1
  MaxAutoRetriesNextServer: 2
  OkToRetryOnAllOperations: false
```

相关Issue可参考：https://github.com/spring-cloud/spring-cloud-netflix/issues/467


结合之前对Eureka配置的优化，我们就可以愉快的进行测试了，开启2个服务访问几次，可以发现随机访问。然后干掉一个服务，再次访问，依然没有问题，不会出现500等情况。Feign自动为我们选择了另外可用的服务发送了重试请求。


## 灰度发布方案

还有一种特别的需求，我们除了想做到不停机发布，可能还需要做到某些用户测试新版本代码，实现降级、限流、滚动、灰度、AB、金丝雀等操作。我在Github上发现了一个开源的代码在一定程度上提供了很好的思路去做这个事情。地址：https://github.com/JeromeLiuLly/springcloud-gray

看这个实现方式可以看出来，他的方案是基于[spring cloud 实践-降级、限流、滚动、灰度、AB、金丝雀等等等等](https://www.jianshu.com/p/37ee1e84900a)的方案做的。

因Spring Cloud都是客户端负载均衡，会从Eureka读取服务列表，然后通过一定的负载均衡规则来选择请求的服务器。这个方案就是重写了Ribbon负载均衡的策略，将一些自定义信息放入了Eureka的metdata-map中，在路由的时候根据这些信息来选择服务。我这里不再多说，大家可以自行去查看他们的文章和代码。

这个方案灵活性非常大，你可以根据自定义的信息来构建任何你想做的策略，去实现AB Test等等功能，甚至我在开发环境中也能使用。举个例子，因为我们的服务太多了，如果在本机开发的时候，关联的服务较多，要启动比较多的服务才能够进行开发和测试，可能机器会有点吃不消。我基于上述方案让开发的同学们在启动服务的上将本机的IP添加到`metadata-map`中，这样我在路由的时候判断客户端请求过来的IP是多少，如果跟实例里的信息匹配，那么所有来自这个IP请求就转发到开发同学启动的那台实例上。



