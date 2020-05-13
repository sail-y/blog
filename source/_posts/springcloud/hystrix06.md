---
title: HystrixCommand执行源码分析
tags: [spring-cloud,hystrix]
date: 2020-05-09 21:03:59
categories: spring-cloud
typora-root-url: ../../../source

---

# HystrixCommand.execute源码细节

HystrixCommand会将任务丢到异步线程池里去执行，通过Future获取执行完毕的结果。

```java
// HystrixCommand.java
public R execute() {
    try {
        return queue().get();
    } catch (Exception e) {
        throw Exceptions.sneakyThrow(decomposeException(e));
    }
}
```

queue()方法，是用来异步执行的command逻辑的，他会将command扔到线程池里去执行，但是这个方法不会等待线程执行完毕command，他会拿到一个Future对象，通过Future对象去获取command执行完毕的响应结果。

<!--more-->

```java
/*
 * The Future returned by Observable.toBlocking().toFuture() does not implement the
 * interruption of the execution thread when the "mayInterrupt" flag of Future.cancel(boolean) is set to true;
 * thus, to comply with the contract of Future, we must wrap around it.
 */
final Future<R> delegate = toObservable().toBlocking().toFuture();
```

toObservable().toBlocking().toFuture();这行代码已经把command扔到线程池里去执行了，并且拿到了一个Future对象，没有办法在异常情况下终止Future对象对应的线程的执行，所以要对Future做一个包装。

```java
final Future<R> f = new Future<R>() {

    @Override
    public boolean cancel(boolean mayInterruptIfRunning) {
        if (delegate.isCancelled()) {
            return false;
        }
      ......
```

然后接下来就是对delegate做了包装，实现了一下cancel等方法。

```java
if (f.isDone()) {
    try {
        f.get();
        return f;
```

f.isDone()，通过future判断对应的那个线程是否完成了command的执行，然后调用f.get()会阻塞住，获取到Thread执行command返回的结果。

那我们就发现，在调用queue()方法后，就会通过线程池去执行command，然后在queue()方法中，会等待线程执行结束，如果线程执行结束了，就会返回future；即使执行失败了，也会根据情况，返回future，要不就是抛异常。

下面，我们接着分析`toObservable().toBlocking().toFuture();`核心逻辑，它实现了Hystrix几乎所有的核心逻辑，包括请求缓存、熔断、队列+线程池、线程异步执行、超时检测、异常处理、异常统计、熔断开关等。



## toObservable()

```java
Used for asynchronous execution of command with a callback by subscribing to the {@link Observable}.
```

获取到Observable后，Command还没有立即开始执行，只是将Command封装到了Observable对象。如果订阅了Observable对象，提供了回调接口，才会触发执行，并根据Command执行结果回调提供的接口。

```java
An eager {@link Observable} can be obtained from {@link #observe()}.
```

如果希望获取到Observable对象就立即执行内部的Command的话，就不要调用toObservable()方法，可以去调用observe()方法



声明了一堆匿名内部类

```java
// AbstractCommand.java
final Action0 terminateCommandCleanup = new Action0() {

    @Override
    public void call() {
        // 如果状态是OBSERVABLE_CHAIN_CREATED
        if (_cmd.commandState.compareAndSet(CommandState.OBSERVABLE_CHAIN_CREATED, CommandState.TERMINAL)) {
            // 设置成false，并且用户的代码没有被执行过（HystrixCommand.run）
            handleCommandEnd(false); //user code never ran
          // 如果状态是USER_CODE_EXECUTED
        } else if (_cmd.commandState.compareAndSet(CommandState.USER_CODE_EXECUTED, CommandState.TERMINAL)) {
            // 设置成true，并且用户的代码已经运行过了（HystrixCommand.run）
          handleCommandEnd(true); //user code did run
        }
    }
};
```

unsubscribeCommandCleanup

applyHystrixSemantics

wrapWithAllOnNextHooks

fireOnCompletedHook

然后基于上面的这些回调，去创建了Observable对象，因为创建Observable对象后，并不会被立马执行，所以在调用toBlocking()方法之后，才会触发执行call方法，再依次去执行上面的5个回调方法。因为Observable是rxjava的代码，所以toBlocking()的源码这里就不再跟进去看了。

