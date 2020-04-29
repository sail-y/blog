---
title: SpringCloud组件的各种MaxTotalConnections详解
date: 2020-04-29 22:05:39
tags: [spring-cloud]
categories: spring-cloud
typora-root-url: ../../../source
---

# 背景

在zuul网关中，有关于配置连接数量的配置：

```yaml
zuul:
  host:
    max-per-route-connections: 20 #默认值
    max-total-connections: 200 #默认值
```

这个是只是的zuul调用静态路由配置的Http连接池数量，按照实际情况设置就好（请注意不要和Tomcat的maxConnections搞混了）。

这个配置并不会对基于Ribbon的下游服务访问生效，如果要配置Ribbon相关的配置，需要配置以下的配置：

```yaml
ribbon:
  MaxConnectionsPerHost: 50 #默认值
  MaxTotalConnections: 200 #默认值
```

<!--more-->

还有Feign的配置：

```yaml
feign:
  httpclient:
    enabled: true
      max-connections: 200 # 默认值 
      max-connections-per-route: 50 # 默认值
```

那么问题来了，在服务中既有Feign，又有Ribbon，那如果都配置了，是用哪一个配置？仔细的分析了一下，情况还比较复杂。

# zuul.host.max-per-route-connections

刚才说这个配置和基于RIbbon调用服务没有什么关系，放个证据看一下，SimpleHostRoutingFilter是用于静态路由的具体请求处理类，这里面的初始化代码就是读取这个参数，并进行连接池的配置。

```java
// SimpleHostRoutingFilter.java
@PostConstruct
private void initialize() {
   if(!customHttpClient) {
      this.connectionManager = connectionManagerFactory.newConnectionManager(
            !this.sslHostnameValidationEnabled,
            this.hostProperties.getMaxTotalConnections(),
            this.hostProperties.getMaxPerRouteConnections(),
            this.hostProperties.getTimeToLive(), this.hostProperties.getTimeUnit(),
            null);
      this.httpClient = newClient();
      this.connectionManagerTimer.schedule(new TimerTask() {
         @Override
         public void run() {
            if (SimpleHostRoutingFilter.this.connectionManager == null) {
               return;
            }
            SimpleHostRoutingFilter.this.connectionManager.closeExpiredConnections();
         }
      }, 30000, 5000);
   }
}
```

# Ribbon

## 服务里的Ribbon

先说在服务里只有Ribbon，并没有引入Feign的情况下，用RestTemplate发送请求，底层是通过SimpleBufferingClientHttpRequest发起实际http请求，用的是JDK原生的http。

所以在什么都不配置的情况下，上面的`ribbon.MaxConnectionsPerHost`配置是没有用的，而且我从这个源码看下来，像那些重试参数什么的，应该都没有用。他仅仅只是给RestTemplate赋予了负载均衡的功能，其他什么都没有控制。

在`RibbonClientConfiguration`类中，还额外Import了几个关于HttpClient的类，但是在默认情况下，都没什么用。

所以其实在服务里边，什么`ribbon.okhttp.enable`，`ribbon.httpclient.enable`，配置了以后，他只会去注册这些bean，不会被用到。自己搞的那个RestTemplate，用的就是spring默认的JDK 原生http组件。



### **结论**

基于RestTemplate的方式使用Ribbon，在yaml里的大多数配置都不会生效，也没什么用。



## 网关里的Ribbon

在网关里面，大有不同，我们先看ZuulProxyAutoConfiguration配置类，他引入了几个跟http组件有关的配置类，在这里`ribbon.okhttp.enable`，`ribbon.httpclient.enable`就能直接起作用了，他决定了加载哪一个具体的配置。在没有okhttpclient的情况下，默认就是使用apache的httpcomponents。

