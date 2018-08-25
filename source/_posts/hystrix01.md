---
title: Hystrix介绍和简单使用
date: 2018-03-11 12:05:39
tags: [spring-cloud,hystrix]
categories: hystrix
---

此为龙果学院课程学习笔记，记录以后翻看

# Hystrix是什么？

在分布式系统中，每个服务都可能会调用很多其他服务，被调用的那些服务就是依赖服务，有的时候某些依赖服务出现故障也是很正常的。

Hystrix可以让我们在分布式系统中对服务间的调用进行控制，加入一些调用延迟或者依赖故障的容错机制。

<!--more-->
Hystrix通过将依赖服务进行资源隔离，进而组织某个依赖服务出现故障的时候，这种故障在整个系统所有的依赖服务调用中进行蔓延，同时Hystrix还提供故障时的fallback降级机制

总而言之，Hystrix通过这些方法帮助我们提升分布式系统的可用性和稳定性。


![什么是分布式系统以及其中的故障和hystrix](/img/hystrix/什么是分布式系统以及其中的故障和hystrix.png)

# Hystrix的历史

hystrix就是一种高可用保障的一个框架，预先封装好的为了解决某个特定领域的特定问题的一套代码库。用了框架之后，来解决这个领域的特定的问题，就可以大大减少我们的工作量，提升我们的工作质量和工作效率。

Netflix（可以认为是国外的优酷或者爱奇艺之类的视频网站），API团队从2011年开始做一些提升系统可用性和稳定性的工作，Hystrix就是从那时候开始发展出来的。

在2012年的时候，Hystrix就变得比较成熟和稳定了，Netflix中，除了API团队以外，很多其他的团队都开始使用Hystrix。

时至今日，Netflix中每天都有数十亿次的服务间调用，通过Hystrix框架在进行，而Hystrix也帮助Netflix网站提升了整体的可用性和稳定性


# Hystrix的设计原则

hystrix为了实现高可用性的架构，它的设计原则:

1. 对依赖服务调用时出现的调用延迟和调用失败进行控制和容错保护
2. 在复杂的分布式系统中，阻止某一个依赖服务的故障在整个系统中蔓延，服务A->服务B->服务C，服务C故障了，服务B也故障了，服务A故障了，整套分布式系统全部故障，整体宕机
3. 提供fail-fast（快速失败）和快速恢复的支持
4. 提供fallback优雅降级的支持
5. 支持近实时的监控、报警以及运维操作


# Hystrix要解决的问题

在复杂的分布式系统架构中，每个服务都有很多的依赖服务，而每个依赖服务都可能会故障。如果服务没有和自己的依赖服务进行隔离，那么可能某一个依赖服务的故障就会拖垮当前这个服务。

举例来说，某个服务有30个依赖服务，每个依赖服务的可用性非常高，已经达到了99.99%的高可用性，那么该服务的可用性就是99.99%的30次方，也就是99.7%的可用性，99.7%的可用性就意味着0.3%的请求可能会失败，因为0.3%的时间内系统可能出现了故障导致系统不可用。对于1亿次访问来说，0.3%的请求失败，也就意味着30万次请求会失败，也意味着每个月有2个小时的时间系统是不可用的。

在真实生产环境中，可能更加糟糕，也就是说，即使你每个依赖服务都是99.99%高可用性，但是一旦你有几十个依赖服务，还是会导致你每个月都有几个小时是不可用的。

![依赖服务的故障导致服务被拖垮以及故障的蔓延](/img/hystrix/依赖服务的故障导致服务被拖垮以及故障的蔓延.png)

# Hystrix的更加细节的设计原则

1. 阻止任何一个依赖服务耗尽所有的资源，比如tomcat中的所有线程资源
2. 避免请求排队和积压，采用限流和fail fast来控制故障
3. 提供fallback降级机制来应对故障
4. 使用资源隔离技术，比如bulkhead（舱壁隔离技术），swimlane（泳道技术），circuit breaker（短路技术），来限制任何一个依赖服务的故障的影响
5. 通过近实时的统计/监控/报警功能，来提高故障发现的速度
6. 通过近实时的属性和配置热修改功能，来提高故障处理和恢复的速度
7. 保护依赖服务调用的所有故障情况，而不仅仅只是网络故障情况