```java
// AbstractCommand.java
return Observable.defer(new Func0<Observable<R>>() {
    // 调用toBlocking方法后就会触发执行这里的代码了
    @Override
    public Observable<R> call() {
        // 一个Command命令只能被执行一次，所以Command对象每次都是new
        // 刚开始状态是NOT_STARTED
         /* this is a stateful object so can only be used once */
        if (!commandState.compareAndSet(CommandState.NOT_STARTED, CommandState.OBSERVABLE_CHAIN_CREATED)) {
            IllegalStateException ex = new IllegalStateException("This instance can only be executed once. Please instantiate a new instance.");
            //TODO make a new error type for this
            throw new HystrixRuntimeException(FailureType.BAD_REQUEST_EXCEPTION, _cmd.getClass(), getLogMessagePrefix() + " command executed multiple times - this is not permitted.", ex, null);
        }
				// 命令开始的时间戳
        commandStartTimestamp = System.currentTimeMillis();

        // 日志
        if (properties.requestLogEnabled().get()) {
            // log this command execution regardless of what happened
            // 请求日志
            if (currentRequestLog != null) {
                currentRequestLog.addExecutedCommand(_cmd);
            }
        }

        final boolean requestCacheEnabled = isRequestCachingEnabled();
        final String cacheKey = getCacheKey();

        // 缓存RequestCache
        /* try from cache first */
        if (requestCacheEnabled) {
            HystrixCommandResponseFromCache<R> fromCache = (HystrixCommandResponseFromCache<R>) requestCache.get(cacheKey);
            if (fromCache != null) {
                isResponseFromCache = true;
                return handleRequestCacheHitAndEmitValues(fromCache, _cmd);
            }
        }
        // 利用回调创建了Observable对象
        Observable<R> hystrixObservable =
                Observable.defer(applyHystrixSemantics)
                        .map(wrapWithAllOnNextHooks);

        Observable<R> afterCache;

        // 处理Request cache
        // put in cache
        if (requestCacheEnabled && cacheKey != null) {
            // wrap it for caching
            HystrixCachedObservable<R> toCache = HystrixCachedObservable.from(hystrixObservable, _cmd);
            HystrixCommandResponseFromCache<R> fromCache = (HystrixCommandResponseFromCache<R>) requestCache.putIfAbsent(cacheKey, toCache);
            if (fromCache != null) {
                // another thread beat us so we'll use the cached value instead
                toCache.unsubscribe();
                isResponseFromCache = true;
                return handleRequestCacheHitAndEmitValues(fromCache, _cmd);
            } else {
                // we just created an ObservableCommand so we cast and return it
                afterCache = toCache.toObservable();
            }
        } else {
            afterCache = hystrixObservable;
        }

        return afterCache
                .doOnTerminate(terminateCommandCleanup)     // perform cleanup once (either on normal terminal state (this line), or unsubscribe (next line))
                .doOnUnsubscribe(unsubscribeCommandCleanup) // perform cleanup once
                .doOnCompleted(fireOnCompletedHook);
    }
});
```

1. 刚开始命令的状态是NOT_STARTED，设置为OBSERVABLE_CHAIN_CREATED
2. 记录请求日志（默认启用，但是不处理）
3. 从缓存读取（默认没有启用缓存）
4. 得到Observable对象，将5个回调设置到对应doOnCompleted、doOnUnsubscribe等的方法里

那实际上真正执行Command的代码，是在applyHystrixSemantics的回调里

## applyHystrixSemantics

1. applyHystrixSemantics.call()调用applyHystrixSemantics方法 
2. 判断断路器是否打开
3. 拿到一个信号量
4. 执行executeCommandAndObserve

```java
// AbstractCommand.java
private Observable<R> applyHystrixSemantics(final AbstractCommand<R> _cmd) {
    // mark that we're starting execution on the ExecutionHook
    // if this hook throws an exception, then a fast-fail occurs with no fallback.  No state is left inconsistent
    // 这个类是ExecutionHookDeprecationWrapper，是内部类
    executionHook.onStart(_cmd);

    // 断路器是否打开，打开的话直接走降级逻辑
    /* determine if we're allowed to execute */
    if (circuitBreaker.attemptExecution()) {
        // 这里会拿到信号量，如果不是使用SEMAPHORE的话，这里拿到的是一个什么都不干的TryableSemaphoreNoOp.DEFAULT
        final TryableSemaphore executionSemaphore = getExecutionSemaphore();
        final AtomicBoolean semaphoreHasBeenReleased = new AtomicBoolean(false);
        final Action0 singleSemaphoreRelease = new Action0() {
            @Override
            public void call() {
                if (semaphoreHasBeenReleased.compareAndSet(false, true)) {
                    executionSemaphore.release();
                }
            }
        };

        final Action1<Throwable> markExceptionThrown = new Action1<Throwable>() {
            @Override
            public void call(Throwable t) {
                eventNotifier.markEvent(HystrixEventType.EXCEPTION_THROWN, commandKey);
            }
        };

        if (executionSemaphore.tryAcquire()) {
            try {
                /* used to track userThreadExecutionTime */
                executionResult = executionResult.setInvocationStartTime(System.currentTimeMillis());
                // 核心逻辑在executeCommandAndObserve里
                return executeCommandAndObserve(_cmd)
                        .doOnError(markExceptionThrown)
                        .doOnTerminate(singleSemaphoreRelease)
                        .doOnUnsubscribe(singleSemaphoreRelease);
            } catch (RuntimeException e) {
                return Observable.error(e);
            }
        } else {
            return handleSemaphoreRejectionViaFallback();
        }
    } else {
        return handleShortCircuitViaFallback();
    }
}

/**
 * Get the TryableSemaphore this HystrixCommand should use for execution if not running in a separate thread.
 * 
 * @return TryableSemaphore
 */
// 如果不是信号量的话，返回TryableSemaphoreNoOp.DEFAULT，啥也不干
protected TryableSemaphore getExecutionSemaphore() {
    // 用SEMAPHORE
    if (properties.executionIsolationStrategy().get() == ExecutionIsolationStrategy.SEMAPHORE) {
        if (executionSemaphoreOverride == null) {
            TryableSemaphore _s = executionSemaphorePerCircuit.get(commandKey.name());
            if (_s == null) {
                // we didn't find one cache so setup
                executionSemaphorePerCircuit.putIfAbsent(commandKey.name(), new TryableSemaphoreActual(properties.executionIsolationSemaphoreMaxConcurrentRequests()));
                // assign whatever got set (this or another thread)
                return executionSemaphorePerCircuit.get(commandKey.name());
            } else {
                return _s;
            }
        } else {
            return executionSemaphoreOverride;
        }
    } else {
        // return NoOp implementation since we're not using SEMAPHORE isolation
        // 不用SEMAPHORE
        return TryableSemaphoreNoOp.DEFAULT;
    }
}
```

## executeCommandAndObserve

executeCommandAndObserve代码，又是一堆回调，先把回调记录下来

1. markEmits
2. markOnCompleted
3. handleFallback
4. setRequestContext

