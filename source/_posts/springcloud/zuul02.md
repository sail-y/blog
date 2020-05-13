---
title: Zuul02-核心流程和源码分析
tags: [spring-cloud,zuul]
date: 2020-05-11 22:12:59
categories: spring-cloud
typora-root-url: ../../../source
---

# 核心流程

在看Zuul的原理之前，要先熟透Ribbon和Hystrix的原理，因为Zuul就是基于这2个组件来做的。

画个图概括下:

![Zuul的核心流程](/img/spring-cloud/Zuul的核心流程.jpg)

<!--more-->

# @EnableZuulProxy

会自动开启一个ZuulProxyAutoConfiguration的自动装配，里面定义了很多的Bean，包括RouteLocator、过滤器等和的一些组件。他的父类`ZuulServerAutoConfiguration`，也包含了很多配置的定义，其中就包括了ZuulServlet，这个是zuul核心请求的入口，拦截所有的请求

```java
@Bean
@ConditionalOnMissingBean(name = "zuulServlet")
public ServletRegistrationBean zuulServlet() {
   ServletRegistrationBean servlet = new ServletRegistrationBean(new ZuulServlet(),
         this.zuulProperties.getServletPattern());
   // The whole point of exposing this servlet is to provide a route that doesn't
   // buffer requests.
   servlet.addInitParameter("buffer-requests", "false");
   return servlet;
}
```

# ZuulServlet

```java
@Override
public void service(javax.servlet.ServletRequest servletRequest, javax.servlet.ServletResponse servletResponse) throws ServletException, IOException {
    try {
        // 初始化RequestContext
        init((HttpServletRequest) servletRequest, (HttpServletResponse) servletResponse);

        // Marks this request as having passed through the "Zuul engine", as opposed to servlets
        // explicitly bound in web.xml, for which requests will not have the same data attached
        RequestContext context = RequestContext.getCurrentContext();
        context.setZuulEngineRan();

        try {
            // 先调用pre 过滤器
            preRoute();
        } catch (ZuulException e) {
            // 报错了，先是error过滤器
            error(e);
            // 然后是post过滤器
            postRoute();
            return;
        }
        try {
            // 然后是 route 过滤器
            route();
        } catch (ZuulException e) {
            error(e);
            postRoute();
            return;
        }
        try {
            // 然后是post过滤器
            postRoute();
        } catch (ZuulException e) {
            error(e);
            return;
        }

    } catch (Throwable e) {
        error(new ZuulException(e, 500, "UNHANDLED_EXCEPTION_" + e.getClass().getName()));
    } finally {
			  // 清理掉ThreadLocal
        RequestContext.getCurrentContext().unset();
    }
}
```



init方法，对RequestContext进行了初始化，他是用ThreadLocal实现的，用装饰器模式包装了Request和Response

```java
public void init(HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
		// 这个是用ThreadLocal实现的
    RequestContext ctx = RequestContext.getCurrentContext();
    // 这个默认是false
    if (bufferRequests) {
        ctx.setRequest(new HttpServletRequestWrapper(servletRequest));
    } else {
        ctx.setRequest(servletRequest);
    }

    ctx.setResponse(new HttpServletResponseWrapper(servletResponse));
}
```



ZuulServlet的代码就能看出来，过滤器的执行逻辑是先执行pre，然后是route，如果这2个filter报错了，就会先执行error，然后是post，但是如果在post阶段报错，就直接执行error。

然后还有一个类是`ZuulServletFilter`，这个类和`ZuulServlet`的代码几乎是一样的，只不过zuul提供了filter和servlet两种方式提供服务，默认情况下是`ZuulServlet`。

下面开始看Zuul自带的过滤器

# pre过滤器

* -3：ServletDetectionFilter
* -2：Servlet30WrapperFilter
* -1：FromBodyWrapperFilter
* 1：DebugFilter
* 5：PreDecorationFilter

所有的filter都是通过FilterProcessor.runFilters()方法来执行的，参数作为过滤器的类型来执行对应阶段的

