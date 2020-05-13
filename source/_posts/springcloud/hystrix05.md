---
title: Feign和Hystrix的结合使用
tags: [spring-cloud,hystrix]
date: 2020-04-19 18:03:59
categories: spring-cloud
typora-root-url: ../../../source
---

# Feign和Hystrix结合使用

在@FeignClient中增加fallback配置，指定降级方法的执行

```java
@FeignClient(name = "user",url = "${user.url}",fallback = UserFeignFallback.class
        /*fallbackFactory = UserFeignFactory.class*/)
public interface UserFeign {

    @PostMapping
    void save(User user);

    @GetMapping("/{id}")
    User getUserByID(@PathVariable("id") String id);

    @GetMapping
    List<User> findAll();
}
```

<!--more-->

降级方法的编写

```java
@Component
public class UserFeignFallback implements UserFeign {

    @Override
    public void save(User user) {

    }

    @Override
    public User getUserByID(String id) {
        User user = new User();
        user.setId("100");
        user.setName("fallback 回调用户");
        return user;
    }

    @Override
    public List<User> findAll() {
        return null;
    }
}
```



## Feign和Hystrix整合的配置



超时时间设置

```yaml
feign:
  hystrix:
    enabled: true
hystrix:
  command:
    default:
      execution:
        isolation:
          thread:
            timeoutInMilliseconds: 20000
    user:
      execution:
        isolation:
          thread:
            timeoutInMilliseconds: 20000
```

如果要特定某个服务的配置，就不写default，这个user是FeignClient的服务名，对应一个HystrixGroup，具体的key就是方法名。

那么如果想针对服务的某一个方法配置怎么办？

```yaml
hystrix:
  command:
    ServiceA#sayHello(Long,String):
      execution:
        isolation:
          thread:
            timeoutInMilliseconds: 20000
```



## 线程池配置

hystrix.threadpool.default.coreSize：线程池大小，默认10

hystrix.threadpool.default.maximumSize：线程池最大大小，默认10

hystrix.threadpool.default.allowMaximumSizeToDivergeFromCoreSize：是否允许动态调整线程数量，默认false，只有设置为true了，上面的maximumSize才有效

hystrix.threadpool.default.keepAliveTimeMinutes ：默认是1，超出coreSize的线程，空闲1分钟后释放掉

hystrix.threadpool.default.maxQueueSize 默认－1，不能动态修改

hystrix.threadpool.default.queueSizeRejectionThreshold 可以动态修改，默认是5，先进入请求队列，然后再由线程池执行

### 如何计算线程池数量？

####  高峰期每秒的请求数量 / 1000毫秒 / TP99请求延时 + buffer空间

比如说处理一个请求，要50ms，那么TP99，也就是99%的请求里处理一个请求耗时最长是50ms。

我们给一点缓冲空间10ms，那就是处理请求接口耗时60ms。

 所以一秒钟一个线程可以处理：1000 / 60 = 16，一个线程一秒钟可以处理16个请求。

 假设高峰期，每秒最多1200个请求，一个线程每秒可以处理16个请求，需要多少个线程才能处理每秒1200个请求呢？1200 / 16 = 75，最多需要75个线程，每个线程每秒处理16个请求，75个线程每秒才可以处理1200个请求。

最多需要多少个线程数量，就是这样子算出来



#### 如果是服务B -> 服务A的话，服务B线程数量怎么设置

服务B调用服务A的线程池需要多少个线程呢？

高峰期，服务B最多要调用服务A每秒钟1200次，服务A处理一个请求是60ms，服务B每次调用服务A的时候，用一个线程发起一次请求，那么这个服务B的这个线程，要60ms才能返回。

服务B而言，一个线程对服务A发起一次请求需要60ms，一个线程每秒钟可以请求服务A达到16次，但是现在服务B每秒钟需要请求服务A达到1200次，那么服务B就需要75个线程，在高峰期并发请求服务A，才可以完成每秒1200次的调用。

服务B，部署多台机器，每台机器调用服务A的线程池有10个线程，比如说搞个10个线程，一共部署10台机器，那么服务B调用服务A的线程数量，一共有100个线程，轻轻松松可以支撑高峰期调用服务A的1200次的场景

每个线程调用服务A一次，耗时60ms，每个线程每秒可以调用服务A一共是16次，100个线程，每秒最多可以调用服务A是1600次，高峰的时候只要支持调用服务A的1200次就可以了，所以这个机器部署就绰绰有余了

## 执行配置

hystrix.command.default.execution.isolation.strategy：隔离策略，默认Thread，可以选择Semaphore信号量 

hystrix.command.default.execution.isolation.thread.timeoutInMilliseconds：超时时间，默认1000ms

