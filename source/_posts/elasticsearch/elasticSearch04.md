---
title: ElasticSearch04-Document、Index详解和操作以及并发问题
tags: [ElasticSearch]
date: 2018-08-19 17:40:30
categories: ElasticSearch
---

此为龙果学院课程学习笔记，记录以后翻看

# Document元数据

## _index元数据

1. 代表一个document存放在哪个index中。
2. 类似的数据放在一个索引，非类似的数据放不同索引：product index（包含了所有的商品），sales index（包含了所有的商品销售数据），inventory index（包含了所有库存相关的数据）。如果你把比如product，sales，human resource（employee），全都放在一个大的index里面，比如company index，就不合适。
<!--more-->
3. index中包含了很多类似的document：类似是什么意思，其实指的就是这些document的fields很大一部分是相同的，比如你放了3个document，每个document的fields都完全不一样，这就不是类似了，就不太适合放到一个index里面去了。
4. 索引名称必须是小写的，不能用下划线开头，不能包含逗号，例如：product，website，blog


## _type元数据


1. 代表document属于index中的哪个类别（type）
2. 一个索引通常会划分为多个type，逻辑上对index中有些许不同的几类数据进行分类：因为一批相同的数据，可能有很多相同的fields，但是还是可能会有一些轻微的不同，可能会有少数fields是不一样的，举个例子，比如商品，可能划分为电子商品，生鲜商品，日化商品，等等。
3. type名称可以是大写或者小写，但是同时不能用下划线开头，不能包含逗号

## _id元数据

1. 代表document的唯一标识，与index和type一起，可以唯一标识和定位一个document
2. 我们可以手动指定document的id（put /index/type/id），也可以不指定，由es自动为我们创建一个id

### 手动指定document id

#### 根据应用情况看是否满足手动指定document id的前提

一般来说，是从某些其他的系统中导入一些数据到es时，会采取这种方式，就是使用系统中已有数据的唯一标识，作为es中document的id。

>举个例子，我们现在在开发一个电商网站，做搜索功能，或者是OA系统的做员工检索功能。这个时候，数据首先会在网站系统或者IT系统内部的数据库中，会先有一份，此时就肯定会有一个数据库的primary key（自增长，UUID，或者是业务编号）。如果将数据导入到es中，此时就比较适合采用数据在数据库中已有的primary key。

但是如果是在做一个系统，这个系统主要的数据存储就是es，也就是数据产生出来以后，可能就没有id，直接就存es。那么这个时候，可能就不太适合手动指定document id的形式了，因为你也不知道id应该是什么，此时可以采取下面的让es自动生成id的方式。

#### put /index/type/id

手动指定ID的方式

```json
PUT /test_index/test_type/2
{
  "test_content": "my test"
}
```


### 自动生成document id

#### post /index/type

后面不加ID，ES会为我们自动生成ID

```json
POST /test_index/test_type
{
  "test_content": "my test"
} 
```

output:

```json
{
  "_index": "test_index",
  "_type": "test_type",
  "_id": "AVp4RN0bhjxldOOnBxaE",
  "_version": 1,
  "result": "created",
  "_shards": {
    "total": 2,
    "successful": 1,
    "failed": 0
  },
  "created": true
}
```

#### GUID

自动生成的id，它的长度为20个字符，是URL安全的，基于base64编码。基于GUID的算法，分布式系统并行生成时不可能会发生冲突。

## _source元数据

```json
PUT /test_index/test_type/1
{
  "test_field1": "test field1",
  "test_field2": "test field2"
}

GET /test_index/test_type/1

{
  "_index": "test_index",
  "_type": "test_type",
  "_id": "1",
  "_version": 2,
  "found": true,
  "_source": {
    "test_field1": "test field1",
    "test_field2": "test field2"
  }
}
```

_source元数据：在创建一个document的时候，传入的json传在默认情况下，在get的时候，会原封不动的给我们返回回来。

如果要定制返回的结果，可以加`_srouce`参数，指定返回哪些字段，多个字段用逗号分隔。

```json
GET /test_index/test_type/1?_source=test_field1,test_field2

{
  "_index": "test_index",
  "_type": "test_type",
  "_id": "1",
  "_version": 2,
  "found": true,
  "_source": {
    "test_field2": "test field2"
  }
}
```

