---
title: Feign02-动态代理创建FeignClient的实例
date: 2020-04-18 13:05:39
tags: [spring-cloud,feign]
categories: spring-cloud
---

# 动态代理创建FeignClient的实例

在做完前面的事情以后，FeignClientFactoryBean已经被注册到Spring上下文中，根据Spring的原理，FactoryBean是用于构造复杂对象实例的一种工厂，可定制创建，初始化，刷新，销毁的各个过程。重点需要去看getObject()方法，看对象实例是如何产生的。

<!--more-->

```java
// FeignClientFactoryBean.java
@Override
public Object getObject() throws Exception {
   // 每个服务对应一个Spring容器，里面就包含了所有的FeignClientSpecification，在FeignAutoConfiguration中定义好了
   FeignContext context = applicationContext.getBean(FeignContext.class);
   // Feign对象构建器，Feign包含了动态代理生成对象的代码，详细分析在下一节
   Feign.Builder builder = feign(context);
   if (!StringUtils.hasText(this.url)) {
      String url;
      if (!this.name.startsWith("http")) {
         url = "http://" + this.name;
      }
      else {
         url = this.name;
      }
      url += cleanPath();
      return loadBalance(builder, context, new HardCodedTarget<>(this.type,
            this.name, url));
   }
   if (StringUtils.hasText(this.url) && !this.url.startsWith("http")) {
      this.url = "http://" + this.url;
   }
   String url = this.url + cleanPath();
   Client client = getOptional(context, Client.class);
   if (client != null) {
      if (client instanceof LoadBalancerFeignClient) {
         // not lod balancing because we have a url,
         // but ribbon is on the classpath, so unwrap
         client = ((LoadBalancerFeignClient)client).getDelegate();
      }
      builder.client(client);
   }
   Targeter targeter = get(context, Targeter.class);
   return targeter.target(this, builder, context, new HardCodedTarget<>(
         this.type, this.name, url));
}
```

下面先看下Feign.Builder是如何构造的

## Feign.Builder构造过程以及Feign在SpringCloud中的默认组件

```java
// FeignClientFactoryBean.java
// 这里的所有组件默认bean，定义都是在FeignClientsConfiguration里
// 除非用@FeignClients的defaultConfiguration覆盖
// 或者用@FeignClient的configuration覆盖
// 优先级 代码可以在NamedContextFactory.createContext查看
// 1、@FeignClient的configuration
// 2、@FeignClients的defaultConfiguration
// 3、SpringCloud的FeignClientsConfiguration
protected Feign.Builder feign(FeignContext context) {
   // 去ServiceA对应的Spring容器里获取自己的FeignLoggerFactory，默认是DefaultFeignLoggerFactory
   FeignLoggerFactory loggerFactory = get(context, FeignLoggerFactory.class);
   // type就是feignClient的class
   // Slf4jLogger
   Logger logger = loggerFactory.create(this.type);

   // 如果开启feign.hystrix.enabled配置，是HystrixFeign.Builder
   // 否则是Feign.Builder，那么默认就是Feign.Builder
   // @formatter:off
   Feign.Builder builder = get(context, Feign.Builder.class)
         // required values
         .logger(logger)
         // 默认是SpringEncoder
         .encoder(get(context, Encoder.class))
	       // 默认是ResponseEntityDecoder
         .decoder(get(context, Decoder.class))
         // 默认是SpringMvcContract
         .contract(get(context, Contract.class));
   // @formatter:on
   // 读取application.yml设置一些参数，feign.client开头的，超时、日志级别等
   configureFeign(context, builder);

   return builder;
}
```

步骤：

1. 从ServiceA对应的Spring容器读取FeignLoggerFactory，默认是DefaultFeignLoggerFactory
2. DefaultFeignLoggerFactory创建并设置Logger，是Slf4jLogger
3. 从ServiceA对应的Spring容器读取并设置Feign.Builder，如果开启feign.hystrix.enabled配置，是HystrixFeign.Builder，默认是Feign.Builder
4. 从ServiceA对应的Spring容器读取并设置Encoder，默认是SpringEncoder
5. 从ServiceA对应的Spring容器读取并设置Decoder，默认是ResponseEntityDecoder
6. 从ServiceA对应的Spring容器读取并设置Contract，默认是SpringMvcContract
7. 读取并设置application.yml属性

## 超时、日志级别、拦截器等属性设置

