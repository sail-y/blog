---
title: ElasticSearch03-集群和架构讲解
tags: [ElasticSearch]
date: 2018-06-20 08:57:00
categories: ElasticSearch
---

此为龙果学院课程学习笔记，记录以后翻看

## ES基础分布式架构

### Elasticsearch对复杂分布式机制的透明隐藏特性

Elasticsearch是一套分布式的系统，分布式就是为了应对大数据量。它隐藏了复杂的分布式机制，其中有几个很重要的机制和概念。

* 分片机制（之前将一些document插入到es集群中去，不用关心数据怎么进行分片的，数据到哪个shard中去，这是ES自动完成的）
<!--more-->
* cluster discovery（集群发现机制：在第一篇文章中做那个集群status从yellow转green的实验里，直接启动了第二个es进程，那个进程就作为一个node自动就发现了集群，并且加入了进去，还接受了部分数据）

* shard负载均衡（举例，假设现在有3个节点，总共有25个shard要分配到3个节点上去，es会自动进行均匀分配，以保持每个节点的均衡的读写负载请求）

总结下来就是：分片副本，请求路由，集群扩容，分片重分配
	

	
### Elasticsearch的垂直扩容与水平扩容

* 垂直扩容：采购更强大的服务器，成本非常高昂，而且会有瓶颈，假设世界上最强大的服务器容量就是10T，但是当你的总数据量达到5000T的时候，你要采购多少台最强大的服务器？

* 水平扩容：这是业界经常采用的方案，采购越来越多的普通服务器，虽然性能比较一般，但是很多普通服务器组织在一起，就能构成强大的计算和存储能力。

例如：

普通服务器：1T，1万一台，需要100万
强大服务器：10T，50万一台，需要500万

一般是采用水平扩容的方式


### 增减或减少节点时的数据rebalance

每当增加或者减少节点的时候，ES会自动的负载均衡保持每个节点的shard负载均衡，保证每台服务器的分片数量均衡。

### master节点作用

ES集群都有一个master节点，用来管理ES集群的元数据：比如索引的创建和删除，维护索引的元数据；节点的增加和移除等等。

默认情况下会自动的选出一台节点作为master节点，master不承载请求，所以没有单点瓶颈。

### 节点对等的分布式架构

所有的节点都可以接受请求，也可以存储数据，如果数据不在自己的节点上，就去别的节点将数据找到然后返回给客户端。

1. 节点对等，每个节点都能接收所有的请求
2. 自动请求路由
3. 响应收集



![ES的基础分布式架构](/img/es/03/ES的基础分布式架构.png)



## shard&replica机制再次梳理

1. 一个index包含一个或者多个shard
2. 每个shard都是一个最小工作单元，它承载部分数据，每一个都是lucene实例，具有完整的建立索引和处理请求的能力。
3. 增减节点时，shard会自动在nodes中负载均衡
4. primary shard和replica shard，每个document肯定只存在于某一个primary shard以及其对应的replica shard中，不可能存在于多个primary shard。
5. replica shard是primary shard的副本，负责容错，以及承担读请求负载。
6. primary shard的数量在创建索引的时候就固定了，replica shard的数量可以随时修改。
7. primary shard的默认数量是5，replica默认是1，默认有10个shard，5个primary shard，5个replica shard
8. primary shard不能和自己的replica shard放在同一个节点上（否则节点宕机，primary shard和副本都丢失，起不到容错的作用），但是可以和其他primary shard的replica shard放在同一个节点上。

## 单node环境下创建index是什么样子的

```
PUT /test_index
{
   "settings" : {
      "number_of_shards" : 3,
      "number_of_replicas" : 1
   }
}
```

1. 单node环境下，创建一个index，它有3个primary shard，3个replica shard
2. 集群status是yellow
	
	![单机集群状态](/img/es/03/单机集群状态.png)
	
3. 这个时候，只会将3个primary shard分配到仅有的一个node上去，另外3个replica shard是无法分配的（primary shard不能和自己的replica shard放在同一个节点上，集群状态是yellow的原因）
4. 集群可以正常工作，但是一旦出现节点宕机，数据全部丢失，而且集群不可用，无法承接任何请求



## 2个node环境下replica shard是如何分配的


1. replica shard分配：5个primary shard，5个replica shard，2个node
2. primary和replica的数据是同步的
3. primary/replica都可能会收到读请求

![2个节点的分片和副本分配](/img/es/03/2个节点的分片和副本分配.png)

上面有灰色边框的是primary shard

## 横向扩容的过程，如何超出扩容极限，以及如何提升容错性


1. 如果本身是2个节点，扩容1个节点后primary&replica会自动负载均衡。6个shard，3 primary，3 replica会平均的被分配3个节点中。
2. 扩容后每个node有更少的shard，意味着IO/CPU/Memory资源给每个shard分配更多，每个shard性能更好。
3. 扩容的极限是什么？如果是6个shard（3 primary，3 replica），那么最多扩容到6台机器，每个shard可以占用单台服务器的所有资源，这个时候性能最好。
4. 如果要超出扩容极限，那就动态修改replica数量，9个shard（3primary，6 replica），扩容到9台机器，比3台机器时，拥有3倍的读吞吐量。
5. 在3台机器的情况下，9个shard（3 primary，6 replica），虽然资源更少，但是容错性更好，最多容纳2台机器宕机，如果是配置的6个shard那么只能容纳1台机器宕机。
6. 这里的这些知识点综合起来看，一方面是说扩容的原理，怎么扩容，怎么提升系统整体吞吐量；另一方面要考虑到系统的容错性，怎么保证提高容错性，让尽可能多的服务器宕机，保证数据不丢失。

## Elasticsearch容错机制：master选举，replica容错，数据恢复


假设我们一共有9 shard，3个node。

1. 如果master node宕机了，那么ES集群会自动进行master选举，自动选举另外一个node成为新的master，这个时候集群状态会变成red。
2. replica容错：新的master将replica shard提升为primary shard，集群状态变成yellow。
3. 然后我们再重启宕机的node，master会将确实的副本复制到该node，会使用原有的shard并同步宕机后的修改，然后集群变成green。