# Document的创建、替换和删除

## document的全量替换

1. 语法与创建文档是一样的，如果document id不存在，那么就是创建；如果document id已经存在，那么就是全量替换操作，替换document的json串内容。
2. 其实document是不可变的，如果要修改document的内容，第一种方式就是全量替换，直接对document重新建立索引，替换里面所有的内容。
3. es会将老的document标记为deleted，然后新增我们给定的一个document，当我们创建越来越多的document的时候，es会在适当的时机在后台自动删除标记为deleted的document。

## document的强制创建

创建文档与全量替换的语法是一样的，有时我们只是想新建文档，不想替换文档，如果强制进行创建呢？

`PUT /index/type/id?op_type=create，PUT /index/type/id/_create`

但是强制创建一个已经存在的Document会得到一个冲突的错误。

```json
{
  "error": {
    "root_cause": [
      {
        "type": "version_conflict_engine_exception",
        "reason": "[test_type][1]: version conflict, document already exists (current version [1])",
        "index_uuid": "arBg_MfmRWCMSKQHqGIrDw",
        "shard": "3",
        "index": "test_index1"
      }
    ],
    "type": "version_conflict_engine_exception",
    "reason": "[test_type][1]: version conflict, document already exists (current version [1])",
    "index_uuid": "arBg_MfmRWCMSKQHqGIrDw",
    "shard": "3",
    "index": "test_index1"
  },
  "status": 409
}
```

## document的删除

`DELETE /index/type/id`

ES不会立即物理删除，只会将其标记为deleted，当数据越来越多的时候，在后台自动删除。


# Elasticsearch并发冲突问题

多个线程去同时访问es中的一份数据，然后各自去修改之后更新到es，由于线程的先后顺序不同，可能会导致后续的修改覆盖掉之前的修改，显然一些场景下我们是不允许发生这种并发冲突的问题，例如电商库存的修改等

## 悲观锁和乐观锁并发控制方案

数据库管理系统（DBMS）中的并发控制的任务是确保在多个事务同时存取数据库中同一数据时不破坏事务的隔离性和统一性以及数据库的统一性。

乐观并发控制(乐观锁)和悲观并发控制（悲观锁）是并发控制主要采用的技术手段。 
不要把他们和数据中提供的锁机制（行锁、表锁、排他锁、共享锁）混为一谈。其实，在DBMS中，悲观锁正是利用数据库本身提供的锁机制来实现的。

### 悲观锁

* 如何理解悲观锁 

	它指的是对数据被外界（包括本系统当前的其他事务，以及来自外部系统的事务处理）修改持保守态度(悲观)，因此，在整个数据处理过程中，将数据处于锁定状态。 
	在对任意记录进行修改前，先尝试为该记录加上排他锁（exclusive locking）。 
	如果加锁失败，说明该记录正在被修改，那么当前查询可能要等待或者抛出异常。 具体响应方式由开发者根据实际需要决定。 
	如果成功加锁，那么就可以对记录做修改，事务完成后就会解锁了。 
	其间如果有其他对该记录做修改或加排他锁的操作，都会等待我们解锁或直接抛出异常。
* 优点与不足 
	悲观锁的优点：方便，直接加锁，对应用程序来说透明，不需要额外的操作； 
	悲观锁的缺点：并发能力很低，同一时间只能有一条线程操作数据。
### 乐观锁

* 如何理解乐观锁 
	它假设多用户并发的事务在处理时不会彼此互相影响，各事务能够在不产生锁的情况下处理各自影响的那部分数据。在提交数据更新之前，每个事务会先检查在该事务读取数据后，有没有其他事务又修改了该数据。如果其他事务有更新的话，正在提交的事务会进行回滚。
* 与悲观锁区别 
	相对于悲观锁，在对数据库进行处理的时候，乐观锁并不会使用数据库提供的锁机制。一般的实现乐观锁的方式就是记录数据版本。 
	**数据版本**是为数据增加的一个版本标识。当读取数据时，将版本标识的值一同读出，数据每更新一次，同时对版本标识进行更新。当我们提交更新的时候，判断数据库表对应记录的当前版本信息与第一次取出来的版本标识进行比对，如果数据库表当前版本号与第一次取出来的版本标识值相等，则予以更新，否则认为是过期数据。 
	实现数据版本有两种方式，第一种是使用版本号，第二种是使用时间戳。