# Hystrix的实现

1. 通过HystrixCommand或者HystrixObservableCommand来封装对外部依赖的访问请求，这个访问请求一般会运行在独立的线程中，资源隔离
2. 对于超出我们设定阈值的服务调用，直接进行超时，不允许其耗费过长时间阻塞住。这个超时时间默认是99.5%的访问时间，但是一般我们可以自己设置一下
3. 为每一个依赖服务维护一个独立的线程池，或者是semaphore，当线程池已满时，直接拒绝对这个服务的调用
4. 对依赖服务的调用的成功次数，失败次数，拒绝次数，超时次数，进行统计
5. 如果对一个依赖服务的调用失败次数超过了一定的阈值，自动进行熔断，在一定时间内对该服务的调用直接降级，一段时间后再自动尝试恢复
6. 当一个服务调用出现失败，被拒绝，超时，短路等异常情况时，自动调用fallback降级机制
7. 对属性和配置的修改提供近实时的支持


![资源隔离如何保护依赖服务的故障不要拖垮整个系统](/img/hystrix/资源隔离如何保护依赖服务的故障不要拖垮整个系统.png)


# Hystrix项目实战

## 背景

商品详情页服务和缓存服务，模拟缓存更新时如何使用hystrix。


**缓存服务**

https://github.com/sail-y/eshop-cache-ha

**商品服务**

https://github.com/sail-y/eshop-product-ha


## 商品服务接口导致缓存服务资源耗尽的问题

![商品服务接口导致缓存服务资源耗尽的问题](/img/hystrix/商品服务接口导致缓存服务资源耗尽的问题.png)


## 基于线程池的资源隔离

hystrix进行资源隔离，其实是提供了一个command抽象。把对某一个依赖服务的所有调用请求全部隔离在同一份资源池内，对这个依赖服务的所有调用请求，全部走这个资源池内的资源，不会去用其他的资源了，这个就叫做资源隔离。

hystrix最最基本的资源隔离的技术，**线程池隔离技术**。对某一个依赖服务，商品服务，所有的调用请求，全部隔离到一个线程池内，对商品服务的每次调用请求都封装在一个command里面。每个command（每次服务调用请求）都是使用线程池内的一个线程去执行的，所以哪怕是对这个依赖服务（商品服务）同时发起的调用量已经到了1000了，但是线程池内就10个线程，最多就只会用这10个线程去执行。

不会出现对商品服务的请求，因为接口调用延迟将tomcat内部所有的线程资源全部耗尽。目的是为了保护不要因为某一个依赖服务的故障，导致耗尽了缓存服务中的所有的线程资源去执行。

### HystrixCommand：是用来获取一条数据的


```java
public class GetProductInfoCommand extends HystrixCommand<ProductInfo> {

    private Long productId;

    public GetProductInfoCommand(Long productId) {
        super(HystrixCommandGroupKey.Factory.asKey("GetProductInfoCommandGroup"));
        this.productId = productId;
    }

    @Override
    protected ProductInfo run() {

        String url = "http://localhost:8082/getProductInfo?productId=" + productId;
        String response = HttpUtil.get(url);
        System.out.println(response);
        return JSON.parseObject(response, ProductInfo.class);
    }
}
```

test:

http://localhost:8081/getProductInfo?productId=1

### HystrixObservableCommand：是设计用来获取多条数据的


controller:

```java
@RequestMapping("/getProductInfos")
public String getProductInfos(String productIds) {
    HystrixObservableCommand<ProductInfo> getProductInfosCommand = new GetProductInfosCommand(productIds.split(","));
    Observable<ProductInfo> observable = getProductInfosCommand.observe();
    observable.subscribe(new Observer<ProductInfo>(){
        @Override
        public void onCompleted() {
            log.info("获取完了所有的商品数据");
        }

        @Override
        public void onError(Throwable throwable) {
            throwable.printStackTrace();
        }

        @Override
        public void onNext(ProductInfo productInfo) {
            log.info(productInfo.toString());
        }
    });

    return "success";
}
```

