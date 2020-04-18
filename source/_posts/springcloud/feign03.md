---
title: Feign03-Feign请求处理机制分析
date: 2020-04-18 13:05:39
tags: [spring-cloud,feign]
categories: spring-cloud
---

# 接口方法与MethodHandler映射map的生成机制

在开始之前，先说一下FeignClient接口的上的SpringMVC注解是如何被解析的，回顾到之前生成动态代理的时候，有个nameToHandler的map，有一句非常关键的代码。

```java
Map<String, MethodHandler> nameToHandler = targetToHandlersByName.apply(target);
```

这里面就完成了SpringMVCContract对方法的解析

```java
// ReflectiveFeign.java
public Map<String, MethodHandler> apply(Target key) {
  // 这就用contract完成了方法上的SpringMVC注解的转换
  // ServiceAClient的每一个方法都会被解析成MethodMetadata
  // 对各种SpringMVC的注解进行解析，将解析出来的header，method，path，body,form param，返回值等等等，放入了MethodMetadata中
  List<MethodMetadata> metadata = contract.parseAndValidatateMetadata(key.type());
  Map<String, MethodHandler> result = new LinkedHashMap<String, MethodHandler>();
  // 遍历方法元数据
  for (MethodMetadata md : metadata) {
    BuildTemplateByResolvingArgs buildTemplate;
    if (!md.formParams().isEmpty() && md.template().bodyTemplate() == null) {
      buildTemplate = new BuildFormEncodedTemplateFromArgs(md, encoder);
    } else if (md.bodyIndex() != null) {
      buildTemplate = new BuildEncodedTemplateFromArgs(md, encoder);
    } else {
      buildTemplate = new BuildTemplateByResolvingArgs(md);
    }
    // 在这里就创建了SynchronousMethodHandler，key就是方法名
    // SynchronousMethodHandler就是所有的方法被代理后实际处理的处理器
    result.put(md.configKey(),
               factory.create(key, md, buildTemplate, options, decoder, errorDecoder));
  }
  return result;
}
```

<!--more-->

## 画个图

![接口方法与MethodHandler映射map的生成机制](/img/spring-cloud/接口方法与MethodHandler映射map的生成机制.jpg)



# Feign请求处理大体流程

![Feign基于动态代理处理请求的机制](/img/spring-cloud/Feign基于动态代理处理请求的机制.jpg)

# 请求流程分析

## 动态代理拦截Client所有的方法调用

在动态代理生成以后，动态代理所有的调用都会被FeignInvocationHandler拦截，所以我们分析实际的请求流程，需要去查看invoke方法。

```java
// ReflectiveFeign.java
@Override
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
  // 排除掉equals等方法
  if ("equals".equals(method.getName())) {
    try {
      Object
          otherHandler =
          args.length > 0 && args[0] != null ? Proxy.getInvocationHandler(args[0]) : null;
      return equals(otherHandler);
    } catch (IllegalArgumentException e) {
      return false;
    }
  } else if ("hashCode".equals(method.getName())) {
    return hashCode();
  } else if ("toString".equals(method.getName())) {
    return toString();
  }
  // 这个dispatch，就是Map<Method, MethodHandler> dispatch;
  // 那么拿到的对象就是SynchronousMethodHandler，然后将参数传过去了
  return dispatch.get(method).invoke(args);
}
```

## 将方法上的请求参数封装到RequestTemplate里

Map<Method, MethodHandler> dispatch;维护了方法对象和SynchronousMethodHandler的映射，所以流程到这里，直接跟到SynchronousMethodHandler利的invoke方法去看看。