```java
public void preRoute() throws ZuulException {
    try {
        runFilters("pre");
    } catch (ZuulException e) {
        throw e;
    } catch (Throwable e) {
        throw new ZuulException(e, 500, "UNCAUGHT_EXCEPTION_IN_PRE_FILTER_" + e.getClass().getName());
    }
}

public Object runFilters(String sType) throws Throwable {
    if (RequestContext.getCurrentContext().debugRouting()) {
        Debug.addRoutingDebug("Invoking {" + sType + "} type filters");
    }
    boolean bResult = false;
    // 根据指定的过滤器类型，比如pre，找到所有的pre类型的过滤器，并且是按照优先级排序的
    List<ZuulFilter> list = FilterLoader.getInstance().getFiltersByType(sType);
    if (list != null) {
        for (int i = 0; i < list.size(); i++) {
            ZuulFilter zuulFilter = list.get(i);
            Object result = processZuulFilter(zuulFilter);
            if (result != null && result instanceof Boolean) {
                bResult |= ((Boolean) result);
            }
        }
    }
    return bResult;
}
```

## ServletDetectionFilter

设置isDispatcherServletRequest=true

```java
@Override
public Object run() {
   RequestContext ctx = RequestContext.getCurrentContext();
   HttpServletRequest request = ctx.getRequest();
   // 就判断了下，然后设置了一个标识
   if (!(request instanceof HttpServletRequestWrapper) 
         && isDispatcherServletRequest(request)) {
      ctx.set(IS_DISPATCHER_SERVLET_REQUEST_KEY, true);
   } else {
      ctx.set(IS_DISPATCHER_SERVLET_REQUEST_KEY, false);
   }

   return null;
}
```

## Servlet30WrapperFilter

用Servlet30RequestWrapper包裹了下request，说Zuul 1.2.2里有个bug，HttpServletRequestWrapper没有返回原生的request，所以包裹了以后，getRequest()方法返回原生的request。

```java
@Override
public Object run() {
   RequestContext ctx = RequestContext.getCurrentContext();
   HttpServletRequest request = ctx.getRequest();
   // 不成立
   if (request instanceof HttpServletRequestWrapper) {
      request = (HttpServletRequest) ReflectionUtils.getField(this.requestField,
            request);
      ctx.setRequest(new Servlet30RequestWrapper(request));
   }
   // 用Servlet30RequestWrapper包装下
   else if (RequestUtils.isDispatcherServletRequest()) {
      // If it's going through the dispatcher we need to buffer the body
      ctx.setRequest(new Servlet30RequestWrapper(request));
   }
   return null;
}
```

## FormBodyWrapperFilter

只有在请求content-type为APPLICATION_FORM_URLENCODED或者MULTIPART_FORM_DATA的时候，才会执行这个filter，他一样也是会将用request用FormBodyRequestWrapper包裹一下，

```java
@Override
public Object run() {
   RequestContext ctx = RequestContext.getCurrentContext();
   HttpServletRequest request = ctx.getRequest();
   FormBodyRequestWrapper wrapper = null;
   if (request instanceof HttpServletRequestWrapper) {
      HttpServletRequest wrapped = (HttpServletRequest) ReflectionUtils
            .getField(this.requestField, request);
      wrapper = new FormBodyRequestWrapper(wrapped);
      ReflectionUtils.setField(this.requestField, request, wrapper);
      if (request instanceof ServletRequestWrapper) {
         ReflectionUtils.setField(this.servletRequestField, request, wrapper);
      }
   }
   else {
      wrapper = new FormBodyRequestWrapper(request);
      ctx.setRequest(wrapper);
   }
   if (wrapper != null) {
      ctx.getZuulRequestHeaders().put("content-type", wrapper.getContentType());
   }
   return null;
}
```

## DebugFilter

在http参数传一个?debug=true才会执行这个，然后就设置了2个属性，后续打日志的时候会用到

```java
@Override
public boolean shouldFilter() {
   HttpServletRequest request = RequestContext.getCurrentContext().getRequest();
   if ("true".equals(request.getParameter(DEBUG_PARAMETER.get()))) {
      return true;
   }
   return ROUTING_DEBUG.get();
}

@Override
public Object run() {
   RequestContext ctx = RequestContext.getCurrentContext();
   ctx.setDebugRouting(true);
   ctx.setDebugRequest(true);
   return null;
}
```

## PreDecorationFilter

这个过滤器逻辑稍显复杂，也是核心的一个逻辑，承担了解析路由的工作

1. 解析请求url，拿到了请求的地址
2. 根据请求的url，分析出来serviceId，然后读取到serviceId对应的route配置，这个routeLocator是SimpleRouteLocator，在这里可以做一定的定制化，将route给做到mysql里去。
3. 将Route规则设置到RequestContext中，加了一些请求头

