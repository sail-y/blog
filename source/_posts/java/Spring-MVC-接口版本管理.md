title: Spring MVC 接口版本管理
date: 2015-03-31 10:06:12
tags: [Java, Rest, Spring Mvc]
categories: spring
---

随着我们的应用后台不断的发版，因为改动导致了数据结构的变化，这个时候就需要对HTTP API进行版本控制了。对原有的客户端进行兼容，搜索一番后找到一个方法。		
先看这个文章，提供了一个解决方案。
http://www.cnblogs.com/jcli/p/springmvc_restful_version.html

Spring MVC通过在方法上使用`RequestMapping`来确认应该使用哪个方法来响应相应的请求，而RequestMapping又通过各种RequestCondition的实现来完成各种过滤（比如：consumes，headers，methods，params，produces以及value等）。在Spring MVC框架中使用RequestConditionHolder和RequestMappingInfo这两个实现。
			
######  自定义RequestCondition
* 实现RequestCondition接口

```java
package org.springframework.web.servlet.mvc.condition;

import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.RequestMapping;

public interface RequestCondition<T> {
  T combine(T other);
  T getMatchingCondition(HttpServletRequest request);
  int compareTo(T other, HttpServletRequest request);
}
```
* 继承RequestMappingHandlerMapping
  - getCustomTypeCondition方法根据对应的Handler类返回类级别的condition
  - getCustomMethodCondition方法根据对应的Handler方法返回方法级别的condition

<!--more-->
基本上我是照着他做的，不过我这里也是遇到不少的问题，因为数据是直接post的json，需要转换为实体对象，所以还需要一些额外的配置。文中提到：

>最后，得让SpringMVC加载我们定义的CustomRequestMappingHandlerMapping以覆盖原先的RequestMappingHandlerMapping, 所以要去掉前面说的<mvc:annotation-driven/>这个配置，我们通过JavaConfig的方式注入

我是不太愿意去掉`<mvc:annotation-driven/>`的，不过试了半天也没有好的效果，因为
`<mvc:annotation-driven/>`注册的东西太多了。
我尝试直接写一个`org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping` 一样包名的类来覆盖掉spring的类，来改掉getCustomTypeCondition和getCustomMethodCondition的方法实现。现在来看应该是可行的，但我没有这样干是因为中途遇见一个问题一直没调试好，最终又换成了自定义的类。这个问题就是因为客户端目前的版本号全部是在post的json中传过来的，就不考虑在路径上做改动。	
所以我出现了这样的操作，在没找到问题之前我一直以为我重写的类这一种方式有问题，看代码

```java
public ApiVersionCondition getMatchingCondition(HttpServletRequest request) {
    String device = null;
    try {
        device = JSONUtil.parse(request.getInputStream()).getString("device");
    } catch (IOException e) {
        log.error(e.getMessage(), e);
    }
    int version = VersionUtil.getVersion(JSON.parseObject(device).getString("app_ver"));
    if (version >= this.apiVersion) // 如果请求的版本号大于配置版本号， 则满足
        return this;
    return null;
}
```

