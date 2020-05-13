---
title: Zuul01-网关介绍和基本使用
tags: [spring-cloud,zuul]
date: 2020-05-10 11:23:59
categories: spring-cloud
typora-root-url: ../../../source
---

# 为什么微服务需要网关

在微服务架构中，通常会有多个服务提供者。设想一个电商系统，可能会有商品、订单、支付、用户等多个类型的服务，而每个类型的服务数量也会随着整个系统体量的增大也会随之增长和变更。作为UI端，在展示页面时可能需要从多个微服务中聚合数据，而且服务的划分位置结构可能会有所改变。网关就可以对外暴露聚合API，屏蔽内部微服务的微小变动，保持整个系统的稳定性。

<!--more-->

当然这只是网关众多功能中的一部分，它还可以做负载均衡，统一鉴权，协议转换，监控监测等一系列功能。

1. 统一安全认证
2. 统一限流
3. 统一降级
4. 统一异常处理
5. 统一请求统计
6. 统一超时

![sgxpes8edv](/img/spring-cloud/sgxpes8edv.png)

# Zuul

用一张图过一下zuul的核心原理，Zuul是一个责任链模式

![Zuul核心原理](/img/spring-cloud/Zuul核心原理.jpg)

过滤器前面的数字，表示执行的时候的顺序

## pre过滤器

* -3：ServletDetectionFilter

* -2：Servlet30WrapperFilter

* -1：FromBodyWrapperFilter

* 1：DebugFilter

* 5：PreDecorationFilter

## routing过滤器

* 10：RibbonRoutingFilter

* 100：SimpleHostRoutingFilter

* 500：SendForwardFilter

## post过滤器

* 1000：SendResponseFilter 

## error过滤器 

* 0：SendErrorFilter

# 基本用法

## 路由规则配置

### 简单路由

SimpleHostRoutingFilter 往指定的地址路由

```properties
# SimpleHostRoutingFilter 往指定的地址跳
zuul.routes.demo.path=/ServiceB/**
zuul.routes.demo.url=http://localhost:9090/ServiceB
# 这是配置连接到目标主机的最大http连接数，是用来配置http连接池的，默认是200
zuul.host.maxTotalConnections=200
# 就是每个主机的初始连接数，默认是20
zuul.host.maxPerRouteConnections=20
```

### 跳转路由

SendForwardFilter 往自己的接口跳转

```properties
# SendForwardFilter 往自己的接口跳
zuul.routes.demo.path=/test/**
zuul.routes.demo.url=forward: /gateway/sayHello
```

### Ribbon路由

RibbonRoutingFilter 基于Ribbon的服务路由

```properties
# RibbonRoutingFilter
zuul.routes.ServiceB.path=/demo/**
zuul.routes.ServiceB.serviceId=ServiceB

# 简化写法
zuul.routes.ServiceB.path=/demo/**

```

### 自定义路由规则