```java
@Override
public Object run() {
   RequestContext ctx = RequestContext.getCurrentContext();
   // 拿到了请求的url path
   final String requestURI = this.urlPathHelper.getPathWithinApplication(ctx.getRequest());
   // 根据请求的url，分析出来serviceId，然后读取到serviceId对应的route配置
   Route route = this.routeLocator.getMatchingRoute(requestURI);
   if (route != null) {
      String location = route.getLocation();
      if (location != null) {
         // route相关规则放进ctx
         ctx.put(REQUEST_URI_KEY, route.getPath());
         ctx.put(PROXY_KEY, route.getId());
         if (!route.isCustomSensitiveHeaders()) {
            this.proxyRequestHelper
                  .addIgnoredHeaders(this.properties.getSensitiveHeaders().toArray(new String[0]));
         }
         else {
            this.proxyRequestHelper.addIgnoredHeaders(route.getSensitiveHeaders().toArray(new String[0]));
         }

         if (route.getRetryable() != null) {
            ctx.put(RETRYABLE_KEY, route.getRetryable());
         }

         if (location.startsWith(HTTP_SCHEME+":") || location.startsWith(HTTPS_SCHEME+":")) {
            ctx.setRouteHost(getUrl(location));
            // 添加了一些header
            ctx.addOriginResponseHeader(SERVICE_HEADER, location);
         }
         else if (location.startsWith(FORWARD_LOCATION_PREFIX)) {
            ctx.set(FORWARD_TO_KEY,
                  StringUtils.cleanPath(location.substring(FORWARD_LOCATION_PREFIX.length()) + route.getPath()));
            ctx.setRouteHost(null);
            return null;
         }
         else {
            // set serviceId for use in filters.route.RibbonRequest
            ctx.set(SERVICE_ID_KEY, location);
            ctx.setRouteHost(null);
            ctx.addOriginResponseHeader(SERVICE_ID_HEADER, location);
         }
         if (this.properties.isAddProxyHeaders()) {
            // 
            addProxyHeaders(ctx, route);
            String xforwardedfor = ctx.getRequest().getHeader(X_FORWARDED_FOR_HEADER);
            String remoteAddr = ctx.getRequest().getRemoteAddr();
            if (xforwardedfor == null) {
               xforwardedfor = remoteAddr;
            }
            else if (!xforwardedfor.contains(remoteAddr)) { // Prevent duplicates
               xforwardedfor += ", " + remoteAddr;
            }
            ctx.addZuulRequestHeader(X_FORWARDED_FOR_HEADER, xforwardedfor);
         }
         if (this.properties.isAddHostHeader()) {
            ctx.addZuulRequestHeader(HttpHeaders.HOST, toHostHeader(ctx.getRequest()));
         }
      }
   }
   else {
      log.warn("No route found for uri: " + requestURI);

      String fallBackUri = requestURI;
      String fallbackPrefix = this.dispatcherServletPath; // default fallback
                                             // servlet is
                                             // DispatcherServlet

      if (RequestUtils.isZuulServletRequest()) {
         // remove the Zuul servletPath from the requestUri
         log.debug("zuulServletPath=" + this.properties.getServletPath());
         fallBackUri = fallBackUri.replaceFirst(this.properties.getServletPath(), "");
         log.debug("Replaced Zuul servlet path:" + fallBackUri);
      }
      else {
         // remove the DispatcherServlet servletPath from the requestUri
         log.debug("dispatcherServletPath=" + this.dispatcherServletPath);
         fallBackUri = fallBackUri.replaceFirst(this.dispatcherServletPath, "");
         log.debug("Replaced DispatcherServlet servlet path:" + fallBackUri);
      }
      if (!fallBackUri.startsWith("/")) {
         fallBackUri = "/" + fallBackUri;
      }
      String forwardURI = fallbackPrefix + fallBackUri;
      forwardURI = forwardURI.replaceAll("//", "/");
      ctx.set(FORWARD_TO_KEY, forwardURI);
   }
   return null;
}
```

### SimpleRouteLocator

这个就是用来读取和保存路由规则的辅助了，用Map维护了一个`private AtomicReference<Map<String, ZuulRoute>> routes = new AtomicReference<>();`，主要需要关注它的locateRoutes方法，可以继承这个类，然后重写locateRoutes方法，改为从数据库读取路由配置。

```java
protected Map<String, ZuulRoute> locateRoutes() {
   LinkedHashMap<String, ZuulRoute> routesMap = new LinkedHashMap<String, ZuulRoute>();
   for (ZuulRoute route : this.properties.getRoutes().values()) {
      routesMap.put(route.getPath(), route);
   }
   return routesMap;
}
```

# route过滤器

