---
title: MongoDB5-副本集
date: 2018-01-07 18:47:46
tags: [Mongo]
categories: Mongo
---


# 副本集

MongoDB复制是将数据同步在多个服务器的过程。

复制提供了数据的冗余备份，并在多个服务器上存储数据副本，提高了数据的可用性， 并可以保证数据的安全性。

复制还允许您从硬件故障和服务中断中恢复数据。

## 什么是复制?

* 保障数据的安全性
* 数据高可用性 (24*7)
* 灾难恢复
* 无需停机维护（如备份，重建索引，压缩）
* 分布式读取数据

<!--more-->

## MongoDB复制原理

mongodb的复制至少需要两个节点。其中一个是主节点，负责处理客户端请求，其余的都是从节点，负责复制主节点上的数据。

mongodb各个节点常见的搭配方式为：一主一从、一主多从。

主节点记录在其上的所有操作oplog，从节点定期轮询主节点获取这些操作，然后对自己的数据副本执行这些操作，从而保证从节点的数据与主节点一致。

MongoDB复制结构图如下所示：

![](https://docs.mongodb.com/manual/_images/replica-set-read-write-operations-primary.bakedsvg.svg)

![](https://docs.mongodb.com/manual/_images/replica-set-primary-with-two-secondaries.bakedsvg.svg)

以上结构图中，客户端从主节点读取数据，在客户端写入数据到主节点时， 主节点与从节点进行数据交互保障数据的一致性。

## 副本集特征：

* N个节点的集群
* 任何节点可作为主节点
* 所有写入操作都在主节点上
* 自动故障转移
* 自动恢复


## MongoDB副本集配置

1. MongoDB数据文件存储路径
2. MongoDB日志文件存储路径
3. MongoBD key文件存储路径
4. MongoDB实例监听端口（28010/28011/28012）



先把要存储的目录和文件先建一下，key0，key1，key2的文件内容是一样的。

```bash
.
├── data
│   ├── data0
│   ├── data1
│   └── data2
├── key
│   ├── key0
│   │   └── key0
│   ├── key1
│   │   └── key1
│   └── key2
│       └── key2
└── log
    ├── log0
    │   └── log0.log
    ├── log1
    │   └── log1.log
    └── log2
        └── log2.log
```

启动3个mongod实例的副本集

```
mongod --replSet myset --keyFile key/key0/key0 --port 28010 --dbpath data/data0 --logpath log/log0/log0.log --logappend
mongod --replSet myset --keyFile key/key1/key1 --port 28011 --dbpath data/data1 --logpath log/log1/log1.log --logappend
mongod --replSet myset --keyFile key/key2/key2 --port 28012 --dbpath data/data2 --logpath log/log2/log2.log --logappend
```

启动可能会有一个错误：

> mongodb/key/key0/key0 are too open

查了一下说是key的文件权限太大了，`chmod 700 key/key0/key0`改一下权限再启动就好了。

现在这3个mongod的实例还没有通信，还没有在一个副本集中，还需要用客户端连接到其中一个实例做一些配置。

```js
mongo --port 28010
> config_myset={_id:'bafeite', members:[{_id:0, host:'localhost:28010'},{_id:1, host:'localhost:28011'},{_id:2, host:'localhost:28012'}]};
{
	"_id" : "bafeite",
	"members" : [
		{
			"_id" : 0,
			"host" : "localhost:28010"
		},
		{
			"_id" : 1,
			"host" : "localhost:28011"
		},
		{
			"_id" : 2,
			"host" : "localhost:28012"
		}
	]
}
> rs.initiate(config_myset);
{
	"ok" : 0,
	"errmsg" : "Attempting to initiate a replica set with name bafeite, but command line reports myset; rejecting",
	"code" : 93,
	"codeName" : "InvalidReplicaSetConfig"
}
```

出错了，说准备初始化一个bafeite的副本集，但是命令行启动的时候是`myset`，所以拒绝。

```js
> config_myset={_id:'myset', members:[{_id:0, host:'localhost:28010'},{_id:1, host:'localhost:28011'},{_id:2, host:'localhost:28012'}]};
{
	"_id" : "myset",
	"members" : [
		{
			"_id" : 0,
			"host" : "localhost:28010"
		},
		{
			"_id" : 1,
			"host" : "localhost:28011"
		},
		{
			"_id" : 2,
			"host" : "localhost:28012"
		}
	]
}
> rs.initiate(config_myset);
{
	"ok" : 1,
	"operationTime" : Timestamp(1515328983, 1),
	"$clusterTime" : {
		"clusterTime" : Timestamp(1515328983, 1),
		"signature" : {
			"hash" : BinData(0,"AAAAAAAAAAAAAAAAAAAAAAAAAAA="),
			"keyId" : NumberLong(0)
		}
	}
}
> rs.isMaster();
{
	"hosts" : [
		"localhost:28010",
		"localhost:28011",
		"localhost:28012"
	],
	"setName" : "myset",
	"setVersion" : 1,
	"ismaster" : true,
	"secondary" : false,
	"primary" : "localhost:28010",
	"me" : "localhost:28010",
	"electionId" : ObjectId("7fffffff0000000000000001"),
	"lastWrite" : {
		"opTime" : {
			"ts" : Timestamp(1515329025, 1),
			"t" : NumberLong(1)
		},
		"lastWriteDate" : ISODate("2018-01-07T12:43:45Z"),
		"majorityOpTime" : {
			"ts" : Timestamp(1515329025, 1),
			"t" : NumberLong(1)
		},
		"majorityWriteDate" : ISODate("2018-01-07T12:43:45Z")
	},
	"maxBsonObjectSize" : 16777216,
	"maxMessageSizeBytes" : 48000000,
	"maxWriteBatchSize" : 100000,
	"localTime" : ISODate("2018-01-07T12:43:49.070Z"),
	"logicalSessionTimeoutMinutes" : 30,
	"minWireVersion" : 0,
	"maxWireVersion" : 6,
	"readOnly" : false,
	"ok" : 1,
	"operationTime" : Timestamp(1515329025, 1),
	"$clusterTime" : {
		"clusterTime" : Timestamp(1515329025, 1),
		"signature" : {
			"hash" : BinData(0,"PnIvjYWgF8Z6qEIViYwQHnBs/M8="),
			"keyId" : NumberLong("6508288476205547521")
		}
	}
}
> rs.status();
{
	"set" : "myset",
	"date" : ISODate("2018-01-07T12:50:20.742Z"),
	"myState" : 1,
	"term" : NumberLong(1),
	"heartbeatIntervalMillis" : NumberLong(2000),
	"optimes" : {
		"lastCommittedOpTime" : {
			"ts" : Timestamp(1515329415, 1),
			"t" : NumberLong(1)
		},
		"readConcernMajorityOpTime" : {
			"ts" : Timestamp(1515329415, 1),
			"t" : NumberLong(1)
		},
		"appliedOpTime" : {
			"ts" : Timestamp(1515329415, 1),
			"t" : NumberLong(1)
		},
		"durableOpTime" : {
			"ts" : Timestamp(1515329415, 1),
			"t" : NumberLong(1)
		}
	},
	"members" : [
		{
			"_id" : 0,
			"name" : "localhost:28010",
			"health" : 1,
			"state" : 1,
			"stateStr" : "PRIMARY",
			"uptime" : 2022,
			"optime" : {
				"ts" : Timestamp(1515329415, 1),
				"t" : NumberLong(1)
			},
			"optimeDate" : ISODate("2018-01-07T12:50:15Z"),
			"electionTime" : Timestamp(1515328993, 1),
			"electionDate" : ISODate("2018-01-07T12:43:13Z"),
			"configVersion" : 1,
			"self" : true
		},
		{
			"_id" : 1,
			"name" : "localhost:28011",
			"health" : 1,
			"state" : 2,
			"stateStr" : "SECONDARY",
			"uptime" : 437,
			"optime" : {
				"ts" : Timestamp(1515329415, 1),
				"t" : NumberLong(1)
			},
			"optimeDurable" : {
				"ts" : Timestamp(1515329415, 1),
				"t" : NumberLong(1)
			},
			"optimeDate" : ISODate("2018-01-07T12:50:15Z"),
			"optimeDurableDate" : ISODate("2018-01-07T12:50:15Z"),
			"lastHeartbeat" : ISODate("2018-01-07T12:50:20.450Z"),
			"lastHeartbeatRecv" : ISODate("2018-01-07T12:50:20.416Z"),
			"pingMs" : NumberLong(0),
			"syncingTo" : "localhost:28010",
			"configVersion" : 1
		},
		{
			"_id" : 2,
			"name" : "localhost:28012",
			"health" : 1,
			"state" : 2,
			"stateStr" : "SECONDARY",
			"uptime" : 437,
			"optime" : {
				"ts" : Timestamp(1515329415, 1),
				"t" : NumberLong(1)
			},
			"optimeDurable" : {
				"ts" : Timestamp(1515329415, 1),
				"t" : NumberLong(1)
			},
			"optimeDate" : ISODate("2018-01-07T12:50:15Z"),
			"optimeDurableDate" : ISODate("2018-01-07T12:50:15Z"),
			"lastHeartbeat" : ISODate("2018-01-07T12:50:20.450Z"),
			"lastHeartbeatRecv" : ISODate("2018-01-07T12:50:20.367Z"),
			"pingMs" : NumberLong(0),
			"syncingTo" : "localhost:28010",
			"configVersion" : 1
		}
	],
	"ok" : 1,
	"operationTime" : Timestamp(1515329415, 1),
	"$clusterTime" : {
		"clusterTime" : Timestamp(1515329415, 1),
		"signature" : {
			"hash" : BinData(0,"ADhHuvIZC6jbKdSh8pH00VK+6ic="),
			"keyId" : NumberLong("6508288476205547521")
		}
	}
}
```

members就是副本集里面的mongod实例，stateStr表示了实例是Primary或者Secondary，lastHeartbeat就是上次心跳检测的时间。

## 插入数据

```js
> db.article.save({title:'MongoDB应用开发实战', author:'zhangsan', creationDate:new Date()});
WriteResult({
	"writeError" : {
		"code" : 13,
		"errmsg" : "not authorized on mytest to execute command { insert: \"article\", ordered: true, $clusterTime: { clusterTime: Timestamp(1515329415, 1), signature: { hash: BinData(0, 003847BAF2190BA8DB29D4A1F291F4D152BEEA27), keyId: 6508288476205547521 } }, $db: \"mytest\" }"
	}
})
```

得到一个错误，查了下是因为指定了keyFile以后，mongodb默认就会加上`--auth`启动，为了简化操作，先把keyFile参数去掉重启一下吧。

```js
~ mongo --port 28010
use mytest;
myset:PRIMARY> db.article.save({title:'MongoDB应用开发实战', author:'zhangsan', creationDate:new Date()});
```

现在去连接另外一个mongod实例，看看这个数据在不在。

```js
mongo --port 28011
use mytest;
show dbs;
myset:SECONDARY> show dbs;
2018-01-07T21:41:21.587+0800 E QUERY    [thread1] Error: listDatabases failed:{
	"operationTime" : Timestamp(1515332475, 1),
	"ok" : 0,
	"errmsg" : "not master and slaveOk=false",
	"code" : 13435,
	"codeName" : "NotMasterNoSlaveOk",
	"$clusterTime" : {
		"clusterTime" : Timestamp(1515332475, 1),
		"signature" : {
			"hash" : BinData(0,"AAAAAAAAAAAAAAAAAAAAAAAAAAA="),
			"keyId" : NumberLong(0)
		}
	}
}
```

执行不了，报错了，是因为从实例需要设置一下才能查询。

```js
myset:SECONDARY> db.getMongo().setSlaveOk();
myset:SECONDARY> show dbs;
admin   0.000GB
config  0.000GB
local   0.000GB
mytest  0.000GB
test    0.000GB
myset:SECONDARY> db.article.find();
{ "_id" : ObjectId("5a52221989c0d47f8598d0ad"), "title" : "MongoDB应用开发实战", "author" : "zhangsan", "creationDate" : ISODate("2018-01-07T13:35:21.111Z") }
```

## 添加副本集

`rs.add('host:port')`

## 删除副本集

`rs.remove('host:port')`

## 重新配置

```js
var config = rs.config();

rs....

rs.reconfig(config);
```

# 监控-mongostat

**mongodb**提供了一个mongostat命令用于监控mongodb服务器。

```bash
➜  ~ mongostat --help
Usage:
  mongostat <options> <polling interval in seconds>

Monitor basic MongoDB server statistics.

See http://docs.mongodb.org/manual/reference/program/mongostat/ for more information.
```

监控副本集的命令：

```bash
➜  ~ mongostat --host=myset/localhost:28010,localhost:28011,localhost:28012
           host insert query update delete getmore command dirty used flushes vsize   res qrw arw net_in net_out conn   set repl                time
localhost:28010     *0    *0     *0     *0       0     3|0  0.0% 0.0%       0 4.94G 39.0M 0|0 1|0   437b   53.4k    3 myset  SEC Jan 16 12:18:50.342
localhost:28011     *0    *0     *0     *0       0     3|0  0.0% 0.0%       0 4.97G 39.0M 0|0 1|0   432b   52.8k    5 myset  PRI Jan 16 12:18:50.342
```

# 关于副本集的原理分析：

1. 副本集有且只有一台机器是primary，primary与secondary之间的数据复制是异步进行的，并且通过oplog进行。
2. 副本集中的机器数最好为奇数。
3. Primary机器接收所有的写操作（无法改变的），我们可以配置read preference，使得读操作可以发生在secondary机器上。如果读操作发生在primary机器上，那么机器就是强一致性的；
4. 副本集中最多有50台机器，之前的版本最多有12台机器。如果超过了50台，那么只能使用Master-Slave方式。不过如果使用Master-Slave方式，那么就失去了自动化的failover机制。
5. Arbiter机器（仲裁机器），它本身并不存放数据库数据，仅提供选举功能。
6. 不要将arbiter机器放在primary或是secondary机器上。
7. 对于secondary机器，可以进行如下配置：
	
	1. 禁止某台secondary机器成为primary机器，priority为0。
	2. 禁止客户端读取某台secondary机器的数据，隐藏成员。
	3. 仅记录历史快照的secondary，延迟成员。比如说延迟一小时
8. 最常见的secondary机器依然是进行数据异步复制与保持系统高可用的形式。
9. 副本集中最多有50台机器，其中**具有投票功能**的机器数量最多是7台。
10. Priority为0的机器：无法成为primary。不能触发一个选举
11. 关于MongoDB的读写分离：		
	1. 如果进行读写分离，那么要注意到读会有延迟
	2. secondary机器要通过oplog异步复制primary机器的数据，因此从整体来看，primary与secondary机器的读速度是大体相当的。
	3. 默认情况下，MongoDB的读写都是在primary上进行的。
12. 关于Read preference：		
	1. Primary（默认值）
	2. primaryPreferred
	3. secondary
	4. secondaryPreferred
	5. nearest（网络延迟最少的）
13. 关于延迟成员（delayed member）		
	1. 延迟成员的priority必须为0，表示它无法成为primary。
	2. 延迟成员也是隐藏成员，应用是无法通过延迟成员查询数据的。
	3. 可以对primary的选举进行投票。
14. 请确保副本集中成员的个数为奇数，如果是偶数的话，请添加一个arbiter成员。
15. 关于MongoDB的投票与故障恢复：		
	1. MongoDB投票要求投票时系统中可用的机器数量要是全体副本集成员个数的大多数。
	2. 如果副本集中有3台机器，那么有几台机器宕掉还可以确保MongoDB副本集可以正常使用？2台。
	3. 如果副本集中有4台机器，那么有几台机器宕掉还可以确保MongoDB副本集可以正常使用？3台。
	4. 如果副本集中有5台机器，那么有几台机器宕掉还可以确保MongoDB副本集可以正常使用？3台。
	5. 如果副本集中有6台机器，那么有几台机器宕掉还可以确保MongoDB副本集可以正常使用？4台。
	6. 如果副本集中有7台机器，那么有几台机器宕掉还可以确保MongoDB副本集可以正常使用？4台。
16. 向副本集中添加成员并不总是会确保系统的故障恢复能力，不过这样做可以实现一些额外的功：备份、统计报表等。