hystrix.command.default.execution.timeout.enabled：是否启用超时，默认ture

hystrix.command.default.execution.isolation.thread.interruptOnTimeout：超时的时候是否中断执行，默认true  

hystrix.command.default.execution.isolation.semaphore.maxConcurrentRequests：信号量隔离策略下，允许的最大并发请求数量，默认10

## 降级配置

hystrix.command.default.fallback.enabled 默认true

## 熔断配置

hystrix.command.default.circuitBreaker.enabled：是否启用熔断器默认true

hystrix.command.default.circuitBreaker.requestVolumeThreshold：10秒钟内，请求数量达到多少才能去尝试触发熔断，默认20

hystrix.command.default.circuitBreaker.errorThresholdPercentage：10秒钟内，请求数量达到20，同时异常比例达到50%，就会触发熔断，默认50

hystrix.command.default.circuitBreaker.sleepWindowInMilliseconds：触发熔断之后，5s内直接拒绝请求，走降级逻辑，5s后尝试half-open放过少量流量试着恢复，默认5000

hystrix.command.default.circuitBreaker.forceOpen：强制打开熔断器

hystrix.command.default.circuitBreaker.forceClosed：强制关闭熔断器

## 监控配置

hystrix.threadpool.default.metrics.rollingStats.timeInMillisecond：线程池统计指标的时间，默认10000，就是10s

hystrix.threadpool.default.metrics.rollingStats.numBuckets：将rolling window划分为n个buckets，默认10

hystrix.command.default.metrics.rollingStats.timeInMilliseconds：command的统计时间，熔断器是否打开会根据1个rolling window的统计来计算。若rolling window被设为10000毫秒，则rolling window会被分成n个buckets，每个bucket包含success，failure，timeout，rejection的次数的统计信息。默认10000

hystrix.command.default.metrics.rollingStats.numBuckets 设置一个rolling window被划分的数量，若numBuckets＝10，rolling window＝10000，那么一个bucket的时间即1秒。必须符合rolling window % numberBuckets == 0。默认10

hystrix.command.default.metrics.rollingPercentile.enabled 执行时是否enable指标的计算和跟踪，默认true

hystrix.command.default.metrics.rollingPercentile.timeInMilliseconds 设置rolling percentile window的时间，默认60000

hystrix.command.default.metrics.rollingPercentile.numBuckets 设置rolling percentile window的numberBuckets。逻辑同上。默认6

hystrix.command.default.metrics.rollingPercentile.bucketSize 如果bucket size＝100，window＝10s，若这10s里有500次执行，只有最后100次执行会被统计到bucket里去。增加该值会增加内存开销以及排序的开销。默认100

hystrix.command.default.metrics.healthSnapshot.intervalInMilliseconds 记录health 快照（用来统计成功和错误绿）的间隔，默认500ms

## 高阶特性配置 

hystrix.command.default.requestCache.enabled 默true 

hystrix.command.default.requestLog.enabled 记录日志到HystrixRequestLog，默认true 

hystrix.collapser.default.maxRequestsInBatch 单次批处理的最大请求数，达到该数量触发批处理，默认Integer.MAX_VALUE

hystrix.collapser.default.timerDelayInMilliseconds 触发批处理的延迟，也可以为创建批处理的时间＋该值，默认10

hystrix.collapser.default.requestCache.enabled 是否对HystrixCollapser.execute() and HystrixCollapser.queue()的cache，默认true

# Feign和Hystrix结合的原理

Feign在和Hystrix整合的时候，feign动态代理里面有一些Hystrix相关的代码，请求走feign动态代理的时候，就会基于Hystrix Command发送请求，实现服务间调用的隔离、限流、超时、降级、熔断、统计等。



![Feign和Hystrix的核心原理](/img/spring-cloud/Feign和Hystrix的核心原理.jpg)



## Feign中基于Hystrix的动态代理

在Feign的动态代理代码中，HystrixTargeter默认情况下，在没有开启Hystrix的时候，会使用自带的Feign.Builder。在启用Hystrix走，就使用HystrixFeign.Builder。

**HystrixFeign.Builder是在这里创建的。**

```java
// FeignClientsConfiguration.java
@Configuration
@ConditionalOnClass({ HystrixCommand.class, HystrixFeign.class })
protected static class HystrixFeignConfiguration {
   @Bean
   @Scope("prototype")
   @ConditionalOnMissingBean
   @ConditionalOnProperty(name = "feign.hystrix.enabled", matchIfMissing = false)
   public Feign.Builder feignHystrixBuilder() {
      return HystrixFeign.builder();
   }
}
```

