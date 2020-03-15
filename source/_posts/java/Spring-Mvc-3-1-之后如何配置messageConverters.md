title: Spring Mvc 3.1 之后如何配置messageConverters
date: 2015-03-06 22:15:41
tags: [spring mvc, messageConverters]
categories: spring
---
`<mvc:annotation-driven />` 是一种简写形式，完全可以手动配置替代这种简写形式，简写形式可以让初学都快速应用默认配置方案。`<mvc:annotation-driven />` 会自动注册`DefaultAnnotationHandlerMapping`与`AnnotationMethodHandlerAdapter` 两个bean,是spring MVC为@Controllers分发请求所必须的。

这句话我在很多帖子都看到过，我自己的项目本身使用的Spring MVC 3.2，实际上在3.1之后，<mvc:annotation-driven />注册的类发生了变化
> Spring Framework 3.1 introduces a new set of support classes for processing requests with annotated controllers:

> RequestMappingHandlerMapping
RequestMappingHandlerAdapter
ExceptionHandlerExceptionResolver
These classes are a replacement for the existing:

> DefaultAnnotationHandlerMapping
AnnotationMethodHandlerAdapter
AnnotationMethodHandlerExceptionResolver
<!--more-->

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
    xmlns:mvc="http://www.springframework.org/schema/mvc"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="
        http://www.springframework.org/schema/beans
        http://www.springframework.org/schema/beans/spring-beans.xsd
        http://www.springframework.org/schema/mvc
        http://www.springframework.org/schema/mvc/spring-mvc.xsd">

    <mvc:annotation-driven />

</beans>
```

> The above registers a RequestMappingHandlerMapping, a RequestMappingHandlerAdapter, and an ExceptionHandlerExceptionResolver (among others) in support of processing requests with annotated controller methods using annotations such as @RequestMapping , @ExceptionHandler, and others.


> It also enables the following:

> 1. Spring 3 style type conversion through a ConversionService instance in addition to the JavaBeans PropertyEditors used for Data Binding.
> 2. Support for formatting Number fields using the @NumberFormat annotation through the ConversionService.
> 3. Support for formatting Date, Calendar, Long, and Joda Time fields using the @DateTimeFormat annotation.
> 4. Support for validating @Controller inputs with @Valid, if a JSR-303 Provider is present on the classpath.
> 5. HttpMessageConverter support for @RequestBody method parameters and @ResponseBody method return values from @RequestMapping or @ExceptionHandler methods.
This is the complete list of HttpMessageConverters set up by mvc:annotation-driven:
 * ByteArrayHttpMessageConverter converts byte arrays.
 * StringHttpMessageConverter converts strings.
 * ResourceHttpMessageConverter converts to/from org.springframework.core.io.Resource for all media types.
 * SourceHttpMessageConverter converts to/from a javax.xml.transform.Source.
 * FormHttpMessageConverter converts form data to/from a MultiValueMap<String, String>.
 * Jaxb2RootElementHttpMessageConverter converts Java objects to/from XML — added if   JAXB2 is present on the classpath.
 * MappingJackson2HttpMessageConverter (or MappingJacksonHttpMessageConverter) converts to/from JSON — added if Jackson 2 (or Jackson) is present on the classpath.
 * AtomFeedHttpMessageConverter converts Atom feeds — added if Rome is present on the classpath.
 * RssChannelHttpMessageConverter converts RSS feeds — added if Rome is present on the classpath.

这是摘取的官方文档，可以看出，注册的类已经变成了RequestMappingHandlerMapping和 RequestMappingHandlerAdapter。
我之前在不知道的时候，使用AnnotationMethodHandlerAdapter 进行配置，结果在有<mvc:annotation-driven />存在的情况下，我自己配置的AnnotationMethodHandlerAdapter 怎么都不起作用，于是去掉了<mvc:annotation-driven />标签，手动注册了AnnotationMethodHandlerAdapter ，和DefaultAnnotationHandlerMapping。结果引发了其他问题，比如文件无法上传的问题。

阅读文档发现Spring提供了基于<mvc:annotation-driven />自定义messageConverters的方法，如下所示：

```xml
<mvc:annotation-driven conversion-service="conversionService">
    <mvc:message-converters>
        <bean class="org.example.MyHttpMessageConverter"/>
        <bean class="org.example.MyOtherHttpMessageConverter"/>
    </mvc:message-converters>