```java
// ZuulProxyAutoConfiguration.java
@Configuration
@Import({ RibbonCommandFactoryConfiguration.RestClientRibbonConfiguration.class,
      RibbonCommandFactoryConfiguration.OkHttpRibbonConfiguration.class,
      RibbonCommandFactoryConfiguration.HttpClientRibbonConfiguration.class,
      HttpClientConfiguration.class })
@ConditionalOnBean(ZuulProxyMarkerConfiguration.Marker.class)
public class ZuulProxyAutoConfiguration extends ZuulServerAutoConfiguration {
  .......

// RibbonCommandFactoryConfiguration.java
@Configuration
@ConditionalOnRibbonHttpClient
protected static class HttpClientRibbonConfiguration {

  @Autowired(required = false)
  private Set<ZuulFallbackProvider> zuulFallbackProviders = Collections.emptySet();

  @Bean
  @ConditionalOnMissingBean
  public RibbonCommandFactory<?> ribbonCommandFactory(
      SpringClientFactory clientFactory, ZuulProperties zuulProperties) {
    return new HttpClientRibbonCommandFactory(clientFactory, zuulProperties, zuulFallbackProviders);
  }
}

// HttpClientRibbonCommandFactory.java
@Override
public HttpClientRibbonCommand create(final RibbonCommandContext context) {
  ZuulFallbackProvider zuulFallbackProvider = getFallbackProvider(context.getServiceId());
  final String serviceId = context.getServiceId();
  //  最终还是从ribbon管理的上下文中获取到一个RibbonLoadBalancingHttpClient。注意，SpringClientFactory里的bean基本都来自于RibbonClientConfiguration，看过Ribbon的源码就知道
  final RibbonLoadBalancingHttpClient client = this.clientFactory.getClient(
      serviceId, RibbonLoadBalancingHttpClient.class);
  client.setLoadBalancer(this.clientFactory.getLoadBalancer(serviceId));
	
  return new HttpClientRibbonCommand(serviceId, client, context, zuulProperties, zuulFallbackProvider,
      clientFactory.getClientConfig(serviceId));
}
```

同时，Ribbon本身也会对`RibbonClientConfiguration`配置类也进行初始化，一样的，他也引入了几个Http组件，和上面不同的是，zuul的几个配置类，主要是为了封装Hystrix的逻辑，实际上最终还是调用的`RibbonLoadBalancingHttpClient`执行请求。所以我们接下来去看`RibbonClientConfiguration`的配置，以及`RibbonLoadBalancingHttpClient`是如何被注册的。

```java
// 各种http组件支持，默认是加载最后一个
@Import({HttpClientConfiguration.class, OkHttpRibbonConfiguration.class, RestClientRibbonConfiguration.class, HttpClientRibbonConfiguration.class})
public class RibbonClientConfiguration {
  .....
}

```

```java
// HttpClientRibbonConfiguration.java
// 在zuul中，httpcomponents已经被自动引入了
@ConditionalOnClass(name = "org.apache.http.client.HttpClient")
@ConditionalOnProperty(name = "ribbon.httpclient.enabled", matchIfMissing = true)
public class HttpClientRibbonConfiguration {
  // 这个配置被RibbonClientConfiguration一起被加载，可通过@RibbonClient注解的configuration属性覆盖
  @Bean
  @ConditionalOnMissingBean(HttpClientConnectionManager.class)
  public HttpClientConnectionManager httpClientConnectionManager(
        IClientConfig config,
        ApacheHttpClientConnectionManagerFactory connectionManagerFactory) {
     // 终于在这里找到了读取MaxTotalConnections等配置的代码
     Integer maxTotalConnections = config.getPropertyAsInteger(
           CommonClientConfigKey.MaxTotalConnections,
           DefaultClientConfigImpl.DEFAULT_MAX_TOTAL_CONNECTIONS);
     Integer maxConnectionsPerHost = config.getPropertyAsInteger(
           CommonClientConfigKey.MaxConnectionsPerHost,
           DefaultClientConfigImpl.DEFAULT_MAX_CONNECTIONS_PER_HOST);
    .....
  }

  // 这里声明了一个基于Apache的httpClient的Bean
  @Bean
  @ConditionalOnMissingBean(CloseableHttpClient.class)
  public CloseableHttpClient httpClient(ApacheHttpClientFactory httpClientFactory,
                      HttpClientConnectionManager connectionManager, IClientConfig config) {
    Boolean followRedirects = config.getPropertyAsBoolean(
        CommonClientConfigKey.FollowRedirects,
        DefaultClientConfigImpl.DEFAULT_FOLLOW_REDIRECTS);
    Integer connectTimeout = config.getPropertyAsInteger(
        CommonClientConfigKey.ConnectTimeout,
        DefaultClientConfigImpl.DEFAULT_CONNECT_TIMEOUT);
    RequestConfig defaultRequestConfig = RequestConfig.custom()
        .setConnectTimeout(connectTimeout)
        .setRedirectsEnabled(followRedirects).build();
    this.httpClient = httpClientFactory.createBuilder().
        setDefaultRequestConfig(defaultRequestConfig).
        setConnectionManager(connectionManager).build();
    return httpClient;
  }
  // 划重点。。。终于在这里发现了RibbonLoadBalancingHttpClient的声明，并且MaxTotalConnections等属性在上面的代码已经被注册了。
	@Bean
	@ConditionalOnMissingBean(AbstractLoadBalancerAwareClient.class)
	@ConditionalOnMissingClass(value = "org.springframework.retry.support.RetryTemplate")
	public RibbonLoadBalancingHttpClient ribbonLoadBalancingHttpClient(
		IClientConfig config, ServerIntrospector serverIntrospector,
		ILoadBalancer loadBalancer, RetryHandler retryHandler, CloseableHttpClient httpClient) {
		RibbonLoadBalancingHttpClient client = new RibbonLoadBalancingHttpClient(httpClient, config, serverIntrospector);
		client.setLoadBalancer(loadBalancer);
		client.setRetryHandler(retryHandler);
		Monitors.registerObject("Client_" + this.name, client);
		return client;
	}
}
```