这个就是把post过来的json数据取出来，然后取出里面的version进行判断，不过我得到这样一个错误，看了很久也没看懂
```
org.springframework.http.converter.HttpMessageNotReadableException: Required request body content is missing: org.springframework.web.method.HandlerMethod$HandlerMethodParameter@bee0537e
	at org.springframework.web.servlet.mvc.method.annotation.RequestResponseBodyMethodProcessor.handleEmptyBody(RequestResponseBodyMethodProcessor.java:189) ~[spring-webmvc-4.1.3.RELEASE.jar:4.1.3.RELEASE]
	at org.springframework.web.servlet.mvc.method.annotation.RequestResponseBodyMethodProcessor.readWithMessageConverters(RequestResponseBodyMethodProcessor.java:170) ~[spring-webmvc-4.1.3.RELEASE.jar:4.1.3.RELEASE]
	at org.springframework.web.servlet.mvc.method.annotation.RequestResponseBodyMethodProcessor.resolveArgument(RequestResponseBodyMethodProcessor.java:105) ~[spring-webmvc-4.1.3.RELEASE.jar:4.1.3.RELEASE]
	at org.springframework.web.method.support.HandlerMethodArgumentResolverComposite.resolveArgument(HandlerMethodArgumentResolverComposite.java:77) ~[spring-web-4.1.3.RELEASE.jar:4.1.3.RELEASE]
	at org.springframework.web.method.support.InvocableHandlerMethod.getMethodArgumentValues(InvocableHandlerMethod.java:162) ~[spring-web-4.1.3.RELEASE.jar:4.1.3.RELEASE]
	at org.springframework.web.method.support.InvocableHandlerMethod.invokeForRequest(InvocableHandlerMethod.java:129) ~[spring-web-4.1.3.RELEASE.jar:4.1.3.RELEASE]
	at org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod.invokeAndHandle(ServletInvocableHandlerMethod.java:110) ~[spring-webmvc-4.1.3.RELEASE.jar:4.1.3.RELEASE]
	at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.invokeHandleMethod(RequestMappingHandlerAdapter.java:777) ~[spring-webmvc-4.1.3.RELEASE.jar:4.1.3.RELEASE]
	at org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter.handleInternal(RequestMappingHandlerAdapter.java:706) ~[spring-webmvc-4.1.3.RELEASE.jar:4.1.3.RELEASE]
	at org.springframework.web.servlet.mvc.method.AbstractHandlerMethodAdapter.handle(AbstractHandlerMethodAdapter.java:85) ~[spring-webmvc-4.1.3.RELEASE.jar:4.1.3.RELEASE]
	at org.springframework.web.servlet.DispatcherServlet.doDispatch(DispatcherServlet.java:943) ~[spring-webmvc-4.1.3.RELEASE.jar:4.1.3.RELEASE]
	at org.springframework.web.servlet.DispatcherServlet.doService(DispatcherServlet.java:877) ~[spring-webmvc-4.1.3.RELEASE.jar:4.1.3.RELEASE]
	at org.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:966) [spring-webmvc-4.1.3.RELEASE.jar:4.1.3.RELEASE]
	
	```
然后才发现我在这里把inputStream读了以后，到controller那一层已经没有任何数据了。基本上是算得上自己作死加犯傻了。结果还是采取的在Http Header里面放一个版本号来进行判断。
```
public ApiVersionCondition getMatchingCondition(HttpServletRequest request) {

    int version = VersionUtil.getVersion(request.getHeader("App-Version"));

    if (version >= this.apiVersion) // 如果请求的版本号大于配置版本号， 则满足
        return this;
    return null;
}
```
说一下配置的地方，我没有用WebConfig的配置方式，但还是去掉了`<mvc:annotation-driven>`
换成了几个bean。
下面贴上我的配置
```
<!--RequestMapping解析器-->
<bean class="com.xiaomaihd.xueshaqu.version.CustomRequestMappingHandlerMapping">
    <property name="order" value="0"/>
    <property name="interceptors">
        <list>
            <ref bean="conversionServiceExposingInterceptor"/>
        </list>
    </property>
</bean>

<bean
        class="org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter">
    <property name="webBindingInitializer">
        <bean
                class="org.springframework.web.bind.support.ConfigurableWebBindingInitializer">
            <property name="conversionService" ref="conversionService"/>
            <property name="validator" ref="validator"/>
        </bean>
    </property>
    <property name="messageConverters" ref="messageConverters">

    </property>
</bean>

<bean id="conversionService" class="org.springframework.format.support.FormattingConversionServiceFactoryBean"/>

<bean id="conversionServiceExposingInterceptor"
      class="org.springframework.web.servlet.handler.ConversionServiceExposingInterceptor">
    <constructor-arg ref="conversionService"/>
</bean>
```
大功告成，目前还没发现其他的问题