```java
// AbstractCommand.java
/**
 * This decorates "Hystrix" functionality around the run() Observable.
 *
 * @return R
 */
private Observable<R> executeCommandAndObserve(final AbstractCommand<R> _cmd) {
    final HystrixRequestContext currentRequestContext = HystrixRequestContext.getContextForCurrentThread();

    final Action1<R> markEmits = new Action1<R>() {
        @Override
        public void call(R r) {
            if (shouldOutputOnNextEvents()) {
                executionResult = executionResult.addEvent(HystrixEventType.EMIT);
                eventNotifier.markEvent(HystrixEventType.EMIT, commandKey);
            }
            if (commandIsScalar()) {
                long latency = System.currentTimeMillis() - executionResult.getStartTimestamp();
                eventNotifier.markEvent(HystrixEventType.SUCCESS, commandKey);
                executionResult = executionResult.addEvent((int) latency, HystrixEventType.SUCCESS);
                eventNotifier.markCommandExecution(getCommandKey(), properties.executionIsolationStrategy().get(), (int) latency, executionResult.getOrderedList());
                circuitBreaker.markSuccess();
            }
        }
    };

    final Action0 markOnCompleted = new Action0() {
        @Override
        public void call() {
            if (!commandIsScalar()) {
                long latency = System.currentTimeMillis() - executionResult.getStartTimestamp();
                eventNotifier.markEvent(HystrixEventType.SUCCESS, commandKey);
                executionResult = executionResult.addEvent((int) latency, HystrixEventType.SUCCESS);
                eventNotifier.markCommandExecution(getCommandKey(), properties.executionIsolationStrategy().get(), (int) latency, executionResult.getOrderedList());
                circuitBreaker.markSuccess();
            }
        }
    };

    final Func1<Throwable, Observable<R>> handleFallback = new Func1<Throwable, Observable<R>>() {
        @Override
        public Observable<R> call(Throwable t) {
            circuitBreaker.markNonSuccess();
            Exception e = getExceptionFromThrowable(t);
            executionResult = executionResult.setExecutionException(e);
            if (e instanceof RejectedExecutionException) {
                return handleThreadPoolRejectionViaFallback(e);
            } else if (t instanceof HystrixTimeoutException) {
                return handleTimeoutViaFallback();
            } else if (t instanceof HystrixBadRequestException) {
                return handleBadRequestByEmittingError(e);
            } else {
                /*
                 * Treat HystrixBadRequestException from ExecutionHook like a plain HystrixBadRequestException.
                 */
                if (e instanceof HystrixBadRequestException) {
                    eventNotifier.markEvent(HystrixEventType.BAD_REQUEST, commandKey);
                    return Observable.error(e);
                }

                return handleFailureViaFallback(e);
            }
        }
    };

    final Action1<Notification<? super R>> setRequestContext = new Action1<Notification<? super R>>() {
        @Override
        public void call(Notification<? super R> rNotification) {
            setRequestContextIfNeeded(currentRequestContext);
        }
    };

    
    Observable<R> execution;
    // 是否开启超时，用线程池隔离去执行
    if (properties.executionTimeoutEnabled().get()) {
        execution = executeCommandWithSpecifiedIsolation(_cmd)
                .lift(new HystrixObservableTimeoutOperator<R>(_cmd));
    } else {
        execution = executeCommandWithSpecifiedIsolation(_cmd);
    }

    return execution.doOnNext(markEmits)
            .doOnCompleted(markOnCompleted)
            .onErrorResumeNext(handleFallback)
            .doOnEach(setRequestContext);
}
```

## executeCommandWithSpecifiedIsolation

继续往executeCommandWithSpecifiedIsolation方法里跟，到这里，就发现了他会判断你如果隔离策略是Thread，执行线程池相关逻辑，如果是信号量，执行信号量相关逻辑。

我们在这个代码里，去找一下跟线程池有关的代码到底在哪里，肯定是有一个队列+线程池。

1. 默认是线程隔离
2. 命令状态从OBSERVABLE_CHAIN_CREATED切换到USER_CODE_EXECUTED，不是就报错
3. 记录监控数据，命令开始
4. 判断是否已经超时了（在执行run方法之前，就已经超时）
5. 调用startCurrentThreadExecutingCommand方法，将要执行的一个命令，压入一个栈中
6. 调用getUserExecutionObservable方法，在这个方法里，最终会去执行run方法