* 10：RibbonRoutingFilter
* 100：SimpleHostRoutingFilter
* 500：SendForwardFilter

## RibbonRoutingFilter

如果这个请求是转发给服务的，就会用这个Filter通过Ribbon和Hystrix去执行对应的http请求

```java
@Override
public Object run() {
   RequestContext context = RequestContext.getCurrentContext();
   this.helper.addIgnoredHeaders();
   try {
      // 处理Ribbon相关内容
      RibbonCommandContext commandContext = buildCommandContext(context);
      // 处理Hystrix，并发送请求
      ClientHttpResponse response = forward(commandContext);
      setResponse(response);
      return response;
   }
   catch (ZuulException ex) {
      throw new ZuulRuntimeException(ex);
   }
   catch (Exception ex) {
      throw new ZuulRuntimeException(ex);
   }
}
```

### RibbonCommandContext

对RequestContext里的数据做了解析，封装成了RibbonCommandContext

```
RibbonCommandContext{serviceId='ServiceB', method='GET', uri='/ServiceB/user/sayHello/1', retryable=false, headers={accept=[application/json], cache-control=[no-cache], user-agent=[Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36], content-type=[application/json], accept-language=[zh-CN,zh;q=0.9,en;q=0.8], x-forwarded-host=[localhost:9000], x-forwarded-proto=[http], x-forwarded-prefix=[/demo], x-forwarded-port=[9000], x-forwarded-for=[0:0:0:0:0:0:0:1], Accept-Encoding=[gzip]}, params={name=[张三], age=[20]}, requestEntity=com.netflix.zuul.http.ServletInputStreamWrapper@22453c1d, requestCustomizers=[], contentLength=-1, loadBalancerKey=null}
```

### forward(commandContext);

```java
protected ClientHttpResponse forward(RibbonCommandContext context) throws Exception {
   Map<String, Object> info = this.helper.debug(context.getMethod(),
         context.getUri(), context.getHeaders(), context.getParams(),
         context.getRequestEntity());
   // 这个代码没有什么新鲜的逻辑，看过Ribbon代码的话就知道，这里面就是封装了一个基于Ribbon和Hystrix的Command
   RibbonCommand command = this.ribbonCommandFactory.create(context);
   try {
      ClientHttpResponse response = command.execute();
      this.helper.appendDebug(info, response.getRawStatusCode(), response.getHeaders());
      return response;
   }
   catch (HystrixRuntimeException ex) {
      return handleException(info, ex);
   }
}
```



`ribbonCommandFactory.create`最终创建的类是HttpClientRibbonCommand，这个类其实就是一个HystrixCommand，他实现了自己的run方法，在run方法里，就包含了执行请求的逻辑

```java
// AbstractRibbonCommand#run()
@Override
protected ClientHttpResponse run() throws Exception {
   final RequestContext context = RequestContext.getCurrentContext();

   RQ request = createRequest();
   RS response;
   
   boolean retryableClient = this.client instanceof AbstractLoadBalancingClient
         && ((AbstractLoadBalancingClient)this.client).isClientRetryable((ContextAwareRequest)request);
   
   if (retryableClient) {
      response = this.client.execute(request, config);
   } else {
      // 用负载均衡客户端发起请求,这里面都是ribbon相关的代码了
      response = this.client.executeWithLoadBalancer(request, config);
   }
   context.set("ribbonResponse", response);

   // Explicitly close the HttpResponse if the Hystrix command timed out to
   // release the underlying HTTP connection held by the response.
   //
   if (this.isResponseTimedOut()) {
      if (response != null) {
         response.close();
      }
   }

   return new RibbonHttpResponse(response);
}
```



## SimpleHostRoutingFilter

如果请求是直接配host转发静态路由的，会走这个filter用apache http发送请求

```java
@Override
public Object run() {
   RequestContext context = RequestContext.getCurrentContext();
   HttpServletRequest request = context.getRequest();
   MultiValueMap<String, String> headers = this.helper
         .buildZuulRequestHeaders(request);
   MultiValueMap<String, String> params = this.helper
         .buildZuulRequestQueryParams(request);
   String verb = getVerb(request);
   InputStream requestEntity = getRequestBody(request);
   if (getContentLength(request) < 0) {
      context.setChunkedRequestBody();
   }

   String uri = this.helper.buildZuulRequestURI(request);
   this.helper.addIgnoredHeaders();

   try {
      // 利用Apache HttpComponent发送请求
      CloseableHttpResponse response = forward(this.httpClient, verb, uri, request,
            headers, params, requestEntity);
      setResponse(response);
   }
   catch (Exception ex) {
      throw new ZuulRuntimeException(ex);
   }
   return null;
}
```