请求：test/**的路径，转发给zuul-test-service

```java
@Configuration
public class MyRouteRuleConfig {
  @Bean
  public PatternServiceRouteMapper patternServiceRouteMapper() {
     return new PatternServiceRouteMapper("(zuul)-(?<test>.+)-(service)", "${test}/**");
  }
}
```

### 忽略路由

```properties
zuul.ignoredPatterns=/ServiceB/test
```

## 其他配置

### 请求头配置

默认情况下，zuul有些敏感的请求头不会转发给下游的服务，比如：Cookie、Set-Cookie、Authorization，也可以自己配置敏感请求头

```properties
zuul.sensitiveHeaders=accept-language, cookie
zuul.routes.demo.sensitiveHeaders=cookie
```

### 路由映射信息

在Zuul项目中，引入actuator依赖，然后在配置文件中，将`management.security.enabled`设置为false，就可以访问`/actuator/routes`地址，然后可以看到路由的映射信息

### hystrix配置

与Ribbon整合的时候，会使用Hystrix，可以在网关写统一的降级实现：

```java
public class ServiceBFallbackProvider implements ZuulFallbackProvider {

  public String getRoute() {
    // 服务名，一般都设置全局的降级
    return "*";
  }

  public ClientHttpResponse fallbackResponse() {
    return new ClientHttpResponse() {
  }
  
  public InputStream getBody() throws IOException {
    return new ByteArrayInputStream("fallback".getBytes());
  }

  public HttpHeaders getHeaders() {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.TEXT_PLAIN);
    return headers;
  }

  public HttpStatus getStatusCode() throws IOException {
    return HttpStatus.OK;
  }

  public int getRawStatusCode() throws IOException {
    return 200;
  }

  public String getStatusText() throws IOException {
    return "OK";
  }

  public void close() {

  }
}

@Configuration
public class FallbackConfig {

  @Bean
  public ZuulFallbackProvider fallbackProvider() {
  	return new ServiceBFallbackProvider();
  }
}
```

### ribbon客户端预加载

默认情况下，第一次请求zuul才会初始化ribbon客户端，所以可以配置预加载

```properties
zuul.ribbon.eager-load.enabled=true
```

### 超时配置

Zuul用的是ribbon+Hystrix，所以设置超时得考虑这2个组件的配置，而且hystrix的超时要考虑ribbon的重试次数和单次超时时间。

hystrix的超时时间计算公式如下：

(ribbon.ConnectTimeout + ribbon.ReadTimeout) * (ribbon.MaxAutoRetries + 1) * (ribbon.MaxAutoRetriesNextServer + 1)

```properties
ribbon.ReadTimeout=100
ribbon.ConnectTimeout=500
ribbon.MaxAutoRetries=1
ribbon.MaxAutoRetriesNextServer=1
```

如果不配置ribbon的超时时间，默认的hystrix超时时间是4000ms

## 过滤器

### 自定义过滤器

```java
public class MyFilter extends ZuulFilter {
  public boolean shouldFilter() {
    // 是否要执行过滤器
    return true;
  }

  publici Object run() {
    System.out.println("执行过滤器");
    return null;
  }

  // 在哪个阶段执行
  public String filterType() {
    return FilterConstants.ROUTE_TYPE;
  }

  // 这是过滤器的优先级
  public int filterOrder() {
    return 1;
  }
}

@Configuration
public class FilterConfig {

  @Bean
  public MyFilter myFilter() {
    return new MyFilter();
  }
}
```

### groovy动态加载过滤器

加入依赖

```xml
<dependency>
  <groupId>org.codehaus.groovy</groupId>
  <artifactId>groovy-all</artifactId>
  <version>2.4.12</version>
</dependency>
```

增加代码配置

```java
@PostConstruct
public void zuulInit() {
    FilterLoader.getInstance().setCompiler(new GroovyCompiler());
    String scriptRoot = System.getProperty("zuul.filter.root", "groovy/filters");
    String refreshInterval = System.getProperty("zuul.filter.refreshInterval", "5");
    if(scriptRoot.length() > 0) {
        scriptRoot = scriptRoot + File.separator;
    }
    try {
        FilterFileManager.setFilenameFilter(new GroovyFileFilter());
        FilterFileManager.init(Integer.parseInt(refreshInterval), scriptRoot + "pre", scriptRoot + "route", scriptRoot + "post");
    }
    catch(Exception e) {
        throw new RuntimeException(e);
    }
}
```



```properties
zuul.filter.root=groovy/filters
zuul.filter.refreshInterval=5
```

然后将groovy编写的过滤器，放在`groovy/filters`文件夹下，几秒后就会生效。

### 禁用过滤器

```properties
zuul.SendForwardFilter.route.disable=true
```

### @EnableZuulServer

会自动禁用掉PreDecorationFilter、RibbonRoutingFilter、SimpleHostRoutingFilter等过滤器

### error过滤器

在自定义的过滤器有异常可以抛一个ZuulException，然后写一个MyErrorController，继承BasicErrorController，统一处理异常。