* 优点与不足 
	乐观锁的优点：并发能力很高，不给数据加锁，可以进行大量线程并发操作； 
	乐观锁的缺点：麻烦，每次更新的时候都要先比对版本号，然后可能需要重新加载数据，再次修改，在写；这个过程可能要重复好几次。

## 基于_version字段进行乐观锁并发控制

### _version元数据

```json
PUT /test_index/test_type/6
{
  "test_field": "test test"
}

{
  "_index": "test_index",
  "_type": "test_type",
  "_id": "6",
  "_version": 1,
  "result": "created",
  "_shards": {
    "total": 2,
    "successful": 1,
    "failed": 0
  },
  "created": true
}
```

第一次创建一个document的时候，它的\_version内部版本号就是1；以后，每次对这个document执行修改或者删除操作，都会对这个\_version版本号自动加1；哪怕是删除，也会对这条数据的版本号加1

```json
{
  "found": true,
  "_index": "test_index",
  "_type": "test_type",
  "_id": "6",
  "_version": 4,
  "result": "deleted",
  "_shards": {
    "total": 2,
    "successful": 1,
    "failed": 0
  }
}
```

我们会发现，在删除一个document之后，可以从一个侧面证明，它不是立即物理删除掉的，因为它的一些版本号等信息还是保留着的。先删除一条document，再重新创建这条document，其实会在delete version基础之上，再把version号加1。


>ES内部很多类似于副本集的同步请求，都是多线程异步的，也就意味着多个修改请求之间是乱序的，所以ES内部也是采用了乐观锁的方案，基于version版本号去进行并发控制。



## 并发控制方案

### 上机动手实战演练基于_version进行乐观锁并发控制

1、先模拟一条数据

```json
PUT /test_index/test_type/7
{
  "test_field": "test test"
}
```

2、模拟两个客户端，都获取到了同一条数据（开2个kibana的网页）

```json
GET test_index/test_type/7

{
  "_index": "test_index",
  "_type": "test_type",
  "_id": "7",
  "_version": 1,
  "found": true,
  "_source": {
    "test_field": "test test"
  }
}
```

3、其中一个客户端先更新了数据

更新时带上了数据的版本号，确保ES中数据的版本号跟客户端的版本号是相同的才能修改。

```json
PUT /test_index/test_type/7?version=1 
{
  "test_field": "test client 1"
}

{
  "_index": "test_index",
  "_type": "test_type",
  "_id": "7",
  "_version": 2,
  "result": "updated",
  "_shards": {
    "total": 2,
    "successful": 1,
    "failed": 0
  },
  "created": false
}
```

4、另外一个客户端尝试基于version=1的数据去进行修改，也带上version版本号，进行乐观锁的并发控制

```json
PUT /test_index/test_type/7?version=1 
{
  "test_field": "test client 2"
}

{
  "error": {
    "root_cause": [
      {
        "type": "version_conflict_engine_exception",
        "reason": "[test_type][7]: version conflict, current version [2] is different than the one provided [1]",
        "index_uuid": "I8nYYk8URXmXpcx0SS7wyw",
        "shard": "3",
        "index": "test_index"
      }
    ],
    "type": "version_conflict_engine_exception",
    "reason": "[test_type][7]: version conflict, current version [2] is different than the one provided [1]",
    "index_uuid": "I8nYYk8URXmXpcx0SS7wyw",
    "shard": "3",
    "index": "test_index"
  },
  "status": 409
}
```

版本冲突，更新失败。

5、在乐观锁成功阻止并发问题之后，尝试正确的完成更新

```json
GET /test_index/test_type/7

{
  "_index": "test_index",
  "_type": "test_type",
  "_id": "7",
  "_version": 2,
  "found": true,
  "_source": {
    "test_field": "test client 1"
  }
}
```

首先去查询ES里当前数据的版本号，然后带上最新的版本号去修改数据，可能这个步骤会需要反复执行好几次才能成功，特别是在多线程并发更新同一条数据很频繁的情况下。

