---
title: Feign01-流程大体分析和源码分析入口
date: 2020-04-12 19:05:39
tags: [spring-cloud,feign]
categories: spring-cloud
---

# Feign的组件简介

Feign负责简化接口调用，发起Http请求，Feign也包含了几个核心组件

1. 编码器和解码器：Encoder和Decoder。
   Encoder：如果调用接口的时候，传递的参数是个对象，feign需要将这个对象进行encode解码，json序列化，把一个对象转成json格式。
   Decoder：json反序列化，收到json以后，将json转换成本地的一个Java对象。
2. Logger：用于打印接口请求相关的调用日志
3. Contract：feign注解和spring web mvc 支持的@PathVariable,@RequesstMapping，@RequestParam等注解结合起来使用了。feign本来是没法支持spring web mvc的注解的，但是有了contract（契约组件）支持后，这个组件负责解释其他的注解，让feign可以跟其他注解结合起来使用。 
4. Feign.Builder：Feign客户端的一个实例构造器，基于构建器模式的，Ribbon也有。
5. FeignClient：最核心的入口，和RibbonLoadBalancerClient类似，包含以上这些核心的组件，基于这些组件去协作调用。

<!--more-->

## **默认配置**

Spring Cloud对feign的默认组件

* Encoder:SpringEncoder
* Decoder:ResponseEntityDecoder
* Logger:Sl4jLogger
* Contract:SpringMvcContract，解析Spring web mvc的注解
* Feign.Builder:HystrixFeign.Builder，和Hystrix整合使用
* FeignClient:LoadBalancerFeignClient，底层还是和Ribbon整合

## **自定义配置**

可以通过自定义配置覆盖一些默认的组件，也可以定义拦截器配置，可实现对feign的请求进行拦截，可用于在发起请求之前动态添加请求头，或者打印日志等。

```java
@FeignClient(name="serviceA",configuration=MyConfiguration.class)
public interface ServiceAClient {
  
}

public class MyConfiguration {
  @Bean
  public RequestInterceptor requestInterceptor() {
    return new MyRequestInterceptor();
  }
}
```

## 配置文件配置

### feign配置

```yml
# 某个服务的配置
feign:
  client:
    config:
      ServiceA:
        connectTimeout: 5000
        readTimeout: 5000
        loggerLevel: full
        decode404: false
# 全局配置
feign:
  client:
    config:
      default:
        connectTimeout: 5000
        readTimeout: 5000
        loggerLevel: full
```

### 启用feign的压缩

```yml
feign:
    compression:
        request:
            enabled: true
            mime-types: text/xml,application/xml,application/json
            min-request-size: 2048
        response:
            enabled: true
```

### 启用请求日志

```yaml
logging.level.com.zhss.service.ServiceAClient: DEBUG
```

## 大体流程画图

大体分析一下Feign是如何完成请求的，包含动态代理，路径和参数的拼装，与Ribbon的整合等。

![Feign的核心工作流程](/img/spring-cloud/Feign的核心工作流程.jpg)

# Feign源码入口

在分析feign源码之前，应该从哪里入手？那么我们在接入feign的时候，有2个很重要的注解，分别是@EnableFeignClients开启feign，和每个接口上的@FeignClient。

分别看一下注解源码上的javadoc。

## @FeignClient

用@FeignClient注解标记的接口，会被创建为一个Rest Client，可以被其他组件注入使用。

如果Ribbon启用的话，就会采用负载均衡的方式发送http请求。负载均衡器可以用@RibbonClient来配置，RibbonClient的和名字要和FeignClient的名字一样。就是@FeignClient("serviceA")可以通过下面的配置来指定对应服务Ribbon的配置。

```java
@RibbonClient(name = "serviceA", configuration = ServiceAConfiguration.class)
public class XXXConfiguration {
  
}

public class ServiceAConfiguration {

    @Value("${ribbon.client.name}")
    private String name = "client";

    @Autowired
    private PropertiesFactory propertiesFactory;


    @Bean
    @ConditionalOnMissingBean
    public ILoadBalancer ribbonLoadBalancer(IClientConfig config,
                                            ServerList<Server> serverList, ServerListFilter<Server> serverListFilter,
                                            IRule rule, IPing ping, ServerListUpdater serverListUpdater) {
      if (this.propertiesFactory.isSet(ILoadBalancer.class, name)) {
        return this.propertiesFactory.get(ILoadBalancer.class, config, name);
      }
      return new ZoneAwareLoadBalancer<>(config, rule, ping, serverList,
                                         serverListFilter, serverListUpdater);
    }
}
```

## @EnableFeignClients

