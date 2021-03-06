---
title: Eureka源码02-服务注册流程分析
date: 2020-03-18 20:05:39
tags: [spring-cloud,eureka]
categories: spring-cloud

---

# eureka client启动流程

上一篇文章，我们分析了eureka server的启动流程，这一篇来分析一下eureka client的启动流程。我们先要找到启动入口在哪里。在eureka-examples里，有一个ExampleEurekaClient的测试类。要执行这个类，首先需要复制一段代码，设置一些基础属性，这是从eureka-server的单元测试里复制过来的：

```java
/**
 * This will be read by server internal discovery client. We need to salience it.
 */
private static void injectEurekaConfiguration() throws UnknownHostException {
  String myHostName = InetAddress.getLocalHost().getHostName();
  String myServiceUrl = "http://" + myHostName + ":8080/v2/";

  System.setProperty("eureka.region", "default");
  System.setProperty("eureka.name", "eureka");
  System.setProperty("eureka.vipAddress", "eureka.mydomain.net");
  System.setProperty("eureka.port", "8080");
  System.setProperty("eureka.preferSameZone", "false");
  System.setProperty("eureka.shouldUseDns", "false");
  System.setProperty("eureka.shouldFetchRegistry", "false");
  System.setProperty("eureka.serviceUrl.defaultZone", myServiceUrl);
  System.setProperty("eureka.serviceUrl.default.defaultZone", myServiceUrl);
  System.setProperty("eureka.awsAccessId", "fake_aws_access_id");
  System.setProperty("eureka.awsSecretKey", "fake_aws_secret_key");
  System.setProperty("eureka.numberRegistrySyncRetries", "0");
}
```

<!--more-->

在main方法的第一行调用一下上面的方法。

```java
public static void main(String[] args) throws UnknownHostException {
    injectEurekaConfiguration();
    ExampleEurekaClient sampleClient = new ExampleEurekaClient();

    // create the client
    ApplicationInfoManager applicationInfoManager = initializeApplicationInfoManager(new MyDataCenterInstanceConfig());
    EurekaClient client = initializeEurekaClient(applicationInfoManager, new DefaultEurekaClientConfig());

    // use the client
    sampleClient.sendRequestToServiceUsingEureka(client);


    // shutdown the client
    eurekaClient.shutdown();
}
```

看下上面这个方法，这段逻辑几乎和上一篇文章中介绍的eureka server启动流程中，初始化eureka client逻辑的是一样的。

1. 读取eureka-client.properties配置文件，形成服务实例配置，基于接口对外提供服务实例配置项的读取。（MyDataCenterInstanceConfig）
2. 基于服务实例配置，构造服务实例（InstanceInfo）
3. 基于eureka client配置和服务实例，构造服务实例管理器（ApplicationInfoManager）
4. 读取eureka-client.properties配置文件，形成一个eureka client的配置，基于接口对外提供eureka client配置项读取（DefaultEurekaClientConfig）。
5. 基于eureka client配置，和服务实例管理器构造了一个EurekaClient（DiscoveryClient），保存了一些配置，处理服务的注册和注册表的抓取，启动了几个线程池，启动了网络通信组件，启动了一些调度任务，注册了监控项。

在DiscoveryClient的构造方法里，做了很多操作，具体可以看下图。

## 画图总结

![eureka client启动流程](/img/spring-cloud/eureka client启动流程.jpg)



# eureka client服务注册逻辑

上面的逻辑咱们理完了后，发现不知道服务注册是哪一个步骤完成的，实际上注册的逻辑，是在初始化调度任务那里，和心跳任务一起初始化的`InstanceInfoReplicator`任务里。**这儿其实感觉比较奇怪，注册服务和实例信息复制，在我们常见的分布式系统里应该是不同的概念，比如redis、mongodb、elastic search里都有副本的概念（Replica），但是在eureka这里，这里面实际上却是注册服务的逻辑。**

1. `InstanceInfoReplicator`的start方法里，将自己作为一个线程放到一个调度线程池中去了，默认

是延迟40秒执行。

2. 那么执行线程的时候，是执行run()方法。

3. 在run方法里，刷新了一下服务实例的信息discoveryClient.refreshInstanceInfo();，里面其实是调用ApplicationInfoManager的一些方法刷新了服务实例的配置，看看配置有没有改变，如果改变了，就刷新一下；用健康检查器检查状态，将状态设置到了ApplicationInfoManager中，更新服务实例状态。

4. 然后调用discoveryClient.register();进行服务注册。

5. 服务注册的时候，是基于EurekaClient的register()方法去注册的，调用的是底层的eurekaTransport的registrationClient，将InstanceInfo服务实例的信息，通过http请求，调用eureka server对外暴露的一个restful接口，将InstanceInfo发送过去。注意：EurekaTransport在构造的下一行代码的时候，调用了**scheduleServerEndpointTask**（一个令人迷惑的方法名），其实这个方法里就初始化了专门用于注册的registrationClient。

   ```java
   eurekaTransport = new EurekaTransport();
   // 其实是初始化eurekaTransport
   scheduleServerEndpointTask(eurekaTransport, args);
   ......
   httpResponse = eurekaTransport.registrationClient.register(instanceInfo);
   ```