我在网关打断点测试了一下，请求确实是通过RibbonLoadBalancingHttpClient执行的。

### **结论**

基于网关使用Ribbon，会读取`ribbon.MaxTotalConnections`和`ribbon.MaxConnectionsPerHost`等配置，并给予HTTPComponents组件进行访问。

# Feign

那么Fiegn的配置在什么时候生效？情况又有变化了，Feign同样有一个配置类`FeignRibbonClientAutoConfiguration`

```java
//Order is important here, last should be the default, first should be optional
// see https://github.com/spring-cloud/spring-cloud-netflix/issues/2086#issuecomment-316281653
@Import({ HttpClientFeignLoadBalancedConfiguration.class,
      OkHttpFeignLoadBalancedConfiguration.class,
      DefaultFeignLoadBalancedConfiguration.class })
public class FeignRibbonClientAutoConfiguration {
  ....
}
```

## 默认情况

在默认没有额外配置的情况下，是读取的`DefaultFeignLoadBalancedConfiguration`

```java
@Configuration
class DefaultFeignLoadBalancedConfiguration {
   @Bean
   @ConditionalOnMissingBean
   // Client.Default就基于JDK的http组件完成了http的请求，底层没有连接池
   public Client feignClient(CachingSpringLoadBalancerFactory cachingFactory,
                       SpringClientFactory clientFactory) {
      return new LoadBalancerFeignClient(new Client.Default(null, null),
            cachingFactory, clientFactory);
   }
}
```

Feign在默认情况下使用的是JDK原生的`URLConnection`发送HTTP请求，没有连接池，但是对每个地址会保持一个长连接，即利用HTTP的`persistence connection` 。

### 结论

在默认情况下，也就是不开启`feign.okhttp.enable`和`feign.httpclient.enable`的时候，feign的`feign.max-connections`配置，也是没有什么用的。

## HttpClient

在开启`feign.httpclient.enable`以后，HttpClientFeignLoadBalancedConfiguration会被加载。这里得加个依赖：

```xml
<dependency>
  <groupId>com.netflix.feign</groupId>
  <artifactId>feign-httpclient</artifactId>
  <version>${feign-httpclient}</version>
</dependency>
```

和Ribbon一样，Feign也定义了自己的HttpClient等组件，在定义过程中，读取了配置并利用。

