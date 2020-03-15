---
title: Spring Cloud Zuul中修改URI
tags: [zuul]
date: 2018-12-11 17:14:01
categories: spring
---


# Zuul 修改URI

## 背景

最近项目中有一个需求，因为系统要进行重构，所以在重构期间网关需要判断URL请求的是老系统还是新系统。如果请求的是老系统那么就需要根据URL和参数在网关层对进行转换，也就是要修改成新系统的URL，并转发到新系统上去。如果请求的是新系统，那么则不做处理，进行相应的鉴权操作。

<!--more-->
## 实践

在网上搜索了一番以后，发现zuul提供了一种方式，就是自定义一个Pre类型的Filter，然后写入这行代码：

```java
ctx.set(FilterConstants.REQUEST_URI_KEY, yourUri);
```

经过我的测试，他确实可以修改URI，但是并不满足我的需求。

客户端请求的是/a/helloA，我在这里修改成/b/helloB，我会得到一个404错误。经过分析发现，它已经确定了/a/**开头对应的服务，然后在a服务里去找/b/helloB这个路径，所以得到的是一个404。我的需求是修改成b服务下的/helloB请求。

所以我必须在zuul解析/a/** ->> a服务之前就将路径修改了，经过一番探索，以及zuul自带的filter里的源码，我发现`PreDecorationFilter`里有这样一段代码：

```java
@Override
	public Object run() {
		RequestContext ctx = RequestContext.getCurrentContext();
		final String requestURI = this.urlPathHelper.getPathWithinApplication(ctx.getRequest());
		Route route = this.routeLocator.getMatchingRoute(requestURI);
		if (route != null) {
			String location = route.getLocation();
			if (location != null) {
				ctx.put(REQUEST_URI_KEY, route.getPath());
				ctx.put(PROXY_KEY, route.getId());
		.....
```

这不就是获取URI，然后routeLocator获取匹配的Route的代码吗？

那我们跟进`this.urlPathHelper.getPathWithinApplication(ctx.getRequest());`，看看它是怎么获取URI的。

```java
public String getPathWithinApplication(HttpServletRequest request) {
	String contextPath = getContextPath(request);
	String requestUri = getRequestUri(request);
	String path = getRemainingPath(requestUri, contextPath, true);
	if (path != null) {
		// Normal case: URI contains context path.
		return (StringUtils.hasText(path) ? path : "/");
	}
	else {
		return requestUri;
	}
}

public String getRequestUri(HttpServletRequest request) {
	String uri = (String) request.getAttribute(WebUtils.INCLUDE_REQUEST_URI_ATTRIBUTE);
	if (uri == null) {
		uri = request.getRequestURI();
	}
	return decodeAndCleanUriString(request, uri);
}
```

发现Spring是这样来获取URI的：`request.getAttribute(WebUtils.INCLUDE_REQUEST_URI_ATTRIBUTE);`

既然这样，那我们就可以自由发挥一下了。

## 改进

我的思路就是在执行`PreDecorationFilter`之前，将request的attribute中的`WebUtils.INCLUDE_REQUEST_URI_ATTRIBUTE`先设置一下。首先`PreDecorationFilter`的order是5，自定义的过滤得在它前面执行，接下来自定义一个过滤器吧。



```java
public class ServiceName2APIFilter extends ZuulFilter {

    @Override
    public String filterType() {
        return FilterConstants.PRE_TYPE;
    }

    @Override
    public int filterOrder() {
        return FilterConstants.PRE_DECORATION_FILTER_ORDER - 1;
    }

    @Override
    public boolean shouldFilter() {
        RequestContext ctx = RequestContext.getCurrentContext();
        HttpServletRequest request = ctx.getRequest();
        final String uri = request.getRequestURI();

        return uri.contains("/helloB");

    }

    @Override
    public Object run() {
        RequestContext ctx = RequestContext.getCurrentContext();
        final HttpServletRequest request = ctx.getRequest();
        // 转发回到helloA
        // 将替换掉的url set进去,在对应的转发请求的url就会使用这个url

        request.setAttribute(WebUtils.INCLUDE_REQUEST_URI_ATTRIBUTE, "/a/helloA");
        return null;
    }
}
```

记得标记@Bean

```java
@Bean
public ServiceName2APIFilter serviceName2APIFilter() {
    return new ServiceName2APIFilter();
}
```

然后我测试了一下，成功了，需求解决。
