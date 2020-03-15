---
title: Sleuth在异步线程中丢失traceId的解决方案
tags: [spring, sleuth]
date: 2018-12-29 09:55:21
categories: spring
---

# 背景

今天同事说在Hystrix的执行方法里打印日志的时候，Sleuth的traceId丢失了，产生了新的traceId，我第一反应是难道是因为Hystrix采用的是线程隔离模式，所以导致sleuth在线程切换的时候丢失了traceId吗？但是我记得Sleuth是针对是Hystrix处理过的，具体的处理的类就是`SleuthHystrixConcurrencyStrategy`。Spring Cloud Sleuth专门对Hystrix处理过线程切换上下文传递的问题。
<!--more-->

所以我猜测可能是同事的业务代码里使用了线程池。经确认后确实有线程池代码，原因同样是线程上下文切换丢失了traceId。那么接下来就去找一找解决方案吧。



# 解决方案

在Spring的官方文档中，我们找到了关于异步通讯的部分。

https://cloud.spring.io/spring-cloud-static/spring-cloud-sleuth/1.3.4.RELEASE/single/spring-cloud-sleuth.html#_asynchronous_communication

我也贴一下原文：

> ## Executor, ExecutorService and ScheduledExecutorService


> We’re providing LazyTraceExecutor, TraceableExecutorService and TraceableScheduledExecutorService. Those implementations are creating Spans each time a new task is submitted, invoked or scheduled.

> Here you can see an example of how to pass tracing information with TraceableExecutorService when working with CompletableFuture:

> ```java
CompletableFuture<Long> completableFuture = CompletableFuture.supplyAsync(() -> {
	// perform some logic
	return 1_000_000L;
}, new TraceableExecutorService(executorService,
		// 'calculateTax' explicitly names the span - this param is optional
		tracer, traceKeys, spanNamer, "calculateTax"));
```
> **Important**
> 
> Sleuth doesn’t work with parallelStream() out of the box. If you want to have the tracing information propagated through the stream you have to use the approach with supplyAsync(...) as presented above.


大概意思就是Sleuth提供了一个`TraceableExecutorService`包装我们自己的ExecutorService，我们手动传入traceId等参数。并且在提交新的任务的时候，`TraceableExecutorService`会为我们创建新的Span，但是traceId是一致的。

所以大家在用Sleuth的时候，如果代码里有用到线程池、或者Spring Boot提供的@Async注解的时候，大家需要注意一下traceId丢失的问题，这样会导致链路无法追踪。

下面分别贴出两种情况的解决方案代码。


## 线程池

```java
@Autowired
private BeanFactory beanFactory;

private TraceableExecutorService traceableExecutorService;

@PostConstruct
public void init() {
    traceableExecutorService = new TraceableExecutorService(beanFactory, ThreadUtil.newExecutor());
}

@GetMapping("/{id}")
public R getR(@PathVariable("id") Long id) {
    
    traceableExecutorService.execute(() -> someMethod());
    
```


效果：

```log
[demo,96d8ba3676199532,96d8ba3676199532] [ix-RedisGroup-1]
[demo,96d8ba3676199532,d5538e854c35b369] [ix-redisGroup-1] 
[demo,96d8ba3676199532,96d8ba3676199532] [nio-5000-exec-3]
```

第一行是Hystrix执行的时候打印的，第二行是异步线程执行的时候打印的，第三行是同步执行的时候打印的。

## @Async注解

用`TraceableExecutorService`包装线程池。


```java
@Configuration
@EnableAutoConfiguration
@EnableAsync
static class CustomExecutorConfig extends AsyncConfigurerSupport {

	@Autowired BeanFactory beanFactory;

	@Override public Executor getAsyncExecutor() {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		// CUSTOMIZE HERE
		executor.setCorePoolSize(7);
		executor.setMaxPoolSize(42);
		executor.setQueueCapacity(11);
		executor.setThreadNamePrefix("MyExecutor-");
		// DON'T FORGET TO INITIALIZE
		executor.initialize();
		return new LazyTraceExecutor(this.beanFactory, executor);
	}
}
```

赶紧查查代码里有没有这个问题吧



