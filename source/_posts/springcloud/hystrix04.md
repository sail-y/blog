---
title: Hystrix监控和运维
tags: [hystrix]
date: 2018-06-10 18:03:59
categories: hystrix
---

此为龙果学院课程学习笔记，记录以后翻看

## 监控

### 为什么需要监控与报警？

HystrixCommand执行的时候，会生成一些执行耗时等方面的统计信息。这些信息对于系统的运维来说，是很有帮助的，因为我们通过这些统计信息可以看到整个系统是怎么运行的。hystrix对每个command key都会提供一份metric，而且是秒级统计粒度的。
<!--more-->
这些统计信息，无论是单独看，还是聚合起来看，都是很有用的。如果将一个请求中的多个command的统计信息拿出来单独查看，包括耗时的统计，对debug系统是很有帮助的。聚合起来的metric对于系统层面的行为来说，是很有帮助的，很适合做报警或者报表。hystrix dashboard就很适合。

### hystrix的事件类型


对于hystrix command来说，只会返回一个值，execute只有一个event type，fallback也只有一个event type，那么返回一个SUCCESS就代表着命令执行的结束

对于hystrix observable command来说，多个值可能被返回，所以emit event代表一个value被返回，success代表成功，failure代表异常


#### execute event type

EMIT					observable command返回一个value
SUCCESS 				完成执行，并且没有报错
FAILURE					执行时抛出了一个异常，会触发fallback
TIMEOUT					开始执行了，但是在指定时间内没有完成执行，会触发fallback
BAD\_REQUEST				执行的时候抛出了一个HystrixBadRequestException
SHORT\_CIRCUITED			短路器打开了，触发fallback
THREAD\_POOL\_REJECTED	线程成的容量满了，被reject，触发fallback
SEMAPHORE\_REJECTED		信号量的容量满了，被reject，触发fallback

#### fallback event type

FALLBACK\_EMIT			observable command，fallback value被返回了
FALLBACK\_SUCCESS		fallback逻辑执行没有报错
FALLBACK\_FAILURE		fallback逻辑抛出了异常，会报错
FALLBACK\_REJECTION		fallback的信号量容量满了，fallback不执行，报错
FALLBACK\_MISSING		fallback没有实现，会报错

#### 其他的event type

EXCEPTION\_THROWN		command生命自周期是否抛出了异常
RESPONSE\_FROM\_CACHE		command是否在cache中查找到了结果
COLLAPSED				command是否是一个合并batch中的一个

#### thread pool event type

EXECUTED				线程池有空间，允许command去执行了
REJECTED 				线程池没有空间，不允许command执行，reject掉了

#### collapser event type

BATCH\_EXECUTED			collapser合并了一个batch，并且执行了其中的command
ADDED\_TO\_BATCH			command加入了一个collapser batch
RESPONSE\_FROM\_CACHE		没有加入batch，而是直接取了request cache中的数据

### metric storage


metric被生成之后，就会按照一段时间来存储，存储了一段时间的数据才会推送到其他系统中，比如hystrix dashboard。

另外一种方式，就是每次生成metric就实时推送metric流到其他地方，但是这样的话，会给系统带来很大的压力。

hystrix的方式是将metric写入一个内存中的数据结构中，在一段时间之后就可以查询到，hystrix 1.5x之后，采取的是为每个command key都生成一个start event和completion event流，而且可以订阅这个流。每个thread pool key也是一样的，包括每个collapser key也是一样的。

每个command的event是发送给一个线程安全的RxJava中的rx.Subject，因为是线程安全的，所以不需要进行线程同步。

因此每个command级别的，threadpool级别的，每个collapser级别的，event都会发送到对应的RxJava的rx.Subject对象中。这些rx.Subject对象接着就会被暴露出Observable接口，可以被订阅。

### metric统计相关的配置

#### metrics.rollingStats.timeInMilliseconds

设置统计的rolling window，单位是毫秒，hystrix只会维持这段时间内的metric供短路器统计使用

这个属性是不允许热修改的，默认值是10000，就是10秒钟

HystrixCommandProperties.Setter()
   .withMetricsRollingStatisticalWindowInMilliseconds(int value)

#### metrics.rollingStats.numBuckets

该属性设置每个滑动窗口被拆分成多少个bucket，而且滑动窗口对这个参数必须可以整除，同样不允许热修改

默认值是10，也就是说，每秒钟是一个bucket

随着时间的滚动，比如又过了一秒钟，那么最久的一秒钟的bucket就会被丢弃，然后新的一秒的bucket会被创建

HystrixCommandProperties.Setter()
   .withMetricsRollingStatisticalWindowBuckets(int value)

#### metrics.rollingPercentile.enabled

控制是否追踪请求耗时，以及通过百分比方式来统计，默认是true

HystrixCommandProperties.Setter()
   .withMetricsRollingPercentileEnabled(boolean value)

#### metrics.rollingPercentile.timeInMilliseconds

设置rolling window被持久化保存的时间，这样才能计算一些请求耗时的百分比，默认是60000，60s，不允许热修改

相当于是一个大的rolling window，专门用于计算请求执行耗时的百分比

HystrixCommandProperties.Setter()
   .withMetricsRollingPercentileWindowInMilliseconds(int value)

#### metrics.rollingPercentile.numBuckets

设置rolling percentile window被拆分成的bucket数量，上面那个参数除以这个参数必须能够整除，不允许热修改

默认值是6，也就是每10s被拆分成一个bucket

HystrixCommandProperties.Setter()
   .withMetricsRollingPercentileWindowBuckets(int value)

#### metrics.rollingPercentile.bucketSize