```json
PUT /test_index/test_type/7?version=2 
{
  "test_field": "test client 2"
}

{
  "_index": "test_index",
  "_type": "test_type",
  "_id": "7",
  "_version": 3,
  "result": "updated",
  "_shards": {
    "total": 2,
    "successful": 1,
    "failed": 0
  },
  "created": false
}
```

### 上机动手实战演练基于external version进行乐观锁并发控制

ES提供了一个功能可以让我们不用它提供的内部\_version版本号来进行并发控制，我们可以基于自己维护的一个本版好类进行并发控制。举个例子，假如你的数据在MYSQL里也有一份，然后在MYSQL里维护了一个版本号，无论是怎么生成的，这个时候进行乐观锁并发控制，可能并不是想要用es内部的\_version来进行控制，而是用自己维护的那个version来进行控制。

```
?version=1
?version=1&version_type=external
```

>区别：只有当你提供的version与es中的\_version一样的时候才能修改，否则就报错；当version_type=external的时候，只要你提供的version比es中的\_version大，就能完成修改。


1、先构造一条数据

```json
PUT /test_index/test_type/8
{
  "test_field": "test"
}

{
  "_index": "test_index",
  "_type": "test_type",
  "_id": "8",
  "_version": 1,
  "result": "created",
  "_shards": {
    "total": 2,
    "successful": 1,
    "failed": 0
  },
  "created": true
}
```

2、模拟两个客户端同时查询到这条数据

```json
GET /test_index/test_type/8

{
  "_index": "test_index",
  "_type": "test_type",
  "_id": "8",
  "_version": 1,
  "found": true,
  "_source": {
    "test_field": "test"
  }
}
```

3、第一个客户端先进行修改，此时客户端在自己的数据库中获取到了这条数据的最新版本号，比如说是3

```json
PUT /test_index/test_type/8?version=3&version_type=external
{
  "test_field": "test client 1"
}

{
  "_index": "test_index",
  "_type": "test_type",
  "_id": "8",
  "_version": 3,
  "result": "updated",
  "_shards": {
    "total": 2,
    "successful": 1,
    "failed": 0
  },
  "created": false
}
```

4、模拟第二个客户端，同时拿到了自己数据库中维护的那个版本号，也是3，同时基于version=3发起了修改

```json
PUT /test_index/test_type/8?version=3&version_type=external
{
  "test_field": "test client 2"
}

{
  "error": {
    "root_cause": [
      {
        "type": "version_conflict_engine_exception",
        "reason": "[test_type][8]: version conflict, current version [3] is higher or equal to the one provided [3]",
        "index_uuid": "I8nYYk8URXmXpcx0SS7wyw",
        "shard": "1",
        "index": "test_index"
      }
    ],
    "type": "version_conflict_engine_exception",
    "reason": "[test_type][8]: version conflict, current version [3] is higher or equal to the one provided [3]",
    "index_uuid": "I8nYYk8URXmXpcx0SS7wyw",
    "shard": "1",
    "index": "test_index"
  },
  "status": 409
}
```

一样的，也是并发冲突，只不过这次是基于我们自己提供的version来控制的，而且报错的提示是必须大于等于3。

5、在并发冲突以后，重新基于新的版本号发起更新

```json
PUT /test_index/test_type/8?version=6&version_type=external
{
  "test_field": "test client 2"
}

{
  "_index": "test_index",
  "_type": "test_type",
  "_id": "8",
  "_version": 6,
  "result": "updated",
  "_shards": {
    "total": 2,
    "successful": 1,
    "failed": 0
  },
  "created": false
}
```

# partial update

partial update是修改文档的另一种方式

之前的PUT操作对应到应用程序中，每次的执行流程是这样的：


1. 应用程序先发起一个get请求，获取到document，展示到前台界面，供用户查看和修改
2. 用户在前台界面修改数据，发送到后台
3. 后台代码，会将用户修改的数据在内存中进行执行，然后封装好修改后的全量数据
4. 然后发送PUT请求，到es中，进行全量替换
5. es将老的document标记为deleted，然后重新创建一个新的document

partial update

post /index/type/id/_update 
{
   "doc": {
      "要修改的少数几个field即可，不需要全量的数据"
   }
}

看起来，好像就比较方便了，每次就传递少数几个发生修改的field即可，不需要将全量的document数据发送过去


## partial update实现原理以及其优点