</mvc:annotation-driven>
```

下面展示我自己的配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<beans xmlns="http://www.springframework.org/schema/beans"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:aop="http://www.springframework.org/schema/aop"
	xmlns:context="http://www.springframework.org/schema/context" xmlns:tx="http://www.springframework.org/schema/tx"
	xmlns:jdbc="http://www.springframework.org/schema/jdbc" xmlns:mvc="http://www.springframework.org/schema/mvc"
	xmlns:util="http://www.springframework.org/schema/util"
	xsi:schemaLocation="http://www.springframework.org/schema/beans
                     http://www.springframework.org/schema/beans/spring-beans.xsd
                     http://www.springframework.org/schema/tx
                     http://www.springframework.org/schema/tx/spring-tx.xsd
                     http://www.springframework.org/schema/context 
                     http://www.springframework.org/schema/context/spring-context.xsd
                     http://www.springframework.org/schema/aop
                     http://www.springframework.org/schema/aop/spring-aop.xsd
                     http://www.springframework.org/schema/jdbc
                     http://www.springframework.org/schema/jdbc/spring-jdbc-3.2.xsd
                     http://www.springframework.org/schema/util      
          			 http://www.springframework.org/schema/util/spring-util-3.2.xsd
                     http://www.springframework.org/schema/mvc 
  					 http://www.springframework.org/schema/mvc/spring-mvc-3.2.xsd">

	<!-- spring自动扫描注解的组件 -->
	<context:component-scan base-package="cn.xx.xx"
		use-default-filters="false">
		<context:include-filter expression="org.springframework.stereotype.Controller"
			type="annotation" />
	</context:component-scan>

	<mvc:annotation-driven>
		<mvc:message-converters>
			<ref bean="stringHttpMessageConverter" />
			<ref bean="fastJsonHttpMessageConverter" />
			<ref bean="marshallingHttpMessageConverter" />
		</mvc:message-converters>
	</mvc:annotation-driven>

	<bean id="stringHttpMessageConverter"
		class="org.springframework.http.converter.StringHttpMessageConverter">
		<constructor-arg value="UTF-8" index="0"></constructor-arg><!-- 
			避免出现乱码 -->
		<property name="supportedMediaTypes">
			<list>
				<value>text/plain;charset=UTF-8</value>
			</list>
		</property>
	</bean>
	<bean id="fastJsonHttpMessageConverter"
		class="com.alibaba.fastjson.support.spring.FastJsonHttpMessageConverter">

		<property name="supportedMediaTypes">
			<list>
				<value>application/json;charset=UTF-8</value>
				<value>text/html;charset=UTF-8</value><!-- 避免IE出现下载JSON文件的情况 -->
			</list>
		</property>
		<property name="features">
			<util:list>
				<!-- <value>WriteMapNullValue</value> -->
				<value>QuoteFieldNames</value>
				<value>WriteDateUseDateFormat</value>
			</util:list>
		</property>
	</bean>
	
	<bean id="marshallingHttpMessageConverter"
		class="org.springframework.http.converter.xml.MarshallingHttpMessageConverter">
		<property name="marshaller" ref="castorMarshaller" />
		<property name="unmarshaller" ref="castorMarshaller" />
		<property name="supportedMediaTypes">
			<list>
				<value>text/xml;charset=UTF-8</value>
				<value>application/xml;charset=UTF-8</value>
			</list>
		</property>
	</bean>

	<!-- 返回类型定义 -->
	<util:list id="messageConverters">
		<ref bean="stringHttpMessageConverter" />
		<ref bean="fastJsonHttpMessageConverter" />
		<ref bean="marshallingHttpMessageConverter" />
	</util:list>

	<bean id="castorMarshaller" class="org.springframework.oxm.castor.CastorMarshaller" />

	<!-- AOP自动注解功能 -->
	<aop:aspectj-autoproxy />

	<!-- 不进行拦截的 -->
	<mvc:resources location="/" mapping="/**/*.html" order="0" />
	<mvc:resources location="/images/" mapping="/images/**" />
	<mvc:resources location="/img/" mapping="/img/**" />
	<mvc:resources location="/download/" mapping="/download/**" />

	<mvc:resources location="/js/" mapping="/js/**" />
	<mvc:resources location="/css/" mapping="/css/**" />
	<mvc:resources location="/plugin/" mapping="/plugin/**" />
	<mvc:resources location="/WEB-INF/pages/" mapping="/pages/**" />

	<bean id="messageSource"
		class="org.springframework.context.support.ResourceBundleMessageSource">
		<property name="basename" value="messages"></property>
	</bean>

	<bean
		class="org.springframework.web.servlet.view.InternalResourceViewResolver">
		<property name="prefix" value="/WEB-INF/pages/" />
		<property name="suffix" value=".jsp" />

	</bean>

	<!-- 支持上传文件 -->
	<bean id="multipartResolver"
		class="org.springframework.web.multipart.commons.CommonsMultipartResolver" />

	<!-- restTemplate -->
	<bean id="restTemplate" class="org.springframework.web.client.RestTemplate">
		<property name="messageConverters" ref="messageConverters">
		</property>
	</bean>
</beans>
```