扫描那些标记了@FeignClient的接口，指定要扫描哪些包下面的接口。

```java
@Import(FeignClientsRegistrar.class)
public @interface EnableFeignClients {
  ...
}
```

FeignClientsRegistrar是非常重要的一个类，SpringBoot大多数的EnableXXX注解都是通过@Import来完成功能开启的，所以我们猜测，SpringBoot项目启动后，在识别到EnableFeignClients注解后，FeignClientsRegistrar肯定是扫描了标记@FeignClient的接口，完成了@FeignClient的注册。这部分代码和RibbonClientConfigurationRegistrar的相似的，都是先加载了一个default开头的默认配置，然后将每个服务对应的client的配置再加载一些，包装了FeignClientSpecification类放在spring上下文中。

```java
@Override
public void registerBeanDefinitions(AnnotationMetadata metadata,
      BeanDefinitionRegistry registry) {
   registerDefaultConfiguration(metadata, registry);
   registerFeignClients(metadata, registry);
}
```

### registerDefaultConfiguration

注册默认配置和注册FeignClient，这儿和Ribbon的代码差不多。

1、Application启动类的全的限定名

2、获取@EnableFeignClients注解里配置的defaultConfiguration属性

3、利用以上2个属性，构建一个FeignClientSpecification，注册到了Spring上下文中。

```java
// FeignClientsRegistrar.java
private void registerDefaultConfiguration(AnnotationMetadata metadata,
      BeanDefinitionRegistry registry) {
   // 拿到EnableFeignClients注解所有配置的属性
   Map<String, Object> defaultAttrs = metadata
         .getAnnotationAttributes(EnableFeignClients.class.getName(), true);

   // 属性里是否包含defaultConfiguration配置
   if (defaultAttrs != null && defaultAttrs.containsKey("defaultConfiguration")) {
      String name;
      // 组装成default.com.demo.DemoApplication这样的name
      if (metadata.hasEnclosingClass()) {
         name = "default." + metadata.getEnclosingClassName();
      }
      else {
         name = "default." + metadata.getClassName();
      }
      // 注册feign Client配置
      registerClientConfiguration(registry, name,
            defaultAttrs.get("defaultConfiguration"));
   }
}

private void registerClientConfiguration(BeanDefinitionRegistry registry, Object name,
                                         Object configuration) {
  // 这是Spring用来构建Bean实例用的构建器，这里搞一个FeignClientSpecification的实例
  BeanDefinitionBuilder builder = BeanDefinitionBuilder
    .genericBeanDefinition(FeignClientSpecification.class);
  builder.addConstructorArgValue(name);
  builder.addConstructorArgValue(configuration);
  // 这儿就是default.com.demo.DemoApplication.org.springframework.cloud.netflix.feign.FeignClientSpecification作为bean的name,FeignClientSpecification的实例作为对象，注册到了Spring的上下文中。
  registry.registerBeanDefinition(
    name + "." + FeignClientSpecification.class.getSimpleName(),
    builder.getBeanDefinition());
}
```

### registerFeignClients

这个方法会扫描配置的包，然后将标注了@FeignClient注解的接口，进行配置的注册。

1. 获得组件扫描器ClassPathScanningCandidateComponentProvider，这是个内部类。
2. 如果没有配置clients属性，设置扫描的组件为标记了@FeignClient注解类或者接口。读取@EnableFeignClients的basePackages属性
3. 如果没有配置basePackages属性，就会根据注解所在的类设置为扫描的包，例如DemoApplication所在的包
4. 如果配置了clients属性，则不会开启扫描，直接使用配置的clients。一般不会配置
5. 遍历basePackages，扫描所有注解了@FeignClient的类或者接口。判断的逻辑在内部匿名类ClassPathScanningCandidateComponentProvider.isCandidateComponent方法里
6. 得到标记了@FeignClient的接口
7. 根据@FeignClient的配置注册serviceId对应的个性化配置
8. 根据配置的属性，构建器模式构建基于FeignClientFactoryBean的BeanDefinition并注册到BeanDefinitionRegistry中。此时FeignClient类的实例并没有生成，只是构建了一个FeignClientFactoryBean的BeanDefinition，并将其注册到了BeanDefinitionRegistry（也就是Spring上下文）里。大胆猜一下，应该是在后面才会用动态代理去创建FeignClient接口的实例。

