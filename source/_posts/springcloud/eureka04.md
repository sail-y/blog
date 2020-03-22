# 心跳流程分析

eureka client每隔一定的时间，会给eureka server发送心跳，保持心跳，让eureka server认为自己还活着。

心跳在代码里，叫做续约。

1. 还是在DiscoveryClient初始化的时候，有一个心跳的定时任务，由`HeartbeatThread`执行。

2. 默认值是每隔30秒去发送一个心跳。DEFAULT_LEASE_RENEWAL_INTERVAL

3. 接下来是用jersy去给eureka server发送心跳的http请求。<!--more-->

   ```java
   httpResponse = eurekaTransport.registrationClient.sendHeartBeat(instanceInfo.getAppName(), instanceInfo.getId(), instanceInfo, null);
   ```

   请求的地址是：`PUT apps/{appName}/{id}`

4. 我们根据这个接口去找下是什么类处理的请求，这个又是让我好一顿找：在ApplicationsResource里有个`@Path("{appId}")`，这里已经组成了路径`apps/{appId}`，然后在ApplicationsResource里边又有一个``@Path("{id}")`方法，到这里就是`apps/{appId}/{id}`，是不是刚好符合客户端的请求路径，但是还是没有定位到PUT方法在哪里，继续看InstanceResource里的renewLease方法，配合参数看下，终于才找到了server端处理心跳逻辑的代码。*不得不说这个隐藏的真是比较深，你看那个getInstanceInfo方法，你很难想到这个get方法只是一个路径的节点，具体的处理还得继续往里跟。应该是也因为我不熟悉jersy这个框架，不知道怎么快速定位一个mvc路径的执行代码。*

   ```java
   // ApplicationsResource
   @Path("{appId}")
   public ApplicationResource getApplicationResource(
           @PathParam("version") String version,
           @PathParam("appId") String appId) {
       CurrentRequestVersion.set(Version.toEnum(version));
       return new ApplicationResource(appId, serverConfig, registry);
   }
   // ApplicationResource
   @Path("{id}")
   public InstanceResource getInstanceInfo(@PathParam("id") String id) {
       return new InstanceResource(this, id, serverConfig, registry);
   }
   // InstanceResource
   @PUT
   public Response renewLease(
           @HeaderParam(PeerEurekaNode.HEADER_REPLICATION) String isReplication,
           @QueryParam("overriddenstatus") String overriddenStatus,
           @QueryParam("status") String status,
           @QueryParam("lastDirtyTimestamp") String lastDirtyTimestamp) {
   ```

5. 通过注册表的renew方法，完成服务续约的逻辑。registry.renew，实际还是进入AbstractInstanceRegistry.renew这个方法里。

6. 用appName获取服务注册表那个map，做了一些检查。最后执行续约的逻辑（leaseToRenew.renew();）其实就是更新了一下lastUpdateTimestamp的时间，加上了duration。

   ```java
   Map<String, Lease<InstanceInfo>> gMap = registry.get(appName);
   // 一些代码
   leaseToRenew.renew();
   ```

   

# 服务下线流程分析

下面看一下DiscoveryClient的shutdown方法的逻辑。

1. 在eureka client里，得自己调用一下eurekaClient.shutodwn()方法来进行服务下线。关注里边的unregister();方法。

   ```java
   EurekaHttpResponse<Void> httpResponse = eurekaTransport.registrationClient.cancel(instanceInfo.getAppName(), instanceInfo.getId());
   ```

   对应的路径是，`DELETE apps/{appName}/{id}`，和上面一样，是在InstanceResource类里的cancelLease方法。

2. 最后跟着源码里走，执行的的逻辑是AbstractInstanceRegistry.internalCancel方法。

3. 取到注册表的map，直接调用remove从map里给移除了。

   ```java
   Map<String, Lease<InstanceInfo>> gMap = registry.get(appName);
   ....
   gMap.remove(id);
   ```

4. 然后调用了leaseToCancel.cancel();，设置了evictionTimestamp时间。

5. 在recentlyChangedQueue里新增了一条服务实例变更记录，保留3分钟。（用于在客户端进行增量更新的时候进行合并）

6. 调用invalidateCache，让缓存失效，从readWriteCacheMap里全部清理掉。会有定时任务每隔30秒让readOnlyCacheMap和readWriteCacheMap进行同步。这部分逻辑在上一篇文章有分析到。

7. **下次所有的eureka client来拉取增量注册表的时候，就会返回recentlyChangedQueue里的数据，然后在本地进行合并，比对hash值，再决定是否重新拉取全量注册表的逻辑。**

![image-20200322230318802](/img/spring-cloud/image-20200322230318802.png)



这里再一次体现了，无论是服务注册、故障、还是下线了，都会将变更记录放进**recentlyChangedQueue**里，eureka client在30秒的增量更新定时任务里，去合并新的服务列表。readOnlyCacheMap从readWriteCacheMap同步的时间也是30秒。所以服务最长可能60秒才能感知到服务的下线。