设置每个bucket的请求执行次数被保存的最大数量，如果在一个bucket内，执行次数超过了这个值，那么就会重新覆盖从bucket的开始再写

举例来说，如果bucket size设置为100，而且每个bucket代表一个10秒钟的窗口，但是在这个bucket内发生了500次请求执行，那么这个bucket内仅仅会保留100次执行

如果调大这个参数，就会提升需要耗费的内存，来存储相关的统计值，不允许热修改

默认值是100

HystrixCommandProperties.Setter()
   .withMetricsRollingPercentileBucketSize(int value)

#### metrics.healthSnapshot.intervalInMilliseconds

控制成功和失败的百分比计算，与影响短路器之间的等待时间，默认值是500毫秒

HystrixCommandProperties.Setter()
   .withMetricsHealthSnapshotIntervalInMilliseconds(int value)

## 监控部署 

找到之前的eshop-cache-ha项目，引入配置：

https://github.com/sail-y/eshop-cache-ha


```xml
<dependency>
    <groupId>com.netflix.hystrix</groupId>
    <artifactId>hystrix-metrics-event-stream</artifactId>
    <version>1.4.10</version>
</dependency>
```

然后再注册一个servlet的bean

```java
public ServletRegistrationBean indexServletRegistration() {
    ServletRegistrationBean registration = new ServletRegistrationBean(new HystrixMetricsStreamServlet());
    registration.addUrlMappings("/hystrix.stream");
    return registration;
}
```


**Tomcat**

准备一个tomcat部署HystrixDashboard，网上下载一个`hystrix-dashboard-1.5.12.war`，再装一个turbin，turbin是用来监控一个集群的，可以将一个集群的所有机器都配置在这里。

在/WEB-INF/classes下添加一个配置文件，告诉turbin需要监控哪些实例。

**config.properties**

```
turbine.ConfigPropertyBasedDiscovery.default.instances=localhost
turbine.instanceUrlSuffix=:8081/hystrix.stream
```

![](/img/hystrix/hystrix-running.png)

然后启动我们自己的`eshop-cache-ha`项目，

访问页面查看

http://localhost:8080/hystrix-dashboard/

填入我们要监控的URL.

![](/img/hystrix/hystrix-running2.png)

http://localhost:8081/hystrix.stream，监控单个机器

http://localhost:8080/turbine/turbine.stream，监控整个集群

现在还看不到什么东西，我们对项目发送几个请求，再看看效果

```java
/**
 * 监控请求测试
 *
 * @author yangfan
 * @date 2018/06/10
 */
public class HystrixDashboardTest {
    public static void main(String[] args) {
        for (int i = 0; i < 50; i++) {
            HttpUtil.get("http://localhost:8081/getProductInfo?productId=1");
            try {
                Thread.sleep(3000L);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}
```

![](/img/hystrix/hystrix-running3.png)

hystrix的dashboard可以支持实时监控metric

netflix开始用这个dashboard的时候，大幅度优化了工程运维的操作，帮助节约了恢复系统的时间。大多数生产系统的故障持续时间变得很短，而且影响幅度小了很多，主要是因为hystrix dashborad提供了可视化的监控。

截图说明，dashboard上的指标都是什么？

圆圈的颜色和大小代表了健康状况以及流量，折线代表了最近2分钟的请求流量

集群中的机器数量，请求延时的中位数以及平均值

最近10秒内的异常请求比例，请求QPS，每台机器的QPS，以及整个集群的QPS

断路器的状态

最近一分钟的请求延时百分比，TP90，TP99，TP99.5

几个有颜色的数字，代表了最近10秒钟的统计，以1秒钟为粒度

成功的请求数量，绿颜色的数字; 短路的请求数量，蓝色的数字; timeout超时的请求数量，黄色的数字; 线程池reject的请求数量，紫色的数字; 请求失败，抛出异常的请求数量，红色的数字


## 生产环境运维


如果发现了严重的依赖调用延时，先不用急着去修改配置，如果一个command被限流了，可能本来就应该限流

在netflix早期的时候，经常会有人在发现短路器因为访问延时发生的时候，去热修改一些配置，比如线程池大小，队列大小，超时时长，等等，给更多的资源，但是这其实是不对的。

如果我们之前对系统进行了良好的配置，然后现在在高峰期，系统在进行线程池reject，超时，短路，那么此时我们应该集中精力去看底层根本的原因，而不是调整配置

为什么在高峰期，一个10个线程的线程池，搞不定这些流量呢？那就是代码写的太烂了，可以使用异步，或者更好的算法。

千万不要急于给你的依赖调用过多的资源，比如线程池大小，队列大小，超时时长，信号量容量，等等，因为这可能导致我们自己对自己的系统进行DDOS攻击。


举例来说，想象一下，我们现在有100台服务器组成的集群，每台机器有10个线程大小的线程池去访问一个服务，那么我们对那个服务就有1000个线程资源去访问了，在正常情况下，可能只会用到其中200~300个线程去访问那个后端服务。但是如果再高峰期出现了访问延时，可能导致1000个线程全部被调用去访问那个后端服务，如果我们调整到每台服务器20个线程呢？

如果因为你的代码等问题导致访问延时，即使有20个线程可能还是会导致线程池资源被占满，此时就有2000个线程去访问后端服务，可能对后端服务就是一场灾难。

这就是断路器的作用了，如果我们把后端服务打死了，或者产生了大量的压力，有大量的timeout和reject，那么就自动短路，一段时间后，等流量洪峰过去了，再重启访问。

简单来说，让系统自己去限流，短路，超时，以及reject，直到系统重新变得正常了，就是不要随便乱改资源配置，不要随便乱增加线程池大小，等待队列大小，异常情况是正常的。