```java
// FeignClientFactoryBean.java
// 用@FeignClient指定的configuration进行配置，和读取application.yml
protected void configureFeign(FeignContext context, Feign.Builder builder) {
  FeignClientProperties properties = applicationContext.getBean(FeignClientProperties.class);
  if (properties != null) {
    // 这个默认是true
    if (properties.isDefaultToProperties()) {
      // 读取configuration
      configureUsingConfiguration(context, builder);
 			// 全局配置
      configureUsingProperties(properties.getConfig().get(properties.getDefaultConfig()), builder);
      // 特定服务配置
      configureUsingProperties(properties.getConfig().get(this.name), builder);
    } else {
      configureUsingProperties(properties.getConfig().get(properties.getDefaultConfig()), builder);
      configureUsingProperties(properties.getConfig().get(this.name), builder);
      configureUsingConfiguration(context, builder);
    }
  } else {
    configureUsingConfiguration(context, builder);
  }
}

protected void configureUsingProperties(FeignClientProperties.FeignClientConfiguration config, Feign.Builder builder) {
   if (config == null) {
      return;
   }

   if (config.getLoggerLevel() != null) {
      builder.logLevel(config.getLoggerLevel());
   }

   if (config.getConnectTimeout() != null && config.getReadTimeout() != null) {
      builder.options(new Request.Options(config.getConnectTimeout(), config.getReadTimeout()));
   }

   if (config.getRetryer() != null) {
      Retryer retryer = getOrInstantiate(config.getRetryer());
      builder.retryer(retryer);
   }

   if (config.getErrorDecoder() != null) {
      ErrorDecoder errorDecoder = getOrInstantiate(config.getErrorDecoder());
      builder.errorDecoder(errorDecoder);
   }

   if (config.getRequestInterceptors() != null && !config.getRequestInterceptors().isEmpty()) {
      // this will add request interceptor to builder, not replace existing
      for (Class<RequestInterceptor> bean : config.getRequestInterceptors()) {
         RequestInterceptor interceptor = getOrInstantiate(bean);
         builder.requestInterceptor(interceptor);
      }
   }

   if (config.getDecode404() != null) {
      if (config.getDecode404()) {
         builder.decode404();
      }
   }
}
```

配置读取过程详解：

1. 读取@FeignClient中指定的MyConfiguration配置，比如Logger.Level，Retryer，ErrorDecoder，Request.Options，RequestInterceptors。

2. 读取application.yml中feign.client开头的配置，application.yml的优先级更高。
3. 读取application.yml中feign.client.serviceA开头的配置，这个优先级最高

## 动态代理创建ServiceAClient的实例

根据配置构造好了Feign.Builder后，就要开始创建Feign.Client的实例

```java
// FeignClientFactoryBean.java
@Override
public Object getObject() throws Exception {
   FeignContext context = applicationContext.getBean(FeignContext.class);
   Feign.Builder builder = feign(context);

   // 检查@FeignClient是否配置了url地址
   if (!StringUtils.hasText(this.url)) {
      String url;
      if (!this.name.startsWith("http")) {
         // 拼了一个http://ServiceA出来
         url = "http://" + this.name;
      }
      else {
         url = this.name;
      }
      url += cleanPath();
      // Target 一般就是和动态代理有关的类，即被代理的对象
      // HardCodedTarget包含了 type:接口类class(ServiceAClient)，name(ServiceA)和url(http://ServiceA)。
      return loadBalance(builder, context, new HardCodedTarget<>(this.type,
            this.name, url));
   }
   // 
   if (StringUtils.hasText(this.url) && !this.url.startsWith("http")) {
      this.url = "http://" + this.url;
   }
   // 
   String url = this.url + cleanPath();
   Client client = getOptional(context, Client.class);
   if (client != null) {
      if (client instanceof LoadBalancerFeignClient) {
         // not lod balancing because we have a url,
         // but ribbon is on the classpath, so unwrap
         client = ((LoadBalancerFeignClient)client).getDelegate();
      }
      builder.client(client);
   }
   Targeter targeter = get(context, Targeter.class);
   return targeter.target(this, builder, context, new HardCodedTarget<>(
         this.type, this.name, url));
}
```

步骤：

