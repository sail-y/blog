---
title: Hystrix高级进阶
date: 2018-04-15 10:33:01
tags: [spring-cloud,hystrix]
categories: spring
---


## 请求合并技术

前面的两篇文章讲解了hystrix的入门，以及它的原理和执行流程。

之前我们有提到[Request Cache](http://www.saily.top/2018/03/26/hystrix02/#Request-Cache)，在一次请求上下文中，如果有多个command，参数都是一样的，调用的接口也是一样的，其实结果可以认为也是一样的。
<!--more-->

但是如果获取多个商品，需要发送多次网络请求，调用多次接口才能拿到结果。Hystrix还为我们提供了一种叫做请求合并的技术，可以使用HystrixCollapser将多个HystrixCommand合并到一起，多个command放在一个command里面去执行，发送一次网络请求，就拉取到多条数据。用请求合并技术，将多个请求合并起来，可以减少高并发访问下需要使用的线程数量以及网络连接数量，可以提升性能。


### 请求合并有多种级别

1. global context，tomcat所有调用线程，对一个依赖服务的任何一个command调用都可以被合并在一起，hystrix就传递一个HystrixRequestContext
2. user request context，tomcat内某一个调用线程，将某一个tomcat线程对某个依赖服务的多个command调用合并在一起
3. object modeling，基于对象的请求合并，如果有几百个对象，遍历后依次调用每个对象的某个方法，可能导致发起几百次网络请求，基于hystrix可以自动将对多个对象模型的调用合并到一起

### 请求合并技术的开销有多大

使用请求合并技术的开销就是导致延迟大幅度增加，因为需要一定的时间将多个请求合并起来。比如发送过来10个请求，每个请求本来大概是2ms可以返回，要把10个请求合并在一个command内，统一一起执行，先后等待一下，可能就需要5ms（延时翻N倍了）。

所以说，要考量一下使用请求合并技术是否合适，如果一个请求本来耗费的时间就比较长，那么进行请求合并，增加一些延迟影响并不大，这样可以大幅度削减你的线程池的资源耗费，也可以减少后端服务的网络资源开销。如果一个请求本来就很快，用请求合并后反而还变慢了很多倍了，那就没有必要了。

>每个请求就2ms，batch，8~10ms，延迟增加了4~5倍

>每个请求本来就30ms~50ms，batch，35ms~55ms，延迟增加不太明显


### 实战

批量查询本质上我们还是采用HystrixObservableCommand，HystrixCommand+request cache，依然每个商品发起一次网络请求。

什么意思？就是一个批量的商品过来以后，我们还是多个command的方式去执行，request collapser+request cache，相同的商品还是就查询一次，不同的商品合并到一起通过一个网络请求得到结果，我们结合之前的request cache开发。

我们需要开发合并请求的命令，还需要开发一个批量查询商品的接口。


#### collapser开发

https://github.com/sail-y/eshop-cache-ha/blob/master/src/main/java/com/roncoo/eshop/cache/ha/hystrix/command/GetProductInfosCollapser.java

```java
/**
 * @author yangfan
 * @date 2018/04/15
 */
public class GetProductInfosCollapser extends HystrixCollapser<List<ProductInfo>, ProductInfo, Long> {

    private Long productId;


    public GetProductInfosCollapser(Long productId) {
        this.productId = productId;
    }

    @Override
    public Long getRequestArgument() {
        return productId;
    }


    @Override
    protected HystrixCommand<List<ProductInfo>> createCommand(Collection<CollapsedRequest<ProductInfo, Long>> requests) {
        String params = requests.stream().map(CollapsedRequest::getArgument).map(Object::toString).collect(Collectors.joining(","));
        System.out.println("createCommand方法执行，params=" + params);
        return new BatchCommand(requests);
    }


    @Override
    protected void mapResponseToRequests(List<ProductInfo> batchResponse, Collection<CollapsedRequest<ProductInfo, Long>> requests) {
        int count = 0;
        for (CollapsedRequest<ProductInfo, Long> request : requests) {
            request.setResponse(batchResponse.get(count++));
        }
    }

    private static final class BatchCommand extends HystrixCommand<List<ProductInfo>> {

        public final Collection<CollapsedRequest<ProductInfo, Long>> requests;

        public BatchCommand(Collection<CollapsedRequest<ProductInfo, Long>> requests) {
            super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ProductInfoService"))
                    .andCommandKey(HystrixCommandKey.Factory.asKey("GetProductInfosCollapserBatchCommand")));
            this.requests = requests;
        }

        @Override
        protected List<ProductInfo> run() throws Exception {

            // 将一个批次内的商品id给拼接到了一起
            String params = requests.stream().map(CollapsedRequest::getArgument).map(Object::toString).collect(Collectors.joining(","));

            // 将多个商品id合并到一个batch内，直接发送一次网络请求，获取所有的商品
            String url = "http://localhost:8082/getProductInfos?productIds=" + params;

            String response = HttpUtil.get(url);

            List<ProductInfo> productInfos = JSONArray.parseArray(response, ProductInfo.class);
            for (ProductInfo productInfo : productInfos) {
                System.out.println("BatchCommand内部， productInfo=" + JSON.toJSONString(productInfo));
            }
            return productInfos;
        }
    }

}
```



#### 批量查询接口开发

https://github.com/sail-y/eshop-product-ha/blob/master/src/main/java/com/roncoo/esjop/product/ha/controller/ProductController.java

```java
@GetMapping("/getProductInfos")
public String getProductInfos(String productIds) {

    System.out.println("getProductInfos接收到一次请求，productIds=" + productIds);

    JSONArray jsonArray = new JSONArray();

    for (String productId : productIds.split(",")) {
        String json = "{\"id\": " + productId + ", \"name\": \"iphone7手机\", \"price\": 5599, \"pictureList\":\"a.jpg,b.jpg\", \"specification\": \"iphone7的规格\", \"service\": \"iphone7的售后服务\", \"color\": \"红色,白色,黑色\", \"size\": \"5.5\", \"shopId\": 2, \"modifiedTime\": \"2018-02-21 21:11:34\", \"cityId\": 1}";
        jsonArray.add(JSON.parse(json));
    }

    return jsonArray.toJSONString();

}
```

#### 测试代码

```java
/**
 *
 * 请求合并测试
 *
 */
public class RequestCollapserTest {

    public static void main(String[] args) {
        HttpUtil.get("http://localhost:8081/getProductInfos?productIds=1,2,3,4,5,6,7");
    }
}
```

**输出结果**


```java
GetProductInfosCollapser getProductInfosCollapser = new GetProductInfosCollapser(Long.valueOf(productId));
            futures.add(getProductInfosCollapser.queue());
```

把所有需要查询的商品通过HystrixCollapser发送，HystrixCollapser会为自动为我们讲请求合并以后访问。可能第一次访问的时候会超时，因为开发环境项目刚启动，第一次访问比较慢，第二次就好了。

```
createCommand方法执行，params=1,2,3,4,5,6,7
BatchCommand内部， productInfo={"cityId":1,"color":"红色,白色,黑色","id":1,"modifiedTime":"2018-02-21 21:11:34","name":"iphone7手机","pictureList":"a.jpg,b.jpg","price":5599.0,"service":"iphone7的售后服务","shopId":2,"size":"5.5","specification":"iphone7的规格"}
BatchCommand内部， productInfo={"cityId":1,"color":"红色,白色,黑色","id":2,"modifiedTime":"2018-02-21 21:11:34","name":"iphone7手机","pictureList":"a.jpg,b.jpg","price":5599.0,"service":"iphone7的售后服务","shopId":2,"size":"5.5","specification":"iphone7的规格"}
BatchCommand内部， productInfo={"cityId":1,"color":"红色,白色,黑色","id":3,"modifiedTime":"2018-02-21 21:11:34","name":"iphone7手机","pictureList":"a.jpg,b.jpg","price":5599.0,"service":"iphone7的售后服务","shopId":2,"size":"5.5","specification":"iphone7的规格"}
BatchCommand内部， productInfo={"cityId":1,"color":"红色,白色,黑色","id":4,"modifiedTime":"2018-02-21 21:11:34","name":"iphone7手机","pictureList":"a.jpg,b.jpg","price":5599.0,"service":"iphone7的售后服务","shopId":2,"size":"5.5","specification":"iphone7的规格"}
BatchCommand内部， productInfo={"cityId":1,"color":"红色,白色,黑色","id":5,"modifiedTime":"2018-02-21 21:11:34","name":"iphone7手机","pictureList":"a.jpg,b.jpg","price":5599.0,"service":"iphone7的售后服务","shopId":2,"size":"5.5","specification":"iphone7的规格"}
BatchCommand内部， productInfo={"cityId":1,"color":"红色,白色,黑色","id":6,"modifiedTime":"2018-02-21 21:11:34","name":"iphone7手机","pictureList":"a.jpg,b.jpg","price":5599.0,"service":"iphone7的售后服务","shopId":2,"size":"5.5","specification":"iphone7的规格"}
BatchCommand内部， productInfo={"cityId":1,"color":"红色,白色,黑色","id":7,"modifiedTime":"2018-02-21 21:11:34","name":"iphone7手机","pictureList":"a.jpg,b.jpg","price":5599.0,"service":"iphone7的售后服务","shopId":2,"size":"5.5","specification":"iphone7的规格"}
CacheController结果：ProductInfo(id=1, name=iphone7手机, price=5599.0, pictureList=a.jpg,b.jpg, specification=iphone7的规格, service=iphone7的售后服务, color=红色,白色,黑色, size=5.5, shopId=2, modifiedTime=2018-02-21 21:11:34, cityId=1, cityName=null, brandId=null, brandName=null)
CacheController结果：ProductInfo(id=2, name=iphone7手机, price=5599.0, pictureList=a.jpg,b.jpg, specification=iphone7的规格, service=iphone7的售后服务, color=红色,白色,黑色, size=5.5, shopId=2, modifiedTime=2018-02-21 21:11:34, cityId=1, cityName=null, brandId=null, brandName=null)
CacheController结果：ProductInfo(id=3, name=iphone7手机, price=5599.0, pictureList=a.jpg,b.jpg, specification=iphone7的规格, service=iphone7的售后服务, color=红色,白色,黑色, size=5.5, shopId=2, modifiedTime=2018-02-21 21:11:34, cityId=1, cityName=null, brandId=null, brandName=null)
CacheController结果：ProductInfo(id=4, name=iphone7手机, price=5599.0, pictureList=a.jpg,b.jpg, specification=iphone7的规格, service=iphone7的售后服务, color=红色,白色,黑色, size=5.5, shopId=2, modifiedTime=2018-02-21 21:11:34, cityId=1, cityName=null, brandId=null, brandName=null)
CacheController结果：ProductInfo(id=5, name=iphone7手机, price=5599.0, pictureList=a.jpg,b.jpg, specification=iphone7的规格, service=iphone7的售后服务, color=红色,白色,黑色, size=5.5, shopId=2, modifiedTime=2018-02-21 21:11:34, cityId=1, cityName=null, brandId=null, brandName=null)
CacheController结果：ProductInfo(id=6, name=iphone7手机, price=5599.0, pictureList=a.jpg,b.jpg, specification=iphone7的规格, service=iphone7的售后服务, color=红色,白色,黑色, size=5.5, shopId=2, modifiedTime=2018-02-21 21:11:34, cityId=1, cityName=null, brandId=null, brandName=null)
CacheController结果：ProductInfo(id=7, name=iphone7手机, price=5599.0, pictureList=a.jpg,b.jpg, specification=iphone7的规格, service=iphone7的售后服务, color=红色,白色,黑色, size=5.5, shopId=2, modifiedTime=2018-02-21 21:11:34, cityId=1, cityName=null, brandId=null, brandName=null)
```


### 配置项

HystrixCollapser提供了一些配置：

1. maxRequestsInBatch
	
	控制一个Batch中最多允许多少个request被合并，然后才会触发一个batch的执行
2. timerDelayInMilliseconds
	
	控制一个batch创建之后，多长时间以后就自动触发batch的执行，默认是10毫秒


## fail-fast和fail-silent

HystrixCommand如果命令执行执行中出错了，或者抛异常了它有两种方式后续逻辑：

* fail-fast，就是不给fallback降级逻辑，HystrixCommand.run()，会直接从Hystrix的线程池中抛出异常，打印出日志，无法在调用方捕获
* fail-silent，给一个fallback降级逻辑，如果HystrixCommand.run()，报错了，会走fallback降级，但是降级逻辑返回一个null值

很少会用fail-fast模式，比较常用的可能还是fail-silent，不过既然都到了fallback里面，肯定要做点降级的事情。


### stubbed fallback

stubbed fallback: 残缺的降级

用请求中的部分数据拼装成结果，然后再填充一些默认值返回。比如说你发起了一个请求，然后请求中可能本身就附带了一些信息，如果主请求失败了，走到降级逻辑。在降级逻辑里面，可以将这个请求中的数据，以及部分本地缓存有的数据拼装在一起，再给数据填充一些简单的默认值
然后尽可能将自己有的数据返回到请求方。
 

### 多级降级


先降一级，尝试用一个备用方案去执行，如果备用方案失败了，再用最后下一个备用方案去执行。

hystrix command fallback语义，很容易就可以实现多级降级的策略，command嵌套command就可以达到多级降级的效果，第二个command其实是第一级降级策略。常见的多级降级的做法有一个操作，如果访问MySQL数据库，mysql数据库访问报错，降级，去redis中获取数据，如果说redis又挂了，然后就去从本地ehcache缓存中获取数据。

伪代码：

```
@Override
protected ProductInfo getFallback() {
	return new FirstLevelFallbackCommand(productId).execute();
}

private static class FirstLevelFallbackCommand extends HystrixCommand<ProductInfo> {

	private Long productId;
	
	public FirstLevelFallbackCommand(Long productId) {
		// 第一级的降级策略，因为这个command是运行在fallback中的
		// 所以至关重要的一点是，在做多级降级的时候，要将降级command的线程池单独做一个出来
		// 如果主流程的command都失败了，可能线程池都已经被占满了
		// 降级command必须用自己的独立的线程池
		super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ProductInfoService"))
					.andCommandKey(HystrixCommandKey.Factory.asKey("FirstLevelFallbackCommand"))
					.andThreadPoolKey(HystrixThreadPoolKey.Factory.asKey("FirstLevelFallbackPool"))
		);  
		this.productId = productId;
	}
	
	@Override
	protected ProductInfo run() throws Exception {
		// 这里，因为是第一级降级的策略，所以说呢，其实是要从备用机房的机器去调用接口
		// 但是，我们这里没有所谓的备用机房，所以说还是调用同一个服务来模拟
		if(productId.equals(-2L)) {
			throw new Exception();
		}
		String url = "http://127.0.0.1:8082/getProductInfo?productId=" + productId;
		String response = HttpClientUtils.sendGetRequest(url);
		return JSONObject.parseObject(response, ProductInfo.class);  
	}
	
	@Override
	protected ProductInfo getFallback() {
		// 第二级降级策略，第一级降级策略，都失败了
		ProductInfo productInfo = new ProductInfo();
		// 从请求参数中获取到的唯一条数据
		productInfo.setId(productId); 
		// 从本地缓存中获取一些数据
		productInfo.setBrandId(BrandCache.getBrandId(productId));
		productInfo.setBrandName(BrandCache.getBrandName(productInfo.getBrandId()));  
		productInfo.setCityId(LocationCache.getCityId(productId)); 
		productInfo.setCityName(LocationCache.getCityName(productInfo.getCityId()));  
		// 手动填充一些默认的数据
		productInfo.setColor("默认颜色");  
		productInfo.setModifiedTime(new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date()));
		productInfo.setName("默认商品");  
		productInfo.setPictureList("default.jpg");  
		productInfo.setPrice(0.0);  
		productInfo.setService("默认售后服务");  
		productInfo.setShopId(-1L);  
		productInfo.setSize("默认大小");  
		productInfo.setSpecification("默认规格");   
		return productInfo;
	}
	
}
```


### 手动降级

* 手动降级实现方式是写一个command，在这个command它的主流程中，根据一个标识位，判断要执行哪个流程，可以执行主流程，也可以执行一个备用降级的command。


* 它的使用场景：一般来说都是去执行一个主流程的command，如果说你现在知道主流程有问题了，希望能够手动降级的话，动态给服务发送个请求。在请求中修改标识位，自动就让command以后都直接过来执行备用command。

* 一般会嵌套3个command，套在最外面的command，是用semaphore信号量做限流和资源隔离的，因为这个command不用去care timeout的问题，嵌套调用的command会自己去管理timeout超时的

代码片段如下，通过`IsDegrade.isDegrade()`可以设置是否手动降级。

```java
/**
 * @author yangfan
 * @date 2018/04/15
 */
public class GetProductInfoFacadeCommand extends HystrixCommand<ProductInfo> {

    private Long productId;

    public GetProductInfoFacadeCommand(Long productId) {
        super(HystrixCommand.Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("ProductInfoService"))
                .andCommandKey(HystrixCommandKey.Factory.asKey("GetProductInfoFacadeCommand"))
                .andCommandPropertiesDefaults(HystrixCommandProperties.Setter()
                        .withExecutionIsolationStrategy(HystrixCommandProperties.ExecutionIsolationStrategy.SEMAPHORE)
                        .withExecutionIsolationSemaphoreMaxConcurrentRequests(15)));
        this.productId = productId;
    }

    @Override
    protected ProductInfo run() throws Exception {
        if(!IsDegrade.isDegrade()) {
            return new GetProductInfoCommand(productId).execute();
        } else {
            return new GetProductInfoFromMySQLCommand(productId).execute();
        }
    }

    @Override
    protected ProductInfo getFallback() {
        return new ProductInfo();
    }

}
```


## 总结

看了这么多Hystrix的配置和使用方式，我们在生产环境里最需要关注的点是什么？

1. 线程池大小设置
2. timeout时长设置

这个配置也没有说固定是多少，但是有一些规律可循。一般一开始需要将一些关键配置设置的大一些，比如timeout超时时长，线程池大小，或信号量容量。然后逐渐优化这些配置，直到在一个生产系统中运作良好。



1. 一开始先不要设置timeout超时时长，默认就是1000ms，也就是1s
2. 一开始也不要设置线程池大小，默认就是10
3. 直接部署hystrix到生产环境，如果运行的很良好，那么就让它这样运行好了
4. 让hystrix应用，24小时运行在生产环境中
5. 依赖标准的监控和报警机制来捕获到系统的异常运行情况
6. 在24小时之后，看一下调用延迟的占比，以及流量，来计算出让短路器生效的最小的配置数字
7. 直接对hystrix配置进行热修改，然后继续在hystrix dashboard上监控
8 看看修改配置后的系统表现有没有改善


**最佳方案：**

1. 线程池大小：假设一个请求200ms，QPS30。那么每秒的高峰访问次数 * 99%的访问延时 + buffer = 30 * 0.2 + 4 = 10线程，10个线程每秒处理30次访问应该足够了，每个线程处理3次访问
2. timeout：合理的timeout设置应该为300ms，也就是99.5%的访问延时，计算方法是，因为判断每次访问延时最多在250ms（TP99如果是200ms的话），再加一次重试时间50ms，就是300ms，感觉也应该足够了

如果线程池设置得比较死，那么如果某个服务高峰期来了线程不够用，别的服务又占着线程池不用，这样就很不合理了，所以Hystrix也为我们提供了动态调整线程池的方案。

1. coreSize

	设置线程池的大小，默认是10
	
	HystrixThreadPoolProperties.Setter()
	   .withCoreSize(int value)

2. maximumSize

	设置线程池的最大大小，只有在设置allowMaximumSizeToDivergeFromCoreSize的时候才能生效
	
	默认是10
	
	HystrixThreadPoolProperties.Setter()
	   .withMaximumSize(int value)

3. keepAliveTimeMinutes

	设置保持存活的时间，单位是分钟，默认是1
	
	如果设置allowMaximumSizeToDivergeFromCoreSize为true，那么coreSize就不等于maxSize，此时线程池大小是可以动态调整的，可以获取新的线程，也可以释放一些线程
	
	如果coreSize < maxSize，那么这个参数就设置了一个线程多长时间空闲之后，就会被释放掉
	
	HystrixThreadPoolProperties.Setter()
	   .withKeepAliveTimeMinutes(int value)

4. allowMaximumSizeToDivergeFromCoreSize

	允许线程池大小自动动态调整，设置为true之后，maxSize就生效了，此时如果一开始是coreSize个线程，随着并发量上来，那么就会自动获取新的线程，但是如果线程在keepAliveTimeMinutes内空闲，就会被自动释放掉
	
	默认是false
	
	HystrixThreadPoolProperties.Setter()
	   .withAllowMaximumSizeToDivergeFromCoreSize(boolean value)