在HystrixTargeter中，用Hystrix构造动态代理的逻辑。

```java
// HystrixTargeter.java
@Override
public <T> T target(FeignClientFactoryBean factory, Feign.Builder feign, FeignContext context,
               Target.HardCodedTarget<T> target) {
   // 没有开启Hystrix的话，走这个逻辑
   if (!(feign instanceof feign.hystrix.HystrixFeign.Builder)) {
      return feign.target(target);
   }
   // 在有Hystrix的条件下，就开始往这下面走。
   feign.hystrix.HystrixFeign.Builder builder = (feign.hystrix.HystrixFeign.Builder) feign;
   // 用于读取yaml文件中的Hystrix相关的配置，在执行命令的时候会用到
   SetterFactory setterFactory = getOptional(factory.getName(), context,
      SetterFactory.class);
   if (setterFactory != null) {
      builder.setterFactory(setterFactory);
   }
   // 有降级的话，就用降级包装下
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



创建一个fallback的实例，从和服务相关联的Spring上下文里获取ServiceAClient的实例。

```java
// HystrixTargeter.java
private <T> T targetWithFallback(String feignClientName, FeignContext context,
                         Target.HardCodedTarget<T> target,
                         HystrixFeign.Builder builder, Class<?> fallback) {
   T fallbackInstance = getFromContext("fallback", feignClientName, context, fallback, target.type());
   return builder.target(target, fallbackInstance);
}
```

利用工厂创建一个实例，并校验是否是ServiceAClient接口的实例

```java
// HystrixTargeter.java
private <T> T targetWithFallbackFactory(String feignClientName, FeignContext context,
                              Target.HardCodedTarget<T> target,
                              HystrixFeign.Builder builder,
                              Class<?> fallbackFactoryClass) {
   FallbackFactory<? extends T> fallbackFactory = (FallbackFactory<? extends T>)
      getFromContext("fallbackFactory", feignClientName, context, fallbackFactoryClass, FallbackFactory.class);
   /* We take a sample fallback from the fallback factory to check if it returns a fallback
   that is compatible with the annotated feign interface. */
   // 创建一个对象出来看看，检测一下创建出来的对象是否符合要求
   Object exampleFallback = fallbackFactory.create(new RuntimeException());
   Assert.notNull(exampleFallback,
      String.format(
      "Incompatible fallbackFactory instance for feign client %s. Factory may not produce null!",
         feignClientName));
   if (!target.type().isAssignableFrom(exampleFallback.getClass())) {
      throw new IllegalStateException(
         String.format(
            "Incompatible fallbackFactory instance for feign client %s. Factory produces instances of '%s', but should produce instances of '%s'",
            feignClientName, exampleFallback.getClass(), target.type()));
   }
   return builder.target(target, fallbackFactory);
}
```

在确认fallbackFactory创建出来的对象没有问题后，调用HystrixFeign的target方法

```java
// HystrixFeign.java
public <T> T target(Target<T> target, T fallback) {
  return build(fallback != null ? new FallbackFactory.Default<T>(fallback) : null)
      .newInstance(target);
}
```

这里主要注意build方法，里面就包含了两局关键的代码，他重新设置了invocationHandlerFactory和contract

```java
// HystrixFeign.java
Feign build(final FallbackFactory<?> nullableFallbackFactory) {
  super.invocationHandlerFactory(new InvocationHandlerFactory() {
    @Override public InvocationHandler create(Target target,
        Map<Method, MethodHandler> dispatch) {
      // 关键代码 HystrixInvocationHandler，包含了基于HystrixCommand的封装，实际还是调用dispatch
      return new HystrixInvocationHandler(target, dispatch, setterFactory, nullableFallbackFactory);
    }
  });
  // 关键代码HystrixDelegatingContract，用于解析Hystrix相关的注解
  super.contract(new HystrixDelegatingContract(contract));
  return super.build();
}
```



![启用Hystrix之后feign生成动态代理的过程](/img/spring-cloud/启用Hystrix之后feign生成动态代理的过程.jpg)

再往后的代码就和Hystrix没有关系了，就在feign的动态代理那一套东西，下面继续看HystrixInvocationHandler封装的细节。

## Feign中HystrixCommand的执行细节

HystrixInvocationHandler，作为一个动态代理的接口，看下它的invoke方法，他构造了一个HystrixCommand，利用Hystrix包装了请求的执行，在HystrixCommand的run方法里，就包含了执行调用的代码（SynchronousMethodHandler）。如果执行请求的时候报错的话，就会调用getFallbac方法，就会执行之前配置的降级方法，执行降级的逻辑。

```java
// HystrixInvocationHandler.java
@Override
public Object invoke(final Object proxy, final Method method, final Object[] args)
    throws Throwable {
  // early exit if the invoked method is from java.lang.Object
  // code is the same as ReflectiveFeign.FeignInvocationHandler
  if ("equals".equals(method.getName())) {
    try {
      Object otherHandler =
          args.length > 0 && args[0] != null ? Proxy.getInvocationHandler(args[0]) : null;
      return equals(otherHandler);
    } catch (IllegalArgumentException e) {
      return false;
    }
  } else if ("hashCode".equals(method.getName())) {
    return hashCode();
  } else if ("toString".equals(method.getName())) {
    return toString();
  }
  // 构造一个HystrixCommand匿名内部类,每一个Method对象，都对应了一个HystrixCommand.Setter，也就是说每一个方法都对应了一个HystrixCommand的配置，例如超时时间等
  HystrixCommand<Object> hystrixCommand = new HystrixCommand<Object>(setterMethodMap.get(method)) {
   
    @Override
    protected Object run() throws Exception {
      try {
        // 调用SynchronousMethodHandler,也就是发起Http请求的代码
        return HystrixInvocationHandler.this.dispatch.get(method).invoke(args);
      } catch (Exception e) {
        throw e;
      } catch (Throwable t) {
        throw (Error) t;
      }
    }

    // 降级机制
    @Override
    protected Object getFallback() {
      // 如果降级方法不存在的话，父类会直接报错UnsupportedOperationException。
      if (fallbackFactory == null) {
        return super.getFallback();
      }
      try {
        // 创建fallback
        Object fallback = fallbackFactory.create(getExecutionException());
        // 调用之前定义的fallback方法
        Object result = fallbackMethodMap.get(method).invoke(fallback, args);
       
        if (isReturnsHystrixCommand(method)) {
          return ((HystrixCommand) result).execute();
        } else if (isReturnsObservable(method)) {
          // Create a cold Observable
          return ((Observable) result).toBlocking().first();
        } else if (isReturnsSingle(method)) {
          // Create a cold Observable as a Single
          return ((Single) result).toObservable().toBlocking().first();
        } else if (isReturnsCompletable(method)) {
          ((Completable) result).await();
          return null;
        } else {
          return result;
        }
      } catch (IllegalAccessException e) {
        // shouldn't happen as method is public due to being an interface
        throw new AssertionError(e);
      } catch (InvocationTargetException e) {
        // Exceptions on fallback are tossed by Hystrix
        throw new AssertionError(e.getCause());
      }
    }
  };
  
	// 检查Feign方法的返回类型，可以拿到Hystrix的相关的返回类型，比如HystrixCommand、Observable、Single、Completable。
  if (isReturnsHystrixCommand(method)) {
    return hystrixCommand;
  } else if (isReturnsObservable(method)) {
    // Create a cold Observable
    return hystrixCommand.toObservable();
  } else if (isReturnsSingle(method)) {
    // Create a cold Observable as a Single
    return hystrixCommand.toObservable().toSingle();
  } else if (isReturnsCompletable(method)) {
    return hystrixCommand.toObservable().toCompletable();
  }
  return hystrixCommand.execute();
}
```



在HystrixInvocationHandler构造的时候，构造了一个setterMethodMap，每一个Method对象，都对应了一个HystrixCommand.Setter，也就是说每一个方法都对应了一个HystrixCommand的key和groupkey的配置，例如超时时间等，线程池配置等，Setter被创建的时候，用的就是@FeignClient的name作为groupKey，也就是ServiceA，commandKey用于是类名+方法名（ServiceA#sayHello(Long,String)），这个groupKey就对应了一个线程池的配置。

```java
// SetterFactory.java
@Override
public HystrixCommand.Setter create(Target<?> target, Method method) {
  String groupKey = target.name();
  String commandKey = Feign.configKey(target.type(), method);
  return HystrixCommand.Setter
      .withGroupKey(HystrixCommandGroupKey.Factory.asKey(groupKey))
      .andCommandKey(HystrixCommandKey.Factory.asKey(commandKey));
}
```



1. 基于Method对象对应的setterMethodMap，构造一个HystrixCommand匿名内部类
2. 内部类实现了run方法和getFallback方法
3. run方法直接调用调用SynchronousMethodHandler发起http请求
4. 如果run方法执行异常，getFallback方法调用之前在FeignClient中定义的降级方法
5. 检查Feign方法的返回类型，可以拿到Hystrix的相关的返回类型，比如HystrixCommand、Observable、Single、Completable。



到这里已经看到调用了HystrixCommand的execute方法，所以接下来的内容，将会进入到Hystrix的源码中，下一篇文章细说。