```java
// AbstractCommand.java
private Observable<R> executeCommandWithSpecifiedIsolation(final AbstractCommand<R> _cmd) {
    // 默认就是线程隔离的
    if (properties.executionIsolationStrategy().get() == ExecutionIsolationStrategy.THREAD) {
        // mark that we are executing in a thread (even if we end up being rejected we still were a THREAD execution and not SEMAPHORE)
        return Observable.defer(new Func0<Observable<R>>() {
            @Override
            public Observable<R> call() {
                executionResult = executionResult.setExecutionOccurred();
                // 命令状态从OBSERVABLE_CHAIN_CREATED切换到USER_CODE_EXECUTED，不是花就报错
                if (!commandState.compareAndSet(CommandState.OBSERVABLE_CHAIN_CREATED, CommandState.USER_CODE_EXECUTED)) {
                    return Observable.error(new IllegalStateException("execution attempted while in state : " + commandState.get().name()));
                }
								// 监控
                metrics.markCommandStart(commandKey, threadPoolKey, ExecutionIsolationStrategy.THREAD);

                if (isCommandTimedOut.get() == TimedOutStatus.TIMED_OUT) {
                    // the command timed out in the wrapping thread so we will return immediately
                    // and not increment any of the counters below or other such logic
                    return Observable.error(new RuntimeException("timed out before executing run()"));
                }
                // 判断线程的状态，从NOT_USING_THREAD，切换到STARTED
                if (threadState.compareAndSet(ThreadState.NOT_USING_THREAD, ThreadState.STARTED)) {
                    //we have not been unsubscribed, so should proceed
                    HystrixCounters.incrementGlobalConcurrentThreads();
                    threadPool.markThreadExecution();
                    // store the command that is being run
                    // 将要执行的一个命令，压入一个栈中
                    endCurrentThreadExecutingCommand = Hystrix.startCurrentThreadExecutingCommand(getCommandKey());
                    executionResult = executionResult.setExecutedInThread();
                    /**
                     * If any of these hooks throw an exception, then it appears as if the actual execution threw an error
                     */
                    try {
                        // 这几行代码也没干啥
                        executionHook.onThreadStart(_cmd);
                        executionHook.onRunStart(_cmd);
                        executionHook.onExecutionStart(_cmd);
                        // run方法最终执行的地方
                        return getUserExecutionObservable(_cmd);
                    } catch (Throwable ex) {
                        return Observable.error(ex);
                    }
                } else {
                    //command has already been unsubscribed, so return immediately
                    return Observable.error(new RuntimeException("unsubscribed before executing run()"));
                }
            }
        }).doOnTerminate(new Action0() {
            @Override
            public void call() {
                if (threadState.compareAndSet(ThreadState.STARTED, ThreadState.TERMINAL)) {
                    handleThreadEnd(_cmd);
                }
                if (threadState.compareAndSet(ThreadState.NOT_USING_THREAD, ThreadState.TERMINAL)) {
                    //if it was never started and received terminal, then no need to clean up (I don't think this is possible)
                }
                //if it was unsubscribed, then other cleanup handled it
            }
        }).doOnUnsubscribe(new Action0() {
            @Override
            public void call() {
                if (threadState.compareAndSet(ThreadState.STARTED, ThreadState.UNSUBSCRIBED)) {
                    handleThreadEnd(_cmd);
                }
                if (threadState.compareAndSet(ThreadState.NOT_USING_THREAD, ThreadState.UNSUBSCRIBED)) {
                    //if it was never started and was cancelled, then no need to clean up
                }
                //if it was terminal, then other cleanup handled it
            }
        }).subscribeOn(threadPool.getScheduler(new Func0<Boolean>() {
            @Override
            public Boolean call() {
                return properties.executionIsolationThreadInterruptOnTimeout().get() && _cmd.isCommandTimedOut.get() == TimedOutStatus.TIMED_OUT;
            }
        }));
    } else {
        return Observable.defer(new Func0<Observable<R>>() {
            @Override
            public Observable<R> call() {
                executionResult = executionResult.setExecutionOccurred();
                if (!commandState.compareAndSet(CommandState.OBSERVABLE_CHAIN_CREATED, CommandState.USER_CODE_EXECUTED)) {
                    return Observable.error(new IllegalStateException("execution attempted while in state : " + commandState.get().name()));
                }

                metrics.markCommandStart(commandKey, threadPoolKey, ExecutionIsolationStrategy.SEMAPHORE);
                // semaphore isolated
                // store the command that is being run
                endCurrentThreadExecutingCommand = Hystrix.startCurrentThreadExecutingCommand(getCommandKey());
                try {
                    executionHook.onRunStart(_cmd);
                    executionHook.onExecutionStart(_cmd);
                    return getUserExecutionObservable(_cmd);  //the getUserExecutionObservable method already wraps sync exceptions, so this shouldn't throw
                } catch (Throwable ex) {
                    //If the above hooks throw, then use that as the result of the run method
                    return Observable.error(ex);
                }
            }
        });
    }
}
```

## getUserExecutionObservable

看到这里后，run方法就已经执行了，但是回过头想一下，这个Hystrix是基于队列和线程池去执行的，那怎么没看见跟线程池有关的代码呢在哪呢，前面一个又一个的Observable，互相触发。



```java
// AbstractCommand.java
private Observable<R> getUserExecutionObservable(final AbstractCommand<R> _cmd) {
    Observable<R> userObservable;

    try {
        // 这行代码里的Func0.call()会执行HystrixCommand的run方法
        userObservable = getExecutionObservable();
    } catch (Throwable ex) {
        // the run() method is a user provided implementation so can throw instead of using Observable.onError
        // so we catch it here and turn it into Observable.error
        userObservable = Observable.error(ex);
    }

    return userObservable
            .lift(new ExecutionHookApplication(_cmd))
            .lift(new DeprecatedOnRunHookApplication(_cmd));
}

// HystrixCommand.java
@Override
final protected Observable<R> getExecutionObservable() {
    return Observable.defer(new Func0<Observable<R>>() {
        @Override
        public Observable<R> call() {
            try {
                // 这里就是执行HystrixCommand的run方法了
                return Observable.just(run());
            } catch (Throwable ex) {
                return Observable.error(ex);
            }
        }
    }).doOnSubscribe(new Action0() {
        @Override
        public void call() {
            // Save thread on which we get subscribed so that we can interrupt it later if needed
            executionThread.set(Thread.currentThread());
        }
    });
}
```

那从代码执行的层面没有找到，我们去找一下，threadPool这个变量，是在什么时候被使用的

```java
protected final HystrixThreadPool threadPool;
```

# 线程池隔离

在AbstractCommand的构造方法中，就有一行初始化线程池的代码initThreadPool，这就会根据threadPoolKey去创建对应的线程池，线程池的相关参数来自于HystrixThreadPoolProperties.Setter，维护了一个map，key就是threadPoolKey，一个key就对应了一个线程池。

可配置的属性：