partial update直接将数据更新到document中就完成了修改，不用事先先发起一个GET请求数据进行修改然后在将修改后的数据发回去。

es内部：partial update的执行和全量替换一致。

1. 内部先get获取document
2. 将更新的field更新到document的json中
3. 将老的document标记为deleted
4. 创建新的document

优点：

1. 所有查询，修改和写回操作均发生在同一个shard内，避免了不必要的网络数据传输带来的开销，大大提升了性能（减少了两次请求，一次GET请求，一次回写请求）
2. 减少修改和查询中的时间间隔，有效减少并发冲突的情况
3. 内置乐观锁并发控制

```json
POST /test_index/test_type/id/_update?retry_on_conflict=2
{
  "doc": {
    "num":32
  }
}
```

如果更新失败，则获取最新的版本号再次进行更新，最多重试retry_on_conflict指定的次数

```json
POST /test_index/test_type/11/_update?version=3
{
  "doc": {
    "num":32
  }
}
```


## 实验

```json
PUT /test_index/test_type/10
{
  "test_field1": "test1",
  "test_field2": "test2"
}

POST /test_index/test_type/10/_update
{
  "doc": {
    "test_field2": "updated test2"
  }
}
```

# 批量操作

## 批量查询

如果一条一条的查询100条数据，那么就要发送100次网络请求，这个开销还是很大的
如果进行批量查询的话，查询100条数据，就只要发送1次网络请求，网络请求的性能开销缩减100倍。

ES提供了批量查询的API，它的mget的语法：

```json
GET /_mget
{
   "docs" : [
      {
         "_index" : "test_index",
         "_type" :  "test_type",
         "_id" :    1
      },
      {
         "_index" : "test_index",
         "_type" :  "test_type",
         "_id" :    2
      }
   ]
}


{
  "docs": [
    {
      "_index": "test_index",
      "_type": "test_type",
      "_id": "1",
      "found": false
    },
    {
      "_index": "test_index",
      "_type": "test_type",
      "_id": "2",
      "found": false
    }
  ]
}
```

1、如果查询的document是一个index下的不同type种的话

```json
GET /test_index/_mget
{
   "docs" : [
      {
         "_type" :  "test_type",
         "_id" :    1
      },
      {
         "_type" :  "test_type",
         "_id" :    2
      }
   ]
}
```

2、如果查询的数据都在同一个index下的同一个type下，最简单了

```json
GET /test_index/test_type/_mget
{
   "ids": [1, 2]
}
```

## 批量增删改

ES对于批量增删改，是提供的bulk api。

```json
POST /_bulk
{ "delete": { "_index": "test_index", "_type": "test_type", "_id": "3" }} 
{ "create": { "_index": "test_index", "_type": "test_type", "_id": "12" }}
{ "test_field": "test12" }
{ "index":  { "_index": "test_index", "_type": "test_type", "_id": "2" }}
{ "test_field": "replaced test2" }
{ "update": { "_index": "test_index", "_type": "test_type", "_id": "1", "_retry_on_conflict" : 3} }
{ "doc" : {"test_field2" : "bulk test1"} }
```

上面是一些例子，它的语法是每一个操作有两个json，语法如下：

```json
{"action": {"metadata"}}
{"data"}
```

举例，比如你现在要创建一个文档，放bulk里面，看起来会是这样子的：

```json
{"index": {"_index": "test_index", "_type", "test_type", "_id": "1"}}
{"test_field1": "test1", "test_field2": "test2"}
```

bulk api提供了以下4种操作：

1. delete：删除一个文档，只要1个json串就可以了
2. create：PUT /index/type/id/_create，强制创建
3. index：普通的put操作，可以是创建文档，也可以是全量替换文档
4. update：执行的partial update操作


bulk api对json的语法，有严格的要求，每个json串不能换行，只能放一行，同时一个json串和一个json串之间，必须有一个换行。


bulk操作中，任意一个操作失败，是不会影响其他的操作的，但是在返回结果里，会告诉你异常日志

```json
POST /test_index/_bulk
{ "delete": { "_type": "test_type", "_id": "3" }} 
{ "create": { "_type": "test_type", "_id": "12" }}
{ "test_field":    "test12" }
{ "index":  { "_type": "test_type" }}
{ "test_field":    "auto-generate id test" }
{ "index":  { "_type": "test_type", "_id": "2" }}
{ "test_field":    "replaced test2" }
{ "update": { "_type": "test_type", "_id": "1", "_retry_on_conflict" : 3} }
{ "doc" : {"test_field2" : "bulk test1"} }
```

