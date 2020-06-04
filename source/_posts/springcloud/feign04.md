---
title: Feign04-Feign超时和重试分析
date: 2020-04-18 22:05:39
tags: [spring-cloud,feign]
categories: spring-cloud
typora-root-url: ../../../source
---

# Feign超时和重试

**超时**

在微服务架构中，一个服务对服务的访问至少得配置一个超时时间，不可能请求一个接口等了好几分钟都还没有返回，在设置超时时间后，超时后就认为这次接口请求失败了。

**重试**

服务B调用服务A，服务A部署了3台机器，现在服务B通过负载均衡的算法，调用到了服务A的机器1，因为服务A的机器1宕机了，请求超时了，可以让服务B再次请求一次服务A的机器1，如果还是不行，再请求服务A的机器2，如果还是不行，就再请求服务A的服务3，这就是重试机制。

<!--more-->

## 在SpringCloud的Feign和Ribbon整合的时候，如何配置？

在早期的Feign也有重试的模块，但是后来发现和Ribbon冲突了，于是SpringCloud团队在后面的版本将Feign的重试设置为NERVER_RETRY了。具体的缘由，可以看下这篇文章：http://www.itmuch.com/spring-cloud-sum/spring-cloud-retry/

```yaml
ribbon:
  ConnectTimeout: 1000
  ReadTimeout: 1000
  # 是否所有操作都进行重试
  OkToRetryOnAllOperations: true
  # 同一实例最大重试次数，不包括首次调用
  MaxAutoRetries: 1
  # 重试其他实例的最大重试次数，不包括首次所选的server
  MaxAutoRetriesNextServer: 3
```

feign的超时时间优先级更高

```yaml
feign:
  client:
    config:
      feignName:
        connectTimeout: 5000
        readTimeout: 5000
```

## 超时和重试源码

### 超时

如果feign没有配置超时时间，则读取ribbon的配置，否则读取feign的超时配置

```java
IClientConfig getClientConfig(Request.Options options, String clientName) {
   IClientConfig requestConfig;
   if (options == DEFAULT_OPTIONS) {
      requestConfig = this.clientFactory.getClientConfig(clientName);
   } else {
      requestConfig = new FeignOptionsClientConfig(options);
   }
   return requestConfig;
}
```

FeignLoadBalancer.execute()，发送实际的http请求的时候，就会传入设置的超时参数

```java
if (configOverride != null) {
   options = new Request.Options(
         configOverride.get(CommonClientConfigKey.ConnectTimeout,
               this.connectTimeout),
         (configOverride.get(CommonClientConfigKey.ReadTimeout,
               this.readTimeout)));
}
else {
   options = new Request.Options(this.connectTimeout, this.readTimeout);
}
```



### 重试

#### Feign的重试

Feign本身也具备重试能力，在早期的Spring Cloud中，Feign使用的是 `feign.Retryer.Default#Default()` ，重试5次。但Feign整合了Ribbon，Ribbon也有重试的能力，此时，就可能会导致行为的混乱。

Spring Cloud意识到了此问题，因此做了改进，将Feign的重试改为 `feign.Retryer#NEVER_RETRY` ，如需使用Feign的重试，只需使用Ribbon的重试配置即可。

SynchronousMethodHandler.invoke()方法里面，如果抛了异常的话，也会默认根据Retryer进行重试。

相关Issue可参考：https://github.com/spring-cloud/spring-cloud-netflix/issues/467

```java
@Override
public Object invoke(Object[] argv) throws Throwable {
  RequestTemplate template = buildTemplateFromArgs.create(argv);
  // 重试，这个默认是NEVER_RETRY
  Retryer retryer = this.retryer.clone();
  while (true) {
    try {
      return executeAndDecode(template);
    } catch (RetryableException e) {
      retryer.continueOrPropagate(e);
      if (logLevel != Logger.Level.NONE) {
        logger.logRetry(metadata.configKey(), logLevel);
      }
      continue;
    }
  }
}
```

#### Ribbon的重试

因为SpringCloud的Feign重试默认是NEVER_RETRY，所以主要是靠Ribbon的重试机制。

FeignLoadBalancer.getRequestSpecificRetryHandler()方法中，会读取配置的几个参数：OkToRetryOnAllOperations、MaxAutoRetries、MaxAutoRetriesNextServer

```java
@Override
public RequestSpecificRetryHandler getRequestSpecificRetryHandler(
      RibbonRequest request, IClientConfig requestConfig) {
   if (this.clientConfig.get(CommonClientConfigKey.OkToRetryOnAllOperations,
         false)) {
      return new RequestSpecificRetryHandler(true, true, this.getRetryHandler(),
            requestConfig);
   }
   if (!request.toRequest().method().equals("GET")) {
      return new RequestSpecificRetryHandler(true, false, this.getRetryHandler(),
            requestConfig);
   }
   else {
      return new RequestSpecificRetryHandler(true, true, this.getRetryHandler(),
            requestConfig);
   }
}
```



 LoadBalancerCommand.submit()方法中，读取RetryHandler中配置的参数，会根据请求的情况，是否报错，是否报异常，进行重试的控制

```java
final int maxRetrysSame = retryHandler.getMaxRetriesOnSameServer();
final int maxRetrysNext = retryHandler.getMaxRetriesOnNextServer();
```

LoadBalancerCommand包含了大量的重试逻辑，这里是判断是否对同一台机器进行重试

```java
if (maxRetrysSame > 0) 
  o = o.retry(retryPolicy(maxRetrysSame, true));
```

重试都会进入retryPolicy方法，判断是否需要进行重试，然后利用rxjava的retry方法进行重试。

```java
// LoadBalancerCommand.java
private Func2<Integer, Throwable, Boolean> retryPolicy(final int maxRetrys, final boolean same) {
    return new Func2<Integer, Throwable, Boolean>() {
        @Override
        public Boolean call(Integer tryCount, Throwable e) {
            if (e instanceof AbortExecutionException) {
                return false;
            }

            if (tryCount > maxRetrys) {
                return false;
            }
            
            if (e.getCause() != null && e instanceof RuntimeException) {
                e = e.getCause();
            }
            
            return retryHandler.isRetriableException(e, same);
        }
    };
}
```

对其他机器进行重试

```java
if (maxRetrysNext > 0 && server == null) 
    o = o.retry(retryPolicy(maxRetrysNext, false));
```

> 上面的逻辑是服务宕机的时候的重试逻辑，在超时的时候重试逻辑却是在RetryableFeignLoadBalancer里