command:

```java
public class GetProductInfosCommand extends HystrixObservableCommand<ProductInfo> {
    private String[] productIds;

    public GetProductInfosCommand(String[] productIds) {
        super(HystrixCommandGroupKey.Factory.asKey("GetProductInfoCommandGroup"));
        this.productIds = productIds;
    }

    @Override
    protected Observable<ProductInfo> construct() {

        return Observable.<ProductInfo>create(observer -> {
            try {
                if (!observer.isUnsubscribed()) {
                    for (String productId : productIds) {
                        String url = "http://localhost:8082/getProductInfo?productId=" + productId;
                        String response = HttpUtil.get(url);
                        ProductInfo productInfo = JSON.parseObject(response, ProductInfo.class);
                        observer.onNext(productInfo);

                    }
                    observer.onCompleted();
                }
            } catch (Exception e) {
                observer.onError(e);
            }
        }).subscribeOn(Schedulers.io());
    }
}
```



test:

http://localhost:8081/getProductInfos?productId=1,2,3

### command的四种调用方式

同步：new CommandHelloWorld("World").execute()，new ObservableCommandHelloWorld("World").toBlocking().toFuture().get()


异步：new CommandHelloWorld("World").queue()，new ObservableCommandHelloWorld("World").toBlocking().toFuture()

立即执行： observe()：hot，已经执行过了

订阅： toObservable(): cold，还没执行过

## 基于信号量的资源隔离

![信号量的资源隔离与限流的说明](/img/hystrix/信号量的资源隔离与限流的说明.png)


信号量跟线程池两种资源隔离的技术的区别：

![线程池隔离和信号量隔离的原理以及区别](/img/hystrix/线程池隔离和信号量隔离的原理以及区别.png)



## 线程池隔离技术和信号量隔离技术，分别在什么样的场景下去使用?


线程池：适合99%场景，线程池一般处理对依赖服务的网络请求的调用和访问，timeout这种问题。

信号量：适合不是对外部依赖的访问，而是对内部的一些比较复杂的业务逻辑的访问，但是像这种访问系统内部的代码，其实不涉及任何的网络请求。那么只要做信号量的普通限流就可以了，因为不需要去捕获timeout类似的问题，如果算法+数据结构的效率不是太高，并发量突然太高，因为这里稍微耗时一些，导致很多线程卡在这里的话是不太好的。所以进行一个基本的资源隔离和访问，避免内部复杂的低效率的代码，导致大量的线程被hang住。


**采用信号量技术进行资源隔离与限流**

```java
super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ExampleGroup"))
        .andCommandPropertiesDefaults(HystrixCommandProperties.Setter()
               .withExecutionIsolationStrategy(ExecutionIsolationStrategy.SEMAPHORE)));
```


## 资源隔离策略配置

现在我们知道有线程池（THREAD）和信号量（SEMAPHORE）两种隔离方式。除了选择隔离方式，hystrix还支持对隔离策略进行一些细粒度的配置。


默认的策略就是线程池

线程池其实最大的好处就是对于网络访问请求，如果有超时的话，可以避免调用线程阻塞住

而使用信号量的场景，通常是针对超大并发量的场景下，每个服务实例每秒都几百的QPS，那么此时你用线程池的话，线程一般不会太多，可能撑不住那么高的并发，如果要撑住，可能要耗费大量的线程资源，那么就是用信号量，来进行限流保护

一般用信号量常见于那种基于纯内存的一些业务逻辑服务，而不涉及到任何网络访问请求

netflix有100+的command运行在40+的线程池中，只有少数command是不运行在线程池中的，就是从纯内存中获取一些元数据，或者是对多个command包装起来的facacde command，是用信号量限流的