6. 然后实际上底层执行发送请求的逻辑，实在是非常难找，代码嵌套过多，最后在EurekaHttpClient的子类里，寻找和http库有关的类，我们找到了AbstractJersey2EurekaHttpClient，在这里的`register`方法，发现了实际发送注册请求的逻辑。

   ```java
   // 发送请求，http://localhost:8080/v2/apps/ServiceA
   // 发送的是post请求，服务实例的对象打成了一个json发送过去，包含了自己的主机，ip，端口号
   // eureka server就知道这个ServiceA这个服务，有一个服务实例，比如是在172.16.21.33、dev-server、8080
   Builder resourceBuilder = jerseyClient.target(serviceUrl).path(urlPath).request();
   ```

   

## 总结

eureka client在服务注册的这块代码，可以也是看到有用到工厂模式、装饰器模式，但是也有很多**槽点**：

1. 服务注册，不应该放在`InstanceInfoReplicator`中，语意不明朗。
2. 负责发送请求的HttpClient，类体系过于**复杂**，导致看代码的人根本找不到对应的client，最后是根据顶层接口(EurekaHttpClient)和项目依赖实际是使用jersey框架来进行restful接口暴露和调用，才找到真正发送服务注册请求的地方(AbstractJersey2EurekaHttpClient)。



# eureka server收到注册请求的处理

上面分析到了，eureka client向eureka server发起了http请求进行注册，下面就看一下在eureka server中，是如何接收并处理注册请求的。

因为eureka是基于jersey开发，所以我们去找/v2/apps/{appId}这样的post请求路径处理类，这个请求是在eureka-core模块中`ApplicationsResource`的`getApplicationResource`。

```java
@Path("{appId}")
public ApplicationResource getApplicationResource(
  @PathParam("version") String version,
  @PathParam("appId") String appId) {
  CurrentRequestVersion.set(Version.toEnum(version));
  return new ApplicationResource(appId, serverConfig, registry);
}
```

跟到ApplicationResource里去找处理post的方法，就找到了接收注册请求的逻辑。

```java
@POST
@Consumes({"application/json", "application/xml"})
public Response addInstance(InstanceInfo info,
                            @HeaderParam(PeerEurekaNode.HEADER_REPLICATION) String isReplication) {
  ...
```

接收的是InstanceInfo，代表了一个服务实例。

在单元测试里，有一个ApplicationResourceTest类，包含了许多功能的测试。接下来，在ApplicationResourceTest里，用断点的方式执行testGoodRegistration方法，对注册流程进行调试和源码分析。

![image-20200319222757757](/img/spring-cloud/image-20200319222757757.png)

InstanceInfo主要包含2部分数据：

1. 主机名、ip地址、端口号、url地址
2. lease（租约）的信息：保持心跳的间隔时间，最近心跳的时间，服务注册的时间，服务启动的时间。



register逻辑：

1. 检查了一些必要的参数

2. 判断是否是在AWS数据中心，做额外的操作

3. 调用registry.register(info, "true".equals(isReplication));（PeerAwareInstanceRegistry）。向服务实例注册表里注册。

4. 调用[PeerAwareInstanceRegistry](http://www.saily.top/2020/03/15/springcloud/eureka01/#%E5%A4%84%E7%90%86%E6%B3%A8%E5%86%8C%E7%9B%B8%E5%85%B3%E7%9A%84%E4%BA%8B%E6%83%85)父类的register方法

   ```java
   public void register(InstanceInfo registrant, int leaseDuration, boolean isReplication) {
     try {
       read.lock();
       Map<String, Lease<InstanceInfo>> gMap = registry.get(registrant.getAppName());
       REGISTER.increment(isReplication);
       // 如果是第一次注册，这个map肯定是null
       // 对Map进行初始化
       if (gMap == null) {
         final ConcurrentHashMap<String, Lease<InstanceInfo>> gNewMap = new ConcurrentHashMap<String, Lease<InstanceInfo>>();
         // 一个服务会有多个实例，所以这样存
         gMap = registry.putIfAbsent(registrant.getAppName(), gNewMap);
         if (gMap == null) {
           gMap = gNewMap;
         }
       }
       // 第一次执行，这里肯定也是null
       Lease<InstanceInfo> existingLease = gMap.get(registrant.getId());
       ......省略部分代码
       // 如果是服务第一次注册，将服务实例信息放到map中
       Lease<InstanceInfo> lease = new Lease<InstanceInfo>(registrant, leaseDuration);
       if (existingLease != null) {
         lease.setServiceUpTimestamp(existingLease.getServiceUpTimestamp());
       }
       gMap.put(registrant.getId(), lease);
         
   ```

   这里的registry，他的数据结构里面就是保存的服务和实例信息：

   ```json
   {
     "APP_A":{
       "00000":Lease<InstanceInfo>,
       "00001":Lease<InstanceInfo>,
       "00002":Lease<InstanceInfo>,
     },
     "APP_B":{
       "10000":Lease<InstanceInfo>,
    "20001":Lease<InstanceInfo>,
       "30002":Lease<InstanceInfo>,
     }
   }
   ```
   
5. 将服务实例的服务名和实例ID访问一个队列中（recentRegisteredQueue）

6. 再后面也是更新一些状态。

**所以服务注册，最终数据就是服务实例信息放在了一个内存的注册表中：`ConcurrentHashMap<String, Map<String, Lease<InstanceInfo>>>`。**



注册这里包含了一个读写锁的应用，ReentrantReadWriteLock，在这里注册的时候，上的是读锁，多个服务实例，可以同时注册。灵活运用读写锁，可以控制多线程的并发，有些操作是可以并发执行的，有些操作的互斥的。



## 画图总结

![image-20200319232127915](/img/spring-cloud/image-20200319232127915.png)