```json
POST /test_index/test_type/_bulk
{ "delete": { "_id": "3" }} 
{ "create": { "_id": "12" }}
{ "test_field":    "test12" }
{ "index":  { }}
{ "test_field": "auto-generate id test" }
{ "index":  { "_id": "2" }}
{ "test_field": "replaced test2" }
{ "update": { "_id": "1", "_retry_on_conflict" : 3} }
{ "doc" : {"test_field2" : "bulk test1"} }
```

### bulk size最佳大小

bulk request会加载到内存里，如果太大的话，性能反而会下降，因此需要反复尝试一个最佳的bulk size。一般从1000~5000条数据开始，尝试逐渐增加。另外，如果看大小的话，最好是在5~15MB之间。

# Document数据路由

在ES中，一个index的数据会分散在多个分片(shard)中，所以当客户端创建Document的时候，需要决定这个Document放在ES的哪一个shard上，这个过程被称之为**数据路由**。


## 路由算法

`shard = hash(routing) % number_of_primary_shards`

举个例子，一个index有3个primary shard，P0，P1，P2。每次增删改查一个document的时候，都会带过来一个routing number，默认就是这个document的\_id（可能是手动指定，也可能是自动生成）。所以routing = \_id，假设\_id=1，会将这个routing值，传入一个hash函数中，产出一个routing值的hash值，hash(routing) = 21。然后将hash函数产出的值对这个index的primary shard的数量求余数，21 % 3 = 0
就决定了，这个document就放在P0上。**决定一个document在哪个shard上，最重要的一个值就是routing值，默认是\_id，也可以手动指定，相同的routing值，每次过来，从hash函数中，产出的hash值一定是相同的**。无论hash值是几，无论是什么数字，对`number_of_primary_shards`求余数，结果一定是在`0~number_of_primary_shards`-1之间这个范围内的，这里是0,1,2。


## \_id还是自定义routing值

默认的routing就是\_id
也可以在发送请求的时候，手动指定一个routing值，比如`put /index/type/id?routing=user_id`

手动指定routing value是很有用的，可以保证某一类document一定被路由到一个shard上去，那么在后续进行应用级别的负载均衡，以及提升批量读取的性能的时候，是很有帮助的。

>比如在实际的工作当中，如果大量的查询是基于某一个字段的查询，那么可以在添加数据的时候设置这个字段的ID为routing值，比如用户ID，这样在做查询和聚合的时候，ES只需要去一个shard里就能找到所有的数据，提升性能。

## primary shard数量不可变的谜底

ES在创建index的时候设置了primary shard数量和replica shard数量，replica数量是可以修改的，但是primary shard的数量却不能修改。正是因为跟Document的路由公式有关，所以如果primary shard数量发生了变化，如果后面根据ID去查询一个数据，新的路由算法去计算分配，会发现根本找不到这个数据，间接导致数据丢失。

# Document增删改的内部原理

客户端先选择一个节点发送请求，在一般的ES部署架构中，会有一个client节点，专门用来接收客户端的请求，它既不保存元数据，也不保存数据，只是协调请求转发和数据的聚合，分担master节点的压力。

节点对请求进行路由，将请求转发到路由以后的节点上，然后primary shard会在自己本地创建Document，建立索引，最后把响应结果返回给client。

所有的增删改操作，都只能由primary shard处理。



# 写一致性原理

我们在发送任何一个增删改操作的时候，比如说put /index/type/id，都可以带上一个consistency参数，指明我们想要的写一致性是什么？
put /index/type/id?consistency=quorum

* one：要求我们这个写操作，只要有一个primary shard是active活跃可用的，就可以执行
* all：要求我们这个写操作，必须所有的primary shard和replica shard都是活跃的，才可以执行这个写操作
* quorum：默认的值，要求所有的shard中，必须是大部分的shard都是活跃的，可用的，才可以执行这个写操作

## quorum机制

写之前必须确保大多数shard都可用，那么大多数是多少？这里有一个算法：