```java
// FeignClientsRegistrar.java
public void registerFeignClients(AnnotationMetadata metadata,
      BeanDefinitionRegistry registry) {
   // 扫描用的组件
   ClassPathScanningCandidateComponentProvider scanner = getScanner();
   scanner.setResourceLoader(this.resourceLoader);

   Set<String> basePackages;

   Map<String, Object> attrs = metadata
         .getAnnotationAttributes(EnableFeignClients.class.getName());
   
   AnnotationTypeFilter annotationTypeFilter = new AnnotationTypeFilter(
         FeignClient.class);
   final Class<?>[] clients = attrs == null ? null
         : (Class<?>[]) attrs.get("clients");
   // 如果没有配置clients属性
   if (clients == null || clients.length == 0) {
      // 扫描标记了@FeignClient注解的接口
      scanner.addIncludeFilter(annotationTypeFilter);
      // 扫描EnableFeignClients里配置的basePackages
      basePackages = getBasePackages(metadata);
   }
   else {
      // 否则遍历配置的clients，加载相应配置。
      final Set<String> clientClasses = new HashSet<>();
      basePackages = new HashSet<>();
      for (Class<?> clazz : clients) {
         basePackages.add(ClassUtils.getPackageName(clazz));
         clientClasses.add(clazz.getCanonicalName());
      }
      AbstractClassTestingTypeFilter filter = new AbstractClassTestingTypeFilter() {
         @Override
         protected boolean match(ClassMetadata metadata) {
            String cleaned = metadata.getClassName().replaceAll("\\$", ".");
            return clientClasses.contains(cleaned);
         }
      };
      scanner.addIncludeFilter(
            new AllTypeFilter(Arrays.asList(filter, annotationTypeFilter)));
   }
	 // 如果EnableFeignClients没有配置basePackages，则扫描DemoApplication所在的包
   for (String basePackage : basePackages) {
      // 找到标记了@FeignClient的注解
      Set<BeanDefinition> candidateComponents = scanner
            .findCandidateComponents(basePackage);
      for (BeanDefinition candidateComponent : candidateComponents) {
         if (candidateComponent instanceof AnnotatedBeanDefinition) {
            // verify annotated class is an interface
            AnnotatedBeanDefinition beanDefinition = (AnnotatedBeanDefinition) candidateComponent;
            AnnotationMetadata annotationMetadata = beanDefinition.getMetadata();
            Assert.isTrue(annotationMetadata.isInterface(),
                  "@FeignClient can only be specified on an interface");
            // 拿到@FeignClient注解配置的属性
            Map<String, Object> attributes = annotationMetadata
                  .getAnnotationAttributes(
                        FeignClient.class.getCanonicalName());
						// 拿到配置的serviceId
            String name = getClientName(attributes);
            // 根据配置的configuration，注册服务名个性化的配置
            // ServiceA.org.springframework.cloud.netflix.feign.FeignClientSpecification
            registerClientConfiguration(registry, name,
                  attributes.get("configuration"));
						// 注册FeignClient
            registerFeignClient(registry, annotationMetadata, attributes);
         }
      }
   }
}
```



```java
// FeignClientsRegistrar.java
private void registerFeignClient(BeanDefinitionRegistry registry,
      AnnotationMetadata annotationMetadata, Map<String, Object> attributes) {
   String className = annotationMetadata.getClassName();
   // 构建器模式构建基于FeignClientFactoryBean的BeanDefinition
   BeanDefinitionBuilder definition = BeanDefinitionBuilder
         .genericBeanDefinition(FeignClientFactoryBean.class);
   validate(attributes);
   definition.addPropertyValue("url", getUrl(attributes));
   definition.addPropertyValue("path", getPath(attributes));
   // ServiceA
   String name = getName(attributes);
   definition.addPropertyValue("name", name);
   definition.addPropertyValue("type", className);
   definition.addPropertyValue("decode404", attributes.get("decode404"));
   definition.addPropertyValue("fallback", attributes.get("fallback"));
   definition.addPropertyValue("fallbackFactory", attributes.get("fallbackFactory"));
   definition.setAutowireMode(AbstractBeanDefinition.AUTOWIRE_BY_TYPE);
   // ServiceAFeignClient
   String alias = name + "FeignClient";
   // 构建器构造完成
   AbstractBeanDefinition beanDefinition = definition.getBeanDefinition();

   boolean primary = (Boolean)attributes.get("primary"); // has a default, won't be null

   beanDefinition.setPrimary(primary);

   String qualifier = getQualifier(attributes);
   if (StringUtils.hasText(qualifier)) {
      alias = qualifier;
   }

   BeanDefinitionHolder holder = new BeanDefinitionHolder(beanDefinition, className,
         new String[] { alias });
   BeanDefinitionReaderUtils.registerBeanDefinition(holder, registry);
}
```

### 画图总结流程

![扫描@FeignClient注解的机制](/img/spring-cloud/扫描@FeignClient注解的机制.jpg)