1. 如果@FeignClient没有配置url属性，就将服务名拼接成http://ServiceA）这样的地址
2. 构造了一个HardCodedTarget，包含了type:接口类class(ServiceAClient)，name(ServiceA)和url(http://ServiceA)，和Feign.Builder、FeignContext一起传入loadBalance。



```java
// FeignClientFactoryBean.java
protected <T> T loadBalance(Feign.Builder builder, FeignContext context,
      HardCodedTarget<T> target) {
   // 从上下文中获得一个LoadBalancerFeignClient，这里，就和ribbon结合起来了
   Client client = getOptional(context, Client.class);
   if (client != null) {
      // 
      builder.client(client);
      // 那么targeter就是动态代理的组件
      Targeter targeter = get(context, Targeter.class);
      return targeter.target(this, builder, context, target);
   }

   throw new IllegalStateException(
         "No Feign Client for loadBalancing defined. Did you forget to include spring-cloud-starter-netflix-ribbon?");
}
```



步骤：

1. 从上下文获取了一个Client，通过IDEA强大的源码查看能力，找到一个实现类LoadBalancerFeignClient，取决于不同的实现，可能会由`DefaultFeignLoadBalancedConfiguration` 或者`HttpClientFeignLoadBalancedConfiguration`或者`OkHttpFeignLoadBalancedConfiguration`定义的，通过FeignRibbonClientAutoConfiguration的@Import注解导入。默认是Default开头的。LoadBalancerFeignClient就是基于Ribbon，可负载均衡的。

   ```java
   //Order is important here, last should be the default, first should be optional
   @Import({ HttpClientFeignLoadBalancedConfiguration.class,
         OkHttpFeignLoadBalancedConfiguration.class,
         DefaultFeignLoadBalancedConfiguration.class })
   public class FeignRibbonClientAutoConfiguration {
   ```

2. 从Spring容器中获取到targeter动态代理的组件，Targeter的定义如下：

   ```java
   // FeignAutoConfiguration.java
   // 这个条件明显是成立的，所以代码拿到的肯定是HystrixTargeter
   @Configuration
   @ConditionalOnClass(name = "feign.hystrix.HystrixFeign")
   protected static class HystrixFeignTargeterConfiguration {
      @Bean
      @ConditionalOnMissingBean
      public Targeter feignTargeter() {
         return new HystrixTargeter();
      }
   }
   
   @Configuration
   @ConditionalOnMissingClass("feign.hystrix.HystrixFeign")
   protected static class DefaultFeignTargeterConfiguration {
      @Bean
      @ConditionalOnMissingBean
      public Targeter feignTargeter() {
         return new DefaultTargeter();
      }
   }
   ```

3. 在HystrixTargeter中，如果没有开启feign.hystrix.enabled配置，那么就进入默认的Feign.Builder.target方法，不过在生产环境中，一般都会开启。

   ```java
   // HystrixTargeter.java
   @Override
   public <T> T target(FeignClientFactoryBean factory, Feign.Builder feign, FeignContext context,
                  Target.HardCodedTarget<T> target) {
      // 默认情况下是Feign.Builder，所以会进入这个逻辑
      if (!(feign instanceof feign.hystrix.HystrixFeign.Builder)) {
         return feign.target(target);
      }
      feign.hystrix.HystrixFeign.Builder builder = (feign.hystrix.HystrixFeign.Builder) feign;
      SetterFactory setterFactory = getOptional(factory.getName(), context,
         SetterFactory.class);
      if (setterFactory != null) {
         builder.setterFactory(setterFactory);
      }
      Class<?> fallback = factory.getFallback();
      if (fallback != void.class) {
         return targetWithFallback(factory.getName(), context, target, builder, fallback);
      }
      Class<?> fallbackFactory = factory.getFallbackFactory();
      if (fallbackFactory != void.class) {
         return targetWithFallbackFactory(factory.getName(), context, target, builder, fallbackFactory);
      }
   
      return feign.target(target);
   }
   ```

   

   feign.target(target)方法里，将Feign.Builder中所有的的东西集成在一起，构造一个ReflectiveFeign，调用newInstance方法，传入target生成动态代理

   ```java
   // Feign.java
   public <T> T target(Target<T> target) {
     return build().newInstance(target);
   }
   
   public Feign build() {
     SynchronousMethodHandler.Factory synchronousMethodHandlerFactory =
       new SynchronousMethodHandler.Factory(client, retryer, requestInterceptors, logger,
                                            logLevel, decode404);
     ParseHandlersByName handlersByName =
       new ParseHandlersByName(contract, options, encoder, decoder,
                               errorDecoder, synchronousMethodHandlerFactory);
     return new ReflectiveFeign(handlersByName, invocationHandlerFactory);
   }
   ```

4. 调用newInstance方法，传入target，生成ServiceAClient的动态代理。

   ```java
   // ReflectiveFeign.java
   @Override
   public <T> T newInstance(Target<T> target) {
     // 关键代码，接口中的每个方法的名称，对应一个处理这个方法的SynchronousMethodHandler
     Map<String, MethodHandler> nameToHandler = targetToHandlersByName.apply(target);
     // 接口中的每个方法对应的Method对象，对应一个处理这个方法的SynchronousMethodHandler
     // 到时候每一个handler，都会去触发真正的调用
     Map<Method, MethodHandler> methodToHandler = new LinkedHashMap<Method, MethodHandler>();
     List<DefaultMethodHandler> defaultMethodHandlers = new LinkedList<DefaultMethodHandler>();
     // 反射遍历ServiceAClient的方法
     for (Method method : target.type().getMethods()) {
       if (method.getDeclaringClass() == Object.class) {
         continue;
       } else if(Util.isDefault(method)) {
         DefaultMethodHandler handler = new DefaultMethodHandler(method);
         defaultMethodHandlers.add(handler);
         methodToHandler.put(method, handler);
       } else {
         methodToHandler.put(method, nameToHandler.get(Feign.configKey(target.type(), method)));
       }
     }
     // 基于工厂创建的InvocationHandler，JDK动态代理的组件, 这里是ReflectiveFeign.FeignInvocationHandler
     InvocationHandler handler = factory.create(target, methodToHandler);
     // 基于JDK的动态代理创建了一个动态代理对象，这个proxy对象，就实现了ServiceAClient接口
     T proxy = (T) Proxy.newProxyInstance(target.type().getClassLoader(), new Class<?>[]{target.type()}, handler);
   
     for(DefaultMethodHandler defaultMethodHandler : defaultMethodHandlers) {
       defaultMethodHandler.bindTo(proxy);
     }
     return proxy;
   }
   ```
   
5. 创建完成后，对象被放入Sping容器中，可以被其他类注入使用。

## 画图总结

![feign动态代理的构造过程](/img/spring-cloud/feign动态代理的构造过程.jpg)