>quroum=`int( (primary + number_of_replicas) / 2 ) + 1`，当`number_of_replicas>1`时才生效

举个例子，3个primary shard，`number_of_replicas`=1，总共有3 + 3 * 1 = 6个shard。

`quorum = int( (3 + 1) / 2 ) + 1 = 3`

所以，要求6个shard中至少有3个shard是active状态的，才可以执行这个写操作。

如果节点数量少于quorum数量，可能导致quorum不齐全，进而导致无法执行任何写操作。

比如3个primary shard，replica=1，要求至少3个shard是active，3个shard按照之前学习的shard&replica机制，必须在不同的节点上(primary shard和replica shard不能放在一台机器上，同一个primary shard的replica shard也不能放在同一个机器上)，如果说只有1台机器的话，3个shard肯定都没法分配齐全，此时就可能会出现写操作无法执行的情况。

但是ES提供了一种特殊的处理场景，就是说当`number_of_replicas`>1时才生效，因为假如说，你就一个primary shard，replica=1，此时就2个shard，套用公式算一下。

(1 + 1 / 2) + 1 = 2，要求必须有2个shard是活跃的，但是可能就1个node，此时就1个shard是活跃的，如果你不特殊处理的话，导致我们的单节点集群就无法工作。

quorum不齐全的时候，ES会等待，默认1分钟。等待期间，期望活跃的shard数量可以增加，最后实在不行，就会timeout。

我们其实可以在写操作的时候，加一个timeout参数，比如说put /index/type/id?timeout=30，这个就是自己去设定quorum不齐全的时候，es的timeout时长，可以缩短，也可以增长。

# ES查询原理

对于读请求，coordinate node（协作节点）不一定会将请求转发到primary节点上去，因为replica也是可以服务读请求的，而且在转发的时候会采用轮询的负载均衡算法，让读请求均匀的转发到replica shard上。

如果Document正在建立索引的过程中，只在primary shard上存在，此时replica shard上没有，但是协调节点可能将请求转发到replica shard上，此时就会找不到这个Document。


# bulk api原理

上面在学bulk api的时候，ES对json格式要求非常严格，格式紧凑，对换行也有要求。

1、bulk中的每个操作都可能要转发到不同的node的shard去执行

2、如果采用比较良好的json数组格式

允许任意的换行，整个可读性非常棒，读起来很爽，es拿到那种标准格式的json串以后，要按照下述流程去进行处理

1. 将json数组解析为JSONArray对象，这个时候，整个数据，就会在内存中出现一份一模一样的拷贝，一份数据是json文本，一份数据是JSONArray对象
2. 解析json数组里的每个json，对每个请求中的document进行路由
3. 为路由到同一个shard上的多个请求，创建一个请求数组
4. 将这个请求数组序列化
5. 将序列化后的请求数组发送到对应的节点上去

3、耗费更多内存，更多的jvm gc开销

我们之前提到过bulk size最佳大小的那个问题，一般建议说在几千条，然后大小在10MB左右，所以可怕的事情来了。假设说现在100个bulk请求发送到了一个节点上去，然后每个请求是10MB，100个请求，就是1000MB = 1GB，然后每个请求的json都copy一份为jsonarray对象，此时内存中的占用就会翻倍，就会占用2GB的内存，甚至还不止。因为弄成jsonarray之后，还可能会多搞一些其他的数据结构，2GB+的内存占用。

占用更多的内存可能就会积压其他请求的内存使用量，比如说最重要的搜索请求，分析请求，等等，此时就可能会导致其他请求的性能急速下降。
另外的话，占用内存更多，就会导致java虚拟机的垃圾回收次数更多，跟频繁，每次要回收的垃圾对象更多，耗费的时间更多，导致es的java虚拟机停止工作线程的时间更多。

4、现在的奇特格式

{"action": {"meta"}}\n
{"data"}\n
{"action": {"meta"}}\n
{"data"}\n

1. 不用将其转换为json对象，不会出现内存中的相同数据的拷贝，直接按照换行符切割json
2. 对每两个一组的json，读取meta，进行document路由
3. 直接将对应的json发送到node上去

5、最大的优势在于，不需要将json数组解析为一个JSONArray对象，形成一份大数据的拷贝，浪费内存空间，尽可能地保证性能