```java
@Configuration
@ConditionalOnClass(ApacheHttpClient.class)
@ConditionalOnProperty(value = "feign.httpclient.enabled", matchIfMissing = true)
class HttpClientFeignLoadBalancedConfiguration {
  @Bean
  @ConditionalOnMissingBean(HttpClientConnectionManager.class)
  public HttpClientConnectionManager connectionManager(
        ApacheHttpClientConnectionManagerFactory connectionManagerFactory,
        FeignHttpClientProperties httpClientProperties) {
     // 在这里读取了feign相关的MaxConnectionsPerRoute和MaxConnections配置
     final HttpClientConnectionManager connectionManager = connectionManagerFactory
           .newConnectionManager(httpClientProperties.isDisableSslValidation(), httpClientProperties.getMaxConnections(),
                 httpClientProperties.getMaxConnectionsPerRoute(),
                 httpClientProperties.getTimeToLive(),
                 httpClientProperties.getTimeToLiveUnit(), registryBuilder);
     this.connectionManagerTimer.schedule(new TimerTask() {
        @Override
        public void run() {
           connectionManager.closeExpiredConnections();
        }
     }, 30000, httpClientProperties.getConnectionTimerRepeat());
     return connectionManager;
  }
  
  @Bean
  @ConditionalOnMissingBean(Client.class)
  public Client feignClient(CachingSpringLoadBalancerFactory cachingFactory,
                SpringClientFactory clientFactory, HttpClient httpClient) {
    ApacheHttpClient delegate = new ApacheHttpClient(httpClient);
    return new LoadBalancerFeignClient(delegate, cachingFactory, clientFactory);
  }
}
```

![image-20200429174359246](/img/spring-cloud/image-20200429174359246.png)

经过打了断点测试和验证， 确实在这里加载到了连接池的配置。请求也是通过ApacheHttpClient发送的。

### 结论

在引入了feign-httpclient的包以后，feign才会启用`feign.max-connections`等连接池的配置。那么Ribbon之前的配置呢，在使用Feign的时候，Ribbon的那些Http相关的Bean就没有用了，不会被用到。

## OkHttp

和上面一样，不过OkHttp只会读取MaxTotalConnections属性

```java
@Bean
@ConditionalOnMissingBean(ConnectionPool.class)
public ConnectionPool httpClientConnectionPool(IClientConfig config, OkHttpClientConnectionPoolFactory connectionPoolFactory) {
   Integer maxTotalConnections = config.getPropertyAsInteger(
         CommonClientConfigKey.MaxTotalConnections,
         DefaultClientConfigImpl.DEFAULT_MAX_TOTAL_CONNECTIONS);
   Object timeToLiveObj = config
         .getProperty(CommonClientConfigKey.PoolKeepAliveTime);
   Long timeToLive = DefaultClientConfigImpl.DEFAULT_POOL_KEEP_ALIVE_TIME;
   Object ttlUnitObj = config
         .getProperty(CommonClientConfigKey.PoolKeepAliveTimeUnits);
   TimeUnit ttlUnit = DefaultClientConfigImpl.DEFAULT_POOL_KEEP_ALIVE_TIME_UNITS;
   if (timeToLiveObj instanceof Long) {
      timeToLive = (Long) timeToLiveObj;
   }
   if (ttlUnitObj instanceof TimeUnit) {
      ttlUnit = (TimeUnit) ttlUnitObj;
   }
   return connectionPoolFactory.create(maxTotalConnections, timeToLive, ttlUnit);
}
```



# 总结

关于这个值应该怎么设置，大家根据自己的项目情况来设置，其实就是访问其他服务的Http连接池数量，不要设置的过于夸张了，有些人可能会跟Tomcat的maxconnections搞混了，甚至配个几千上万的，虽然名字一样，但是含义却不同。SpringBoot给我们设置的默认值，也是有参考意义的，在实际项目中，大家可以根据压测情况进行调整。



# Tomcat:maxConnections

关于Tomcat这个参数的详细解释，可以看这个博客：https://blog.csdn.net/zzzgd_666/article/details/88740198。



大概说一下，Tomcat有Nio、Bio、APR三种运行模式，maxConnections是Tomcat在任意时刻接收和处理的最大连接数。当Tomcat接收的连接数达到maxConnections时，Acceptor线程不会读取accept队列中的连接；这时accept队列中的线程会一直阻塞着，直到Tomcat接收的连接数小于maxConnections。如果设置为-1，则连接数不受限制。

默认值与连接器使用的协议有关：NIO的默认值是10000，APR/native的默认值是8192，而BIO的默认值为maxThreads（如果配置了Executor，则默认值是Executor的maxThreads）。

在windows下，APR/native的maxConnections值会自动调整为设置值以下最大的1024的整数倍；如设置为2000，则最大值实际是1024。



maxConnections的设置与Tomcat的运行模式有关。如果tomcat使用的是BIO，那么maxConnections的值应该与maxThreads一致；如果tomcat使用的是NIO，maxConnections值应该远大于maxThreads。