```properties
hystrix.threadpool.ServiceA.allowMaximumSizeToDivergeFromCoreSize = false
hystrix.threadpool.ServiceA.keepAliveTimeMinutes = 1
hystrix.threadpool.ServiceA.maximumSize = 10
hystrix.threadpool.ServiceA.coreSize = 10
hystrix.threadpool.ServiceA.maxQueueSize = -1
hystrix.threadpool.ServiceA.queueSizeRejectionThreshold = 5
hystrix.threadpool.ServiceA.metrics.rollingStats.numBuckets = 10
hystrix.threadpool.ServiceA.metrics.rollingStats.timeInMilliseconds = 10000
```

```java
// AbstractCommand.java
private static HystrixThreadPool initThreadPool(HystrixThreadPool fromConstructor, HystrixThreadPoolKey threadPoolKey, HystrixThreadPoolProperties.Setter threadPoolPropertiesDefaults) {
    if (fromConstructor == null) {
        // get the default implementation of HystrixThreadPool
        return HystrixThreadPool.Factory.getInstance(threadPoolKey, threadPoolPropertiesDefaults);
    } else {
        return fromConstructor;
    }
}

// HystrixThreadPool.java
// 维护了一个map，key就是threadPoolKey，一个key就对应了一个线程池
/* package */static HystrixThreadPool getInstance(HystrixThreadPoolKey threadPoolKey, HystrixThreadPoolProperties.Setter propertiesBuilder) {
    // get the key to use instead of using the object itself so that if people forget to implement equals/hashcode things will still work
    String key = threadPoolKey.name();

    // this should find it for all but the first time
    HystrixThreadPool previouslyCached = threadPools.get(key);
    if (previouslyCached != null) {
        return previouslyCached;
    }

    // if we get here this is the first time so we need to initialize
    synchronized (HystrixThreadPool.class) {
        if (!threadPools.containsKey(key)) {
            // 创建线程池
            threadPools.put(key, new HystrixThreadPoolDefault(threadPoolKey, propertiesBuilder));
        }
    }
    return threadPools.get(key);
}
```



```java
public HystrixThreadPoolDefault(HystrixThreadPoolKey threadPoolKey, HystrixThreadPoolProperties.Setter propertiesDefaults) {
    this.properties = HystrixPropertiesFactory.getThreadPoolProperties(threadPoolKey, propertiesDefaults);
    HystrixConcurrencyStrategy concurrencyStrategy = HystrixPlugins.getInstance().getConcurrencyStrategy();
   
    this.queueSize = properties.maxQueueSize().get();
		// 用这个线程池
    this.metrics = HystrixThreadPoolMetrics.getInstance(threadPoolKey,
            concurrencyStrategy.getThreadPool(threadPoolKey, properties),
            properties);
    
    this.threadPool = this.metrics.getThreadPool();
    this.queue = this.threadPool.getQueue();

    /* strategy: HystrixMetricsPublisherThreadPool */
    HystrixMetricsPublisherFactory.createOrRetrievePublisherForThreadPool(threadPoolKey, this.metrics, this.properties);
}
```

## 线程池初始化的参数，线程池大小的设置

仔细看一下线程池构造的代码：

1. 构建了一个 ThreadFactory，这个就是为了给线程起名字，Hystrix开头的名字
2. hystrix.threadpool.ServiceA.maxQueueSize = -1，直接返回SynchronousQueue，这是一个同步队列，也就是收到请求后直接创建线程，不会去排队，如果满了就reject了。否则就会返回LinkedBlockingQueue,优先用core-size的线程数量去处理，如果满了就去queue排队，如果queue也满了，就会增加core-size到maximumSize，还不够就reject掉了。
3. 默认配置：线程池：10，不可动态增加线程（hystrix.threadpool.ServiceA.maximumSize无效），queue：SynchronousQueue，不支持排队。

```java
public ThreadPoolExecutor getThreadPool(final HystrixThreadPoolKey threadPoolKey, HystrixThreadPoolProperties threadPoolProperties) {
    // ThreadFactory这个就是为了给线程起名字，Hystrix开头的名字
    final ThreadFactory threadFactory = getThreadFactory(threadPoolKey);

    final boolean allowMaximumSizeToDivergeFromCoreSize = threadPoolProperties.getAllowMaximumSizeToDivergeFromCoreSize().get();
    final int dynamicCoreSize = threadPoolProperties.coreSize().get();
    final int keepAliveTime = threadPoolProperties.keepAliveTimeMinutes().get();
    final int maxQueueSize = threadPoolProperties.maxQueueSize().get();
    final BlockingQueue<Runnable> workQueue = getBlockingQueue(maxQueueSize);
	  // 默认是false
    if (allowMaximumSizeToDivergeFromCoreSize) {
        final int dynamicMaximumSize = threadPoolProperties.maximumSize().get();
        if (dynamicCoreSize > dynamicMaximumSize) {
            logger.error("Hystrix ThreadPool configuration at startup for : " + threadPoolKey.name() + " is trying to set coreSize = " +
                    dynamicCoreSize + " and maximumSize = " + dynamicMaximumSize + ".  Maximum size will be set to " +
                    dynamicCoreSize + ", the coreSize value, since it must be equal to or greater than the coreSize value");
            return new ThreadPoolExecutor(dynamicCoreSize, dynamicCoreSize, keepAliveTime, TimeUnit.MINUTES, workQueue, threadFactory);
        } else {
            return new ThreadPoolExecutor(dynamicCoreSize, dynamicMaximumSize, keepAliveTime, TimeUnit.MINUTES, workQueue, threadFactory);
        }
    } else {
        return new ThreadPoolExecutor(dynamicCoreSize, dynamicCoreSize, keepAliveTime, TimeUnit.MINUTES, workQueue, threadFactory);
    }
}

// 得到线程池队列
public BlockingQueue<Runnable> getBlockingQueue(int maxQueueSize) {
    /*
     * We are using SynchronousQueue if maxQueueSize <= 0 (meaning a queue is not wanted).
     * <p>
     * SynchronousQueue will do a handoff from calling thread to worker thread and not allow queuing which is what we want.
     * <p>
     * Queuing results in added latency and would only occur when the thread-pool is full at which point there are latency issues
     * and rejecting is the preferred solution.
     */
    // hystrix.threadpool.ServiceA.maxQueueSize = -1，直接返回SynchronousQueue，这是一个同步队列，也就是收到请求后直接创建线程，不会去排队
    if (maxQueueSize <= 0) {
        return new SynchronousQueue<Runnable>();
    } else {
    // 就会返回LinkedBlockingQueue,优先用core-size的线程数量去处理，如果满了就去排队，如果排队的也满了，就会增加core-size到maximumSize，还不够就拒绝掉了
        return new LinkedBlockingQueue<Runnable>(maxQueueSize);
    }
}
```

