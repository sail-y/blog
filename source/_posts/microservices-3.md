---
title: Spring Cloud微服务-3-SpringBoot源码初探
tags: [Spring Cloud, 微服务]
date: 2019-05-23 22:50:39
categories: 微服务
---



# SpringApplication

Class that can be used to bootstrap and launch a Spring application from a Java main method. By default class will perform the following steps to bootstrap your application:

* Create an appropriate ApplicationContext instance (depending on your classpath)
* Register a CommandLinePropertySource to expose command line arguments as Spring properties
* Refresh the application context, loading all singleton beans
* Trigger any CommandLineRunner beans

<!--more-->

 
 SpringApplications can read beans from a variety of different sources. It is generally recommended that a single @Configuration class is used to bootstrap your application, however, you may also set sources from:

* The fully qualified class name to be loaded by AnnotatedBeanDefinitionReader
* The location of an XML resource to be loaded by XmlBeanDefinitionReader, or a groovy script to be loaded by GroovyBeanDefinitionReader
* The name of a package to be scanned by ClassPathBeanDefinitionScanner


除了用@Configuration标记的类可以启动应用，还有上面介绍的3种方式可以启动应用。

## 构造方法

看看构造方法的说明：

>Create a new SpringApplication instance. The application context will load beans from the specified primary sources (see class-level documentation for details. The instance can be customized before calling run(String...).


创建一个SpringApplication，应用上下文从指定的primary sources加载bean。

构造方法的实现里有一行this.webApplicationType=WebApplicationType.deduceFromClasspath();，这行决定了应用是用的什么web容器启动的，非web环境，Servlet容器，或者Reactive（Spring 5新增的）。

```java
public SpringApplication(ResourceLoader resourceLoader, Class<?>... primarySources) {
	this.resourceLoader = resourceLoader;
	Assert.notNull(primarySources, "PrimarySources must not be null");
	this.primarySources = new LinkedHashSet<>(Arrays.asList(primarySources));
	this.webApplicationType = WebApplicationType.deduceFromClasspath();
	setInitializers((Collection) getSpringFactoriesInstances(
			ApplicationContextInitializer.class));
	setListeners((Collection) getSpringFactoriesInstances(ApplicationListener.class));
	this.mainApplicationClass = deduceMainApplicationClass();
}
```

再看下一行代码`setInitializers((Collection) getSpringFactoriesInstances(ApplicationContextInitializer.class));`里面的具体内容都干了些什么。


从getSpringFactoriesInstances方法代码里执行跟到SpringFactoriesLoader.loadSpringFactories这个方法中，有行很关键的代码：


```java
Enumeration<URL> urls = (classLoader != null ?
					classLoader.getResources(FACTORIES_RESOURCE_LOCATION) :
					ClassLoader.getSystemResources(FACTORIES_RESOURCE_LOCATION));
					
/**
 * The location to look for factories.
 * <p>Can be present in multiple JAR files.
 */
public static final String FACTORIES_RESOURCE_LOCATION = "META-INF/spring.factories";					
```

urls就包含了所有jar包里的spring.factories文件。

SpringFactoriesLoader是框架内部用来加载工厂的一种机制，它会读取META-INF/spring.factories这个文件的内容，这个文件存在于多个jar文件中（所有的spring.factories都会被读取并加载），随便看一个，比如spring-boot-autoconfigure-2.1.4.RELEASE.jar里的，定义了7种类型的类，Spring会去加载这个文件中定义的工厂信息配置文件，左边都是接口或者抽象类，右边都是具体的实现类。

```properties
# Initializers
org.springframework.context.ApplicationContextInitializer=\
org.springframework.boot.autoconfigure.SharedMetadataReaderFactoryContextInitializer,\
org.springframework.boot.autoconfigure.logging.ConditionEvaluationReportLoggingListener

# Application Listeners
org.springframework.context.ApplicationListener=\
org.springframework.boot.autoconfigure.BackgroundPreinitializer

# Auto Configuration Import Listeners
org.springframework.boot.autoconfigure.AutoConfigurationImportListener=\
org.springframework.boot.autoconfigure.condition.ConditionEvaluationReportAutoConfigurationImportListener
....
```

在读取了这些文件内容以后，文件里的内容就会作为缓存把数据放入到`private static final Map<ClassLoader, MultiValueMap<String, String>> cache = new ConcurrentReferenceHashMap<>();`中。


接下来，就获取了key为`org.springframework.context.ApplicationContextInitializer`的类列表。

这里也对应了前面提到过的
```java
setInitializers((Collection) getSpringFactoriesInstances(
				ApplicationContextInitializer.class));
```


后面就是通过反射的方式来创建这些ApplicationContextInitializer工厂类的实例。
```java
List<T> instances = createSpringFactoriesInstances(type, parameterTypes,
				classLoader, args, names);
```


再下一行的`setListeners((Collection) getSpringFactoriesInstances(ApplicationListener.class));`也是一样的逻辑，只不过这次是从缓存里获取的class名称了。


到这里ApplicationContextInitializer和ApplicationListener都实例化完成。


再往下面看`this.mainApplicationClass = deduceMainApplicationClass();`

```java
private Class<?> deduceMainApplicationClass() {
	try {
		StackTraceElement[] stackTrace = new RuntimeException().getStackTrace();
		for (StackTraceElement stackTraceElement : stackTrace) {
			if ("main".equals(stackTraceElement.getMethodName())) {
				return Class.forName(stackTraceElement.getClassName());
			}
		}
	}
	catch (ClassNotFoundException ex) {
		// Swallow and continue
	}
	return null;
}
```

万万没想到，Spring Boot竟然是通过这种方式来找到main方法所在类的，直接new一个RuntimeException()，然后从堆栈里去找main方法所在的类。

SpringApplication对象构造完成后，接下来就调用了run()方法。

## run()方法

运行Spring应用，创建并且刷新一个新的ApplicationContext。

```java
/**
 * Run the Spring application, creating and refreshing a new
 * {@link ApplicationContext}.
 * @param args the application arguments (usually passed from a Java main method)
 * @return a running {@link ApplicationContext}
 */
public ConfigurableApplicationContext run(String... args) {
```

ConfigurableApplicationContext context = null;


ApplicationContext是Spring里非常重要的一个接口，看看它的注释。

是一个中心的接口，为一个应用提供了配置。当应用在运行的时候，它是只读的，但是如果实现支持的话，可以被重新加载。

提供的功能如下：

* 提供了访问应用组件的bean工厂方法，继承自ListableBeanFactory
* 加载文件资源的能力，继承自 ResourceLoader接口
* 向注册的监听器发布事件的能力，继承自ApplicationEventPublisher接口
* 解析消息的能力，支持国际化，继承自MessageSource接口
* 继承父上下文的相关信息。子上下文有更高的优先级



