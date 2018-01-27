---
title: MongoDB6-分片
date: 2018-01-17 19:52:53
tags: [Mongo]
categories: Mongo
---

# 分片

在Mongodb里面存在另一种集群，就是分片技术,可以满足MongoDB数据量大量增长的需求。

当MongoDB存储海量的数据时，一台机器可能不足以存储数据，也可能不足以提供可接受的读写吞吐量。这时，我们就可以通过在多台机器上分割数据，使得数据库系统能存储和处理更多的数据。


## 为什么使用分片

* 复制所有的写入操作到主节点
* 延迟的敏感数据会在主节点查询
* 单个副本集限制在12个节点
* 当请求量巨大时会出现内存不足。
* 本地磁盘不足
* 垂直扩展价格昂贵


## 分片组件

![](https://docs.mongodb.com/manual/_images/sharded-cluster-production-architecture.bakedsvg.svg)

Sharded Cluster（分片集群）共有3个组件：

1. shard（也可以配置成副本集，确保高可用）
2. query router（查询路由器）
3. config sever（配置服务器，一般会配置成副本集，确保高可用；以前的本本才去的方式使用3台独立的mongod实例）

config server保存了数据的分布情况，哪些数据在哪一个分片中，而query router提供了用户接口对分片进行操作。

![](https://docs.mongodb.com/manual/_images/sharded-cluster-mixed.bakedsvg.svg)

## 分片实战

注意：分片是以集合为目标的

### 本机部署测试

1. 配置服务器：是一个副本集，由3台mongod实例构成
2. mongos路由：两台mongos实例
3. shard节点：两个shard构成，每个shard都是一个副本集（包含了3个mongod实例）

11台机器。

### 启动

配置服务器

1. 不能拥有arbiter
2. 不能拥有delayed member
3. 必须能够build indexes（buildIndexes属性不能为false）

先准备目录：

```bash
➜  mongodb tree sharding 
sharding
└── config_server
    ├── config1
    │   ├── data
    │   └── log
    ├── config2
    │   ├── data
    │   └── log
    └── config3
        ├── data
        └── log
```


#### 启动配置服务器

```bash
mongod --configsvr --replSet mytest --port 28010 --dbpath sharding/config_server/config1/data --logpath sharding/config_server/config1/log/log.log --logappend --fork
mongod --configsvr --replSet mytest --port 28011 --dbpath sharding/config_server/config2/data --logpath sharding/config_server/config2/log/log.log --logappend --fork
mongod --configsvr --replSet mytest --port 28012 --dbpath sharding/config_server/config3/data --logpath sharding/config_server/config3/log/log.log --logappend --fork
➜  mongodb mongo localhost:28010
> myconfig = {_id:'mytest', configsvr:true, members:[{_id:0,host:'localhost:28010'},{_id:1,host:'localhost:28011'},{_id:2,host:'localhost:28012'}]};
> rs.initiate(myconfig);
> rs.status();
```

#### 启动查询路由器

```bash
mongos --configdb mytest/localhost:28010,localhost:28011,localhost:28012 --port 29010
mongos --configdb mytest/localhost:28010,localhost:28011,localhost:28012 --port 29011
```

#### 分片副本集

```bash
── shard1
│   ├── mongod1
│   │   └── data
│   ├── mongod2
│   │   └── data
│   └── mongod3
│       └── data
└── shard2
    ├── mongod4
    │   └── data
    ├── mongod5
    │   └── data
    └── mongod6
        └── data
```

启动：

```bash
mongod --replSet shard1 --port 40001 --dbpath sharding/shard1/mongod1/data
mongod --replSet shard1 --port 40002 --dbpath sharding/shard1/mongod2/data
mongod --replSet shard1 --port 40003 --dbpath sharding/shard1/mongod3/data
mongod --replSet shard2 --port 50001 --dbpath sharding/shard2/mongod4/data
mongod --replSet shard2 --port 50002 --dbpath sharding/shard2/mongod5/data
mongod --replSet shard2 --port 50003 --dbpath sharding/shard2/mongod6/data

mongo localhost:40001

> myconfig = {_id:'shard1', members:[{_id:0,host:'localhost:40001'},{_id:1,host:'localhost:40002'},{_id:2,host:'localhost:40003'}]};
> rs.initiate(myconfig);

mongo localhost:50001

> myconfig = {_id:'shard2', members:[{_id:0,host:'localhost:50001'},{_id:1,host:'localhost:50002'},{_id:2,host:'localhost:50003'}]};
> rs.initiate(myconfig);
```

#### 配置分片

添加分片的时候，只写副本集其中一个mongod实例，它也能自动找到剩余的

```bash
mongo localhost:29010
mongos> sh.addShard('shard1/localhost:40001,localhost:40002,localhost:40003');
mongos> sh.addShard('shard2/localhost:50001'); 
```
下面开始设置分片，先设置可以分片的数据库，然后设置要分片的集合，需要设置索引字段，索引方式为`hashed`，注意要先切换到admin数据库。

```bash
mongos> use admin;
mongos> sh.enableSharding('mytest');
mongos> sh.shardCollection('mytest.student',{_id:'hashed'});
```

接下来添加一些数据，然后可以看到分片的数据分片状态，我们也可以单独连接到某一个shard的副本集查看数据分布情况。

```bash
mongos> for(var i = 0;i < 100;++i){db.student.insert({username:'hello' + i})};
mongos> db.printShardingStatus();
--- Sharding Status --- 
  sharding version: {
  	"_id" : 1,
  	"minCompatibleVersion" : 5,
  	"currentVersion" : 6,
  	"clusterId" : ObjectId("5a60594bd9fbe1b3ebca714e")
  }
  shards:
        {  "_id" : "shard1",  "host" : "shard1/localhost:40001,localhost:40002,localhost:40003",  "state" : 1 }
        {  "_id" : "shard2",  "host" : "shard2/localhost:50001,localhost:50002,localhost:50003",  "state" : 1 }
  active mongoses:
        "3.6.1" : 2
  autosplit:
        Currently enabled: yes
  balancer:
        Currently enabled:  yes
        Currently running:  no
        Failed balancer rounds in last 5 attempts:  0
        Migration Results for the last 24 hours: 
                No recent migrations
  databases:
        {  "_id" : "config",  "primary" : "config",  "partitioned" : true }
                config.system.sessions
                        shard key: { "_id" : 1 }
                        unique: false
                        balancing: true
                        chunks:
                                shard1	1
                        { "_id" : { "$minKey" : 1 } } -->> { "_id" : { "$maxKey" : 1 } } on : shard1 Timestamp(1, 0) 
        {  "_id" : "mytest",  "primary" : "shard1",  "partitioned" : true }
                mytest.student
                        shard key: { "_id" : "hashed" }
                        unique: false
                        balancing: true
                        chunks:
                                shard1	2
                        { "_id" : { "$minKey" : 1 } } -->> { "_id" : NumberLong(0) } on : shard1 Timestamp(1, 0) 
                        { "_id" : NumberLong(0) } -->> { "_id" : { "$maxKey" : 1 } } on : shard1 Timestamp(1, 1) 
        {  "_id" : "test",  "primary" : "shard1",  "partitioned" : false }
```