## SendForwardFilter

转发到自己本地的接口

```java
@Override
public Object run() {
   try {
      RequestContext ctx = RequestContext.getCurrentContext();
      String path = (String) ctx.get(FORWARD_TO_KEY);
      RequestDispatcher dispatcher = ctx.getRequest().getRequestDispatcher(path);
      if (dispatcher != null) {
         ctx.set(SEND_FORWARD_FILTER_RAN, true);
         if (!ctx.getResponse().isCommitted()) {
            dispatcher.forward(ctx.getRequest(), ctx.getResponse());
            ctx.getResponse().flushBuffer();
         }
      }
   }
   catch (Exception ex) {
      ReflectionUtils.rethrowRuntimeException(ex);
   }
   return null;
}
```

# post过滤器

* 900：LocationRewriteFilter
* 1000：SendResponseFilter 

## LocationRewriteFilter

默认不执行，看响应结果是否需要重定向，如果是的话才会执行。



## SendResponseFilter

这个就是添加了一些请求头，然后将响应写入Response，

1. 优先写入RequestContext.getCurrentContext().getResponseBody()的内容
2. 然后才是context.getResponseDataStream()，也就是应用返回的内容

```java
@Override
public Object run() {
   try {
      addResponseHeaders();
      writeResponse();
   }
   catch (Exception ex) {
      ReflectionUtils.rethrowRuntimeException(ex);
   }
   return null;
}

private void writeResponse() throws Exception {
		RequestContext context = RequestContext.getCurrentContext();
		// there is no body to send
		if (context.getResponseBody() == null
				&& context.getResponseDataStream() == null) {
			return;
		}
		HttpServletResponse servletResponse = context.getResponse();
		if (servletResponse.getCharacterEncoding() == null) { // only set if not set
			servletResponse.setCharacterEncoding("UTF-8");
		}
		OutputStream outStream = servletResponse.getOutputStream();
		InputStream is = null;
		try {
      // 优先写入RequestContext.getCurrentContext().getResponseBody()的内容
			if (RequestContext.getCurrentContext().getResponseBody() != null) {
				String body = RequestContext.getCurrentContext().getResponseBody();
				writeResponse(
						new ByteArrayInputStream(
								body.getBytes(servletResponse.getCharacterEncoding())),
						outStream);
				return;
			}
			boolean isGzipRequested = false;
			final String requestEncoding = context.getRequest()
					.getHeader(ZuulHeaders.ACCEPT_ENCODING);

			if (requestEncoding != null
					&& HTTPRequestUtils.getInstance().isGzipped(requestEncoding)) {
				isGzipRequested = true;
			}
      // 然后才是context.getResponseDataStream()，也就是应用返回的内容
			is = context.getResponseDataStream();
			InputStream inputStream = is;
      // ....省略部分代码
```

# error过滤器

* 0：SendErrorFilter

## SendErrorFilter

直接转发到`/error`路径，这个就是BasicErrorController的路径，所以要想定制异常消息，继承这个类

```java
@Override
public Object run() {
   try {
      RequestContext ctx = RequestContext.getCurrentContext();
      ZuulException exception = findZuulException(ctx.getThrowable());
      HttpServletRequest request = ctx.getRequest();

      request.setAttribute("javax.servlet.error.status_code", exception.nStatusCode);

      log.warn("Error during filtering", exception);
      request.setAttribute("javax.servlet.error.exception", exception);

      if (StringUtils.hasText(exception.errorCause)) {
         request.setAttribute("javax.servlet.error.message", exception.errorCause);
      }
 	    // 直接转发到/error路径，这个就是BasicErrorController，所以要想定制异常消息，继承这个类
      RequestDispatcher dispatcher = request.getRequestDispatcher(
            this.errorPath);
      if (dispatcher != null) {
         ctx.set(SEND_ERROR_FILTER_RAN, true);
         if (!ctx.getResponse().isCommitted()) {
            ctx.setResponseStatusCode(exception.nStatusCode);
            dispatcher.forward(request, ctx.getResponse());
         }
      }
   }
   catch (Exception ex) {
      ReflectionUtils.rethrowRuntimeException(ex);
   }
   return null;
}
```

# 画图总结

![Zuul源码分析 (/img/spring-cloud/Zuul源码分析 (1).jpg)](/../../../Downloads/Zuul源码分析 (1).jpg)