```java
// to use thread isolation
HystrixCommandProperties.Setter()
   .withExecutionIsolationStrategy(ExecutionIsolationStrategy.THREAD)
// to use semaphore isolation
HystrixCommandProperties.Setter()
   .withExecutionIsolationStrategy(ExecutionIsolationStrategy.SEMAPHORE)
```



### command名称和command组

每个command都可以设置一个自己的名称，同时可以设置一个自己的组。


```java
private static final Setter cachedSetter = 
    Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ExampleGroup"))
        .andCommandKey(HystrixCommandKey.Factory.asKey("HelloWorld"));    

public CommandHelloWorld(String name) {
    super(cachedSetter);
    this.name = name;
}
```

command group，是一个非常重要的概念，默认情况下，因为就是通过command group来定义一个线程池的，而且还会通过command group来聚合一些监控和报警信息。同一个command group中的请求，都会进入同一个线程池中。


### command线程池

threadpool key代表了一个HystrixThreadPool，用来进行统一监控，统计，缓存。默认的threadpool key就是command group名称。每个command都会跟它的threadpool key对应的thread pool绑定在一起。如果不想直接用command group，也可以手动设置thread pool name。

```java
public CommandHelloWorld(String name) {
    super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ExampleGroup"))
            .andCommandKey(HystrixCommandKey.Factory.asKey("HelloWorld"))
            .andThreadPoolKey(HystrixThreadPoolKey.Factory.asKey("HelloWorldPool")));
    this.name = name;
}
```


command threadpool -> command group -> command key


* command key：代表了一类command，一般来说代表了底层的依赖服务的一个接口。
* command group：代表了某一个底层的依赖服务，一个依赖服务可能会暴露出来多个接口，每个接口就是一个command key。在逻辑上去组织起来一堆command key的调用，统计信息、成功次数、timeout超时次数、失败次数等等，可以看到某一个服务整体的一些访问情况。一般推荐是根据一个服务去划分出一个线程池，command key默认都是属于同一个线程池的。


比如以一个服务为粒度，估算出来这个服务每秒的所有接口加起来的整体QPS在100左右。调用目标服务的当前服务部署了10个服务实例，每个服务实例上给一个线程池，线程数量大概在10个左右，就可以满足对目标服务的整体的访问QPS大概在每秒100左右需求了。


还有一种场景，就是command group对应的服务的接口访问量差别很大。然后就希望做一些细粒度的资源隔离，针对同一个服务的不同接口，使用不同的线程池。

之前的模式是： command key -> command group

我们可以针对每个command单独设置threadpool key：command key -> 自己的threadpool key


这样从逻辑上来说多个command key是属于一个command group的，在做统计的时候会放在一起统计。但是每个command key有自己的线程池，每个接口有自己的线程池去做资源隔离和限流。


### 设置线程池大小

Hystrix默认的线程池大小是10，可以通过下面的代码进行设置。

```java
HystrixThreadPoolProperties.Setter()
   .withCoreSize(int value)

```

一般来说默认的10个已经够了。

### queueSizeRejectionThreshold

线程池是10个，如果还有请求过来，默认可以排队的线程是5个。超过5个以后多余的请求进来，就会被线程池拒绝掉，抛出异常。

默认值是5，可以通过下面代码修改：


```java
HystrixThreadPoolProperties.Setter()
   .withQueueSizeRejectionThreshold(int value)
```

### execution.isolation.semaphore.maxConcurrentRequests

设置使用SEMAPHORE隔离策略的时候，允许访问的最大并发量，超过这个最大并发量，请求直接被reject。这个并发量的设置跟线程池大小的设置应该是类似的，但是基于信号量的话性能会好很多，而且hystrix框架本身的开销会小很多。


默认值是10，不能设置得太大，因为信号量是基于调用线程去执行command的，而且不能从timeout中抽离，因此一旦设置的太大，而且有延时发生，可能瞬间导致tomcat本身的线程资源本占满。


```java
HystrixCommandProperties.Setter()
   .withExecutionIsolationSemaphoreMaxConcurrentRequests(int value)
```

Hystrix的基本使用已经差不多是这样了，后面再有一篇文章，分析hystrix的流程和原理。