## HystrixThreadPool.getScheduler

线程池初始化后，回到之前[executeCommandWithSpecifiedIsolation](#executeCommandWithSpecifiedIsolation)的代码里，他的subscribeOn方法，在订阅Observable的时候，调用了HystrixThreadPool.getScheduler。

```java
// AbstractCommand.java
.subscribeOn(threadPool.getScheduler(new Func0<Boolean>() {
    @Override
    public Boolean call() {
        return properties.executionIsolationThreadInterruptOnTimeout().get() && _cmd.isCommandTimedOut.get() == TimedOutStatus.TIMED_OUT;
    }
}));
```

这就搞了个

```java
// HystrixThreadPool.java
@Override
public Scheduler getScheduler(Func0<Boolean> shouldInterruptThread) {
    // 如果设置了允许动态调整线程池大家，就修改配置
    touchConfig();
    return new HystrixContextScheduler(HystrixPlugins.getInstance().getConcurrencyStrategy(), this, shouldInterruptThread);
}
```

下面就到了内部类HystrixContextSchedulerWorker里，看他的schedule方法

## 线程池执行，以及判断线程池是否满了

假设core-size=10，queueSizeRejectionThreshold=5

首先会将任务不断的给线程池，让线程池来处理，如果10个线程都满了，此时就会进入队列来排队。如果此时队列排队的请求是3个，那么3<5，还可以继续发送请求，进行排队。当队列数量达到5个以后，也会抛出RejectedExecutionException异常。

1. 如果queueSize小于0，则表示没有队列
2. 如果当前队列小于queueSizeRejectionThreshold，表示还有空间

```java
@Override
public Subscription schedule(Action0 action, long delayTime, TimeUnit unit) {
    if (threadPool != null) {
        // 判断队列是否还有空间，没有就拒绝了
        if (!threadPool.isQueueSpaceAvailable()) {
            throw new RejectedExecutionException("Rejected command because thread-pool queueSize is at rejection threshold.");
        }
    }
    // HystrixContexSchedulerAction包含了回调HystrxCommand.run方法的逻辑
    return worker.schedule(new HystrixContexSchedulerAction(concurrencyStrategy, action), delayTime, unit);
}


@Override
public boolean isQueueSpaceAvailable() {
    if (queueSize <= 0) {
        // we don't have a queue so we won't look for space but instead
        // let the thread-pool reject or not
        return true;
    } else {
        return threadPool.getQueue().size() < properties.queueSizeRejectionThreshold().get();
    }
}
```

HystrixContexSchedulerAction包含了回调HystrxCommand.run方法的逻辑

最后在`ThreadPoolWorker`中，找到了提交到线程的代码逻辑，Action0就是HystrixContexSchedulerAction。

```java
@Override
public Subscription schedule(final Action0 action) {
    if (subscription.isUnsubscribed()) {
        // don't schedule, we are unsubscribed
        return Subscriptions.unsubscribed();
    }

    // This is internal RxJava API but it is too useful.
    ScheduledAction sa = new ScheduledAction(action);

    subscription.add(sa);
    sa.addParent(subscription);

    ThreadPoolExecutor executor = (ThreadPoolExecutor) threadPool.getExecutor();
    FutureTask<?> f = (FutureTask<?>) executor.submit(sa);
    sa.add(new FutureCompleterWithConfigurableInterrupt(f, shouldInterruptThread, executor));

    return sa;
}
```

到此，Hystrix基于线程池的基本执行逻辑一句分析完成，画个图总结一下

![Hystrix执行原理图](/img/spring-cloud/Hystrix执行原理图.jpg)

# 超时监测

Hystrix超时计算的代码在HystrixObservableTimeoutOperator里，里面就有一个用于计算超时的监听器，如果在命令超时了，命令的状态还是NOT_EXECUTED，就将状态设置成TIMED_OUT，并抛出一个HystrixTimeoutException异常

```java
TimerListener listener = new TimerListener() {

    @Override
    public void tick() {
        // if we can go from NOT_EXECUTED to TIMED_OUT then we do the timeout codepath
        // otherwise it means we lost a race and the run() execution completed or did not start		
        if (originalCommand.isCommandTimedOut.compareAndSet(TimedOutStatus.NOT_EXECUTED, TimedOutStatus.TIMED_OUT)) {
            // report timeout failure
            originalCommand.eventNotifier.markEvent(HystrixEventType.TIMEOUT, originalCommand.commandKey);

            // shut down the original request
            s.unsubscribe();

            final HystrixContextRunnable timeoutRunnable = new HystrixContextRunnable(originalCommand.concurrencyStrategy, hystrixRequestContext, new Runnable() {

                @Override
                public void run() {
                    child.onError(new HystrixTimeoutException());
                }
            });


            timeoutRunnable.run();
            //if it did not start, then we need to mark a command start for concurrency metrics, and then issue the timeout
        }
    }

    @Override
    public int getIntervalTimeInMilliseconds() {
        return originalCommand.properties.executionTimeoutInMilliseconds().get();
    }
};
// 将这个监听器放到了HystrixTimer里，在这里判断超时的时候回调
final Reference<TimerListener> tl = HystrixTimer.getInstance().addTimerListener(listener);
// 放回到Command中
originalCommand.timeoutTimer.set(tl);
```

创建线程，并按照时间执行

```java
public Reference<TimerListener> addTimerListener(final TimerListener listener) {
    // 初始化了HystrixTimer线程池，大小是4
    startThreadIfNeeded();
    // add the listener

    Runnable r = new Runnable() {

        @Override
        public void run() {
            try {
                listener.tick();
            } catch (Exception e) {
                logger.error("Failed while ticking TimerListener", e);
            }
        }
    };
		// 利用前面初始化的线程池，每隔1秒钟执行一次r（也就是TimerListener)，这个时间就是Command设置的超时是时间
    ScheduledFuture<?> f = executor.get().getThreadPool().scheduleAtFixedRate(r, listener.getIntervalTimeInMilliseconds(), listener.getIntervalTimeInMilliseconds(), TimeUnit.MILLISECONDS);
    return new TimerReference(listener, f);
}
```

在命令执行完成以后，HystrixCommand的isCommandTimedOut的状态就会变成COMPLETED，所以在定时调度的时候不会进入判断条件。同时在任务处理完成也会清理掉定时任务。

```java
private boolean isNotTimedOut() {
    // if already marked COMPLETED (by onNext) or succeeds in setting to COMPLETED
    return originalCommand.isCommandTimedOut.get() == TimedOutStatus.COMPLETED ||
            originalCommand.isCommandTimedOut.compareAndSet(TimedOutStatus.NOT_EXECUTED, TimedOutStatus.COMPLETED);
}
```

```java
private void handleCommandEnd(boolean commandExecutionStarted) {
    Reference<TimerListener> tl = timeoutTimer.get();
    if (tl != null) {
        tl.clear();
    }
```

![Hystrix超时原理](/img/spring-cloud/Hystrix超时原理.jpg)

然后超时的降级，下面的文章再看。

# 异常

超时、命令执行过程中，线程满了，都会抛出异常，那Hystrix在这种情况下都会执行降级逻辑，我们去找一下处理这些异常，然后执行降级逻辑的代码在哪里。其实就在[executeCommandAndObserve](#executeCommandAndObserve)方法中的`handleFallback`

在这里就发现，所有的异常都是handleFallback处理的，其实就是拒绝、超时、失败，都会执行降级逻辑

```java
// AbstractCommand.java
final Func1<Throwable, Observable<R>> handleFallback = new Func1<Throwable, Observable<R>>() {
    @Override
    public Observable<R> call(Throwable t) {
        circuitBreaker.markNonSuccess();
        Exception e = getExceptionFromThrowable(t);
        executionResult = executionResult.setExecutionException(e);
        // 拒绝
        if (e instanceof RejectedExecutionException) {
            return handleThreadPoolRejectionViaFallback(e);
          // 超时
        } else if (t instanceof HystrixTimeoutException) {
            return handleTimeoutViaFallback();
          // 失败
        } else if (t instanceof HystrixBadRequestException) {
            return handleBadRequestByEmittingError(e);
        } else {
            /*
             * Treat HystrixBadRequestException from ExecutionHook like a plain HystrixBadRequestException.
             */
            if (e instanceof HystrixBadRequestException) {
                eventNotifier.markEvent(HystrixEventType.BAD_REQUEST, commandKey);
                return Observable.error(e);
            }

            return handleFailureViaFallback(e);
        }
    }
};
```

# 降级

这些就是fallback的处理，最终会调用getFallbackOrThrowException，然后执行用户定义的fallback方法

handleSemaphoreRejectionViaFallback
handleShortCircuitViaFallback
handleThreadPoolRejectionViaFallback
handleTimeoutViaFallback
handleFailureViaFallback

# 熔断

在多次异常降级后，熔断器就会打开了，接着就分析一下熔断器是如何打开的

先去看初始化的代码，在HystrixCommand构造方法中，会初始化熔断器

1. 一个Command Key就对应了一个熔断器
2. 在初始化HystrixCircuitBreakerImpl的时候，会监听拒绝、异常、超时等数据，从统计信息metrics里拿的数据
3. 在最近的一个时间窗口以内（10s），totalRequests（总请求数量）小于circuitBreakerRequestVolumeThreshold（默认是20），那就什么都不干
4. 反之，如果totalRequests（总请求数量）>= circuitBreakerRequestVolumeThreshold（默认是20），就会进入下一步的尝试
5. 如果最近一个时间窗口（默认是10s）内的异常请求次数所占的比例（25次请求，5次，20%） < circuitBreakerErrorThresholdPercentage（默认是50%）什么都不干
6. 反之，如果最近一个时间窗口（默认是10s）内的异常请求次数所占的比例（25次请求，20次，80%） >= circuitBreakerErrorThresholdPercentage（默认是50%），此时就会打开熔断开关



```java
private static HystrixCircuitBreaker initCircuitBreaker(boolean enabled, HystrixCircuitBreaker fromConstructor,
                                                        HystrixCommandGroupKey groupKey, HystrixCommandKey commandKey,
                                                        HystrixCommandProperties properties, HystrixCommandMetrics metrics) {
    if (enabled) {
        if (fromConstructor == null) {
            // get the default implementation of HystrixCircuitBreaker
            // 拿的是HystrixCircuitBreakerImpl
            return HystrixCircuitBreaker.Factory.getInstance(commandKey, groupKey, properties, metrics);
        } else {
            return fromConstructor;
        }
    } else {
        return new NoOpCircuitBreaker();
    }
}

// HystrixCircuitBreakerImpl
protected HystrixCircuitBreakerImpl(HystrixCommandKey key, HystrixCommandGroupKey commandGroup, final HystrixCommandProperties properties, HystrixCommandMetrics metrics) {
    this.properties = properties;
    this.metrics = metrics;

    //On a timer, this will set the circuit between OPEN/CLOSED as command executions occur
    // 会监听拒绝、异常、超时等数据，从统计信息metrics里拿的数据
    Subscription s = subscribeToStream();
    activeSubscription.set(s);
}

private Subscription subscribeToStream() {
    /*
     * This stream will recalculate the OPEN/CLOSED status on every onNext from the health stream
     */
    return metrics.getHealthCountsStream()
            .observe()
            .subscribe(new Subscriber<HealthCounts>() {
                @Override
                public void onCompleted() {

                }

                @Override
                public void onError(Throwable e) {

                }

                // 最近10秒钟的统计信息
                @Override
                public void onNext(HealthCounts hc) {
                    // 在最近的一个时间窗口以内（10秒），totalRequests（总请求数量）小于circuitBreakerRequestVolumeThreshold（默认是20），那就什么都不干
                    // check if we are past the statisticalWindowVolumeThreshold
                    if (hc.getTotalRequests() < properties.circuitBreakerRequestVolumeThreshold().get()) {
                        // we are not past the minimum volume threshold for the stat window,
                        // so no change to circuit status.
                        // if it was CLOSED, it stays CLOSED
                        // if it was half-open, we need to wait for a successful command execution
                        // if it was open, we need to wait for sleep window to elapse
                    } else {
                        // 进入下一步的尝试
                        // 如果最近一个时间窗口（默认是10s）内的异常请求次数所占的比例（25次请求，5次，20%） < circuitBreakerErrorThresholdPercentage（默认是50%）什么都不干
                        if (hc.getErrorPercentage() < properties.circuitBreakerErrorThresholdPercentage().get()) {
                            //we are not past the minimum error threshold for the stat window,
                            // so no change to circuit status.
                            // if it was CLOSED, it stays CLOSED
                            // if it was half-open, we need to wait for a successful command execution
                            // if it was open, we need to wait for sleep window to elapse
                        } else 
                            // 反之，如果最近一个时间窗口（默认是10s）内的异常请求次数所占的比例（25次请求，20次，80%） >= circuitBreakerErrorThresholdPercentage（默认是50%），此时就会打开熔断开关
                            // our failure rate is too high, we need to set the state to OPEN
                            if (status.compareAndSet(Status.CLOSED, Status.OPEN)) {
                                circuitOpened.set(System.currentTimeMillis());
                            }
                        }
                    }
                }
            });
}
```





## 熔断器打开后，请求直接降级

就是在在[applyHystrixSemantics](#applyHystrixSemantics)这里的代码，就会先判断人熔断器的状态，如果熔断器打开了，就直接走降级逻辑了。

```java
@Override
public boolean attemptExecution() {
    if (properties.circuitBreakerForceOpen().get()) {
        return false;
    }
    if (properties.circuitBreakerForceClosed().get()) {
        return true;
    }
    // -1 就是可以执行请求，断路器没有打开
    if (circuitOpened.get() == -1) {
        return true;
    } else {
        if (isAfterSleepWindow()) {
            // 状态搞为半打开，让一个请求执行试一下
            // 如果失败了，那么还是OPEN，handleFallback -> circuitBreaker.markNonSuccess();同时会更新熔断的时间戳
            // 如果请求成功，markEmits/markOnCompleted,circuitBreaker.markSuccess(),关闭熔断器。会变成CLOSED
            if (status.compareAndSet(Status.OPEN, Status.HALF_OPEN)) {
                //only the first request after sleep window should execute
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
}
// 过了一个circuitBreakerSleepWindowInMilliseconds时间以后，这个时间默认是5秒
private boolean isAfterSleepWindow() {
    final long circuitOpenTime = circuitOpened.get();
    final long currentTime = System.currentTimeMillis();
    final long sleepWindowTime = properties.circuitBreakerSleepWindowInMilliseconds().get();
    return currentTime > circuitOpenTime + sleepWindowTime;
}

@Override
public void markSuccess() {
    if (status.compareAndSet(Status.HALF_OPEN, Status.CLOSED)) {
        //This thread wins the race to close the circuit - it resets the stream to start it over from 0
        metrics.resetStream();
        Subscription previousSubscription = activeSubscription.get();
        if (previousSubscription != null) {
            previousSubscription.unsubscribe();
        }
        Subscription newSubscription = subscribeToStream();
        activeSubscription.set(newSubscription);
        circuitOpened.set(-1L);
    }
}

@Override
public void markNonSuccess() {
    if (status.compareAndSet(Status.HALF_OPEN, Status.OPEN)) {
        //This thread wins the race to re-open the circuit - it resets the start time for the sleep window
        circuitOpened.set(System.currentTimeMillis());
    }
}
```

## 画图总结

![Hystrix熔断器的中断原理](/img/spring-cloud/Hystrix熔断器的中断原理-9119853.jpg)

# 请求缓存

[toObservable](#toObservable) 方法里包含了请求缓存的源码

```java
/* try from cache first */
if (requestCacheEnabled) {
    HystrixCommandResponseFromCache<R> fromCache = (HystrixCommandResponseFromCache<R>) requestCache.get(cacheKey);
    if (fromCache != null) {
        isResponseFromCache = true;
        return handleRequestCacheHitAndEmitValues(fromCache, _cmd);
    }
}
```