```java
// SynchronousMethodHandler.java
@Override
public Object invoke(Object[] argv) throws Throwable {
  // 又是关键代码，用于替换PathVariable、@RequestParam以及RequestBody
  RequestTemplate template = buildTemplateFromArgs.create(argv);
  Retryer retryer = this.retryer.clone();
  while (true) {
    try {
      // 发起调用
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

将拿到的参数拼到url上，例如 /user/{id}拼接成， /user/1?name=xxx&age=19

## 执行所有的RequestInterceptor

然后开始调用executeAndDecode方法，执行http调用的逻辑

```java
// SynchronousMethodHandler.java
Object executeAndDecode(RequestTemplate template) throws Throwable {
  // 遍历请求拦截器，将每个请求拦截都应用到RequestTemplate模板上去，也就是让每个请求拦截器对请求进行处理
  // 并创建可用于发送请求的Request对象
  Request request = targetRequest(template);
	
  if (logLevel != Logger.Level.NONE) {
    logger.logRequest(metadata.configKey(), logLevel, request);
  }

  Response response;
  long start = System.nanoTime();
  try {
    // 将请求的参数都传入了进去，连接超时时间都是10s，读超时时间是60s
    response = client.execute(request, options);
    // ensure the request is set. TODO: remove in Feign 10
    response.toBuilder().request(request).build();
  ....
}

/**
 * 遍历请求拦截器，将每个请求拦截都应用到RequestTemplate模板上去，也就是让每个请求拦截器对请求进行处理
 */
Request targetRequest(RequestTemplate template) {
  for (RequestInterceptor interceptor : requestInterceptors) {
    interceptor.apply(template);
  }
  return target.apply(new RequestTemplate(template));
}
```



1. 遍历请求拦截器，将每个请求拦截都应用到RequestTemplate模板上去，也就是让每个请求拦截器对请求进行处理
2. 基于RequestTemplate创建一个Request对象，用于发送请求
3. 将请求的参数都传入了进去，连接超时时间都是10s，读超时时间是60s。基于LoadBalancerFeignClient进行了请求的处理和发送，同时获取了Response。

## 获得负载均衡器选择服务发起请求

```java
// LoadBalancerFeignClient.execute
@Override
public Response execute(Request request, Request.Options options) throws IOException {
   try {
      URI asUri = URI.create(request.url());
      // 获取请求的服务名称，也就是ServiceA
      String clientName = asUri.getHost();
      // 从请求URL中剔除了服务名称，
      URI uriWithoutHost = cleanUrl(request.url(), clientName);
      // 基于去除了服务名称的地址创建了一个RibbonRequest
      FeignLoadBalancer.RibbonRequest ribbonRequest = new FeignLoadBalancer.RibbonRequest(
            this.delegate, request, uriWithoutHost);
			// 这是ribbon的配置
      IClientConfig requestConfig = getClientConfig(options, clientName);
      // 创建FeignLoadBalancer，封装了ribbon的ILoadBalancer（重点）
      return lbClient(clientName).executeWithLoadBalancer(ribbonRequest,
            requestConfig).toResponse();
   }
   catch (ClientException e) {
      IOException io = findIOException(e);
      if (io != null) {
         throw io;
      }
      throw new RuntimeException(e);
   }
}
```

1. 获取请求的服务名称，也就是ServiceA
2. 从请求URL中剔除了服务名称
3. 基于去除了服务名称的地址创建了一个RibbonRequest
4. 读取某个服务ribbon的配置IClientConfig
5. 创建FeignLoadBalancer，封装了ribbon的ILoadBalancer（重点）

## Feign是如何与Ribbon进行整合的

上面已经创建了FeignLoadBalancer，他内部封装了Ribbon的ILoadBalancer，所以要重点分析下他究竟是如何与Ribbon进行整合的，用的是Ribbon的哪一个ILoadBalancer。

```java
// CachingSpringLoadBalancerFactory.java
public FeignLoadBalancer create(String clientName) {
   if (this.cache.containsKey(clientName)) {
      return this.cache.get(clientName);
   }
   IClientConfig config = this.factory.getClientConfig(clientName);
   // 从SpringClientFactory获取，SpringClientFactory就是Ribbon初始化的时候创建的，所以这里获取到的是ZoneAwareLoadBalancer
   ILoadBalancer lb = this.factory.getLoadBalancer(clientName);
   ServerIntrospector serverIntrospector = this.factory.getInstance(clientName, ServerIntrospector.class);
   FeignLoadBalancer client = enableRetry ? new RetryableFeignLoadBalancer(lb, config, serverIntrospector,
      loadBalancedRetryPolicyFactory, loadBalancedBackOffPolicyFactory, loadBalancedRetryListenerFactory) : new FeignLoadBalancer(lb, config, serverIntrospector);
   this.cache.put(clientName, client);
   return client;
}
```

从SpringClientFactory获取ILoadBalancer等组件，SpringClientFactory就是Ribbon初始化的时候创建的，所以这里获取到的是ZoneAwareLoadBalancer，这里也就自然的与Eureka完成了整合。

## FeignLoadBalancer如何负载均衡选择Server

进入到executeWithLoadBalancer方法中构造了一个LoadBalancerCommand，然后下面的submit方法，有一个匿名内部类ServerOperation的的实现传进去。

```java
// AbstractLoadBalancerAwareClient.executeWithLoadBalancer
public T executeWithLoadBalancer(final S request, final IClientConfig requestConfig) throws ClientException {
    LoadBalancerCommand<T> command = buildLoadBalancerCommand(request, requestConfig);

    try {
        // 这提交了一个匿名内部类进去，那么ServerOperation.call方法就一定会在submit方法里被调用
        return command.submit(
            new ServerOperation<T>() {
                @Override
                public Observable<T> call(Server server) {
                    URI finalUri = reconstructURIWithServer(server, request.getUri());
                    S requestForServer = (S) request.replaceUri(finalUri);
                    try {
                        return Observable.just(AbstractLoadBalancerAwareClient.this.execute(requestForServer, requestConfig));
                    } 
                    catch (Exception e) {
                        return Observable.error(e);
                    }
                }
            })
            .toBlocking()
            .single();
      .....
```

提交了一个匿名内部类作为参数，那么ServerOperation.call方法就一定会在submit方法里被调用，跟到submit方法里去看下，因为是第一次进入，所以server肯定是null，selectServer()方法，看名字明显就是调用负载均衡选择服务实例的方法。

```java
// LoadBalancerCommand.java
public Observable<T> submit(final ServerOperation<T> operation) {
    final ExecutionInfoContext context = new ExecutionInfoContext();
    
    if (listenerInvoker != null) {
        try {
            listenerInvoker.onExecutionStart();
        } catch (AbortExecutionException e) {
            return Observable.error(e);
        }
    }
		// ribbon的重试参数
    final int maxRetrysSame = retryHandler.getMaxRetriesOnSameServer();
    final int maxRetrysNext = retryHandler.getMaxRetriesOnNextServer();

    // Use the load balancer
    // selectServer 负载均衡选择实例
    Observable<T> o = 
            (server == null ? selectServer() : Observable.just(server))
      ......省略部分代码
      // 选择出服务实例后，对operation进行回调，进行url的替换，然后发起真正的http请求
      return operation.call(server)...
      ......胜率部分代码
      
// 选择一个服务实例
private Observable<Server> selectServer() {
    return Observable.create(new OnSubscribe<Server>() {
        @Override
        public void call(Subscriber<? super Server> next) {
            try {
                // 读取host信息，也就是服务名，然后调用负载均衡器chooseServer方法选择一个服务实例
                Server server = loadBalancerContext.getServerFromLoadBalancer(loadBalancerURI, loadBalancerKey);   
                next.onNext(server);
                next.onCompleted();
            } catch (Exception e) {
                next.onError(e);
            }
        }
    });
}
```

1. 构造了一个LoadBalancerCommand
2. 构造了一个ServerOperation，包含了发起http调用的逻辑，作为参数传入LoadBalancerCommand.submit方法，后面会进行回调
3. 在submit方法中，会调用selectServer方法，选择服务实例
4. selectServer方法调用loadBalancerContext.getServerFromLoadBalancer，最终调用负载均衡器[chooseServer](http://www.saily.top/2020/03/31/springcloud/ribbon01/#%E8%B4%9F%E8%BD%BD%E5%9D%87%E8%A1%A1%E7%AE%97%E6%B3%95%E5%A6%82%E4%BD%95%E9%80%89%E6%8B%A9%E4%B8%80%E4%B8%AAserver)方法选择一个服务实例，
5. 拿到服务实例后，将Server对象传入ServerOperation的call方法进行回调
6. ServerOperation用server的信息替换host里的服务名，拿到真正的请求地址
7. 再调用子类也就是FeignLoadBalancer.execute方法执行http请求
8. 默认的connectTimeout和readTimeout都是1000毫秒
9. 响应结果封装为RibbonResponse

## 收到响应后将json串转换成对象

回到最初的SynchronousMethodHandler方法里，在executeAndDecode方法中，`response = client.execute(request, options);`在拿到RibbonResponse以后，开始进行对响应的处理

```java
Object executeAndDecode(RequestTemplate template) throws Throwable {
  Request request = targetRequest(template);

  if (logLevel != Logger.Level.NONE) {
    logger.logRequest(metadata.configKey(), logLevel, request);
  }

  Response response;
  long start = System.nanoTime();
  try {
    // 前面已经执行完这里的代码了，拿到了RibbonResponse
    response = client.execute(request, options);
    // ensure the request is set. TODO: remove in Feign 10
    response.toBuilder().request(request).build();
  } catch (IOException e) {
    if (logLevel != Logger.Level.NONE) {
      logger.logIOException(metadata.configKey(), logLevel, e, elapsedTime(start));
    }
    throw errorExecuting(request, e);
  }
  long elapsedTime = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);

  boolean shouldClose = true;
  try {
    if (logLevel != Logger.Level.NONE) {
      response =
          logger.logAndRebufferResponse(metadata.configKey(), logLevel, response, elapsedTime);
      // ensure the request is set. TODO: remove in Feign 10
      response.toBuilder().request(request).build();
    }
    if (Response.class == metadata.returnType()) {
      if (response.body() == null) {
        return response;
      }
      if (response.body().length() == null ||
              response.body().length() > MAX_RESPONSE_BUFFER_SIZE) {
        shouldClose = false;
        return response;
      }
      // Ensure the response body is disconnected
      byte[] bodyData = Util.toByteArray(response.body().asInputStream());
      return response.toBuilder().body(bodyData).build();
    }
    if (response.status() >= 200 && response.status() < 300) {
      if (void.class == metadata.returnType()) {
        return null;
      } else {
        // 关键代码在这里
        return decode(response);
      }
    } else if (decode404 && response.status() == 404 && void.class != metadata.returnType()) {
      return decode(response);
    } else {
      throw errorDecoder.decode(metadata.configKey(), response);
    }
  } catch (IOException e) {
    if (logLevel != Logger.Level.NONE) {
      logger.logIOException(metadata.configKey(), logLevel, e, elapsedTime);
    }
    throw errorReading(request, response, e);
  } finally {
    if (shouldClose) {
      ensureClosed(response.body());
    }
  }
}
```

拿到响应以后，执行decode方法，这个decoder默认是ResponseEntityDecoder，将json字符串转换成java对象，也就是方法的返回类型，metadata.returnType()。

```java
Object decode(Response response) throws Throwable {
  try {
    return decoder.decode(response, metadata.returnType());
  } catch (FeignException e) {
    throw e;
  } catch (RuntimeException e) {
    throw new DecodeException(e.getMessage(), e);
  }
}
```

## 画个图总结

![Feign请求处理机制](/img/spring-cloud/Feign请求处理机制-7217603.jpg)

