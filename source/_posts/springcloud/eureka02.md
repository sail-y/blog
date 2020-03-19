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

   

# 总结

eureka client在服务注册的这块代码，可以也是看到有用到工厂模式、装饰器模式，但是也有很多**槽点**：

1. 服务注册，不应该放在`InstanceInfoReplicator`中，语意不明朗。
2. 负责发送请求的HttpClient，类体系过于**复杂**，导致看代码的人根本找不到对应的client，最后是根据顶层接口(EurekaHttpClient)和项目依赖实际是使用jersey框架来进行restful接口暴露和调用，才找到真正发送服务注册请求的地方(AbstractJersey2EurekaHttpClient)。

