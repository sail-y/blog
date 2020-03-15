title: mybatis-memcached框架配置
date: 2015-02-06 23:22:37
tags: [mybatis,memcached]
categories: Java
---
官方放出了mybatis和memcached的整合包，先附上官方文档地址
http://mybatis.github.io/memcached-cache/
文档很简洁，事实证明使用起来也很简单
memcached的安装我这里就不再讲了，网上很容易找到
在项目中引入
```xml
<dependency>
    <groupId>org.mybatis.caches</groupId>
    <artifactId>mybatis-memcached</artifactId>
    <version>1.0.0</version>
</dependency>
```
<!--more-->
然后在想使用的mapper中加入
```xml
<mapper namespace="org.acme.FooMapper">
  <cache type="org.mybatis.caches.memcached.MemcachedCache" />
  ...
</mapper>
```
就可以用了

再建一个memcached.properties，对他进行配置
我简单测试了一下发现它可以配置多个服务器，用逗号分隔，经测试如果某一台挂掉，他会选择正常的那台
如果2台都挂掉，就会报错,估计我们还是希望在memcached服务器挂掉后从数据库读取数据，不知道大家有什么好的实现方式或者思路吗
```
org.mybatis.caches.memcached.servers=172.29.33.201:11211,localhost:11211
org.mybatis.caches.memcached.expiration=30 
org.mybatis.caches.memcached.asyncget=false 
```