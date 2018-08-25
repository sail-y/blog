---
title: ElasticSearch04-Document和Index详解
tags: [ElasticSearch]
date: 2018-08-19 17:40:30
categories: ElasticSearch
---

此为龙果学院课程学习笔记，记录以后翻看


# _index元数据

1. 代表一个document存放在哪个index中。
2. 类似的数据放在一个索引，非类似的数据放不同索引：product index（包含了所有的商品），sales index（包含了所有的商品销售数据），inventory index（包含了所有库存相关的数据）。如果你把比如product，sales，human resource（employee），全都放在一个大的index里面，比如company index，就不合适。
<!--more-->
3. index中包含了很多类似的document：类似是什么意思，其实指的就是这些document的fields很大一部分是相同的，你说你放了3个document，每个document的fields都完全不一样，这就不是类似了，就不太适合放到一个index里面去了。
4. 索引名称必须是小写的，不能用下划线开头，不能包含逗号，例如：product，website，blog


![index如何创建的反例分析](/img/es/04/index如何创建的反例分析.png)


# _type元数据


1. 代表document属于index中的哪个类别（type）
2. 一个索引通常会划分为多个type，逻辑上对index中有些许不同的几类数据进行分类：因为一批相同的数据，可能有很多相同的fields，但是还是可能会有一些轻微的不同，可能会有少数fields是不一样的，举个例子，比如商品，可能划分为电子商品，生鲜商品，日化商品，等等。
3. type名称可以是大写或者小写，但是同时不能用下划线开头，不能包含逗号

# _id元数据

1. 代表document的唯一标识，与index和type一起，可以唯一标识和定位一个document
2. 我们可以手动指定document的id（put /index/type/id），也可以不指定，由es自动为我们创建一个id

## 手动指定document id

### 根据应用情况看是否满足手动指定document id的前提

一般来说，是从某些其他的系统中导入一些数据到es时，会采取这种方式，就是使用系统中已有数据的唯一标识，作为es中document的id。

>举个例子，我们现在在开发一个电商网站，做搜索功能，或者是OA系统的做员工检索功能。这个时候，数据首先会在网站系统或者IT系统内部的数据库中，会先有一份，此时就肯定会有一个数据库的primary key（自增长，UUID，或者是业务编号）。如果将数据导入到es中，此时就比较适合采用数据在数据库中已有的primary key。

但是如果是在做一个系统，这个系统主要的数据存储就是es，也就是数据产生出来以后，可能就没有id，直接就存es。那么这个时候，可能就不太适合手动指定document id的形式了，因为你也不知道id应该是什么，此时可以采取下面的让es自动生成id的方式。

### put /index/type/id

手动指定ID的方式

```json
PUT /test_index/test_type/2
{
  "test_content": "my test"
}
```


## 自动生成document id

### post /index/type

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

### GUID

自动生成的id，它的长度为20个字符，是URL安全的，基于base64编码。基于GUID的算法，分布式系统并行生成时不可能会发生冲突。

# _source元数据

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

# document的全量替换

1. 语法与创建文档是一样的，如果document id不存在，那么就是创建；如果document id已经存在，那么就是全量替换操作，替换document的json串内容。
2. 其实document是不可变的，如果要修改document的内容，第一种方式就是全量替换，直接对document重新建立索引，替换里面所有的内容。
3. es会将老的document标记为deleted，然后新增我们给定的一个document，当我们创建越来越多的document的时候，es会在适当的时机在后台自动删除标记为deleted的document。

# document的强制创建

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

# document的删除

`DELETE /index/type/id`

ES不会立即物理删除，只会将其标记为deleted，当数据越来越多的时候，在后台自动删除。


# Elasticsearch并发冲突问题

![深度图解剖析Elasticsearch并发冲突问题](/img/es/04/深度图解剖析Elasticsearch并发冲突问题.png)

如果并发有多个线程同时修改同一条数据，场景如上图买牙膏的场景，我们需要对操作进行加锁。

## 悲观锁和乐观锁并发控制方案

左侧解释了悲观锁的方案，右侧解释了乐观锁的方案，ES正是采用的乐观锁的并发控制方案。

![深度图解剖析悲观锁与乐观锁两种并发控制方案](/img/es/04/深度图解剖析悲观锁与乐观锁两种并发控制方案.png)

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

第一次创建一个document的时候，它的_version内部版本号就是1；以后，每次对这个document执行修改或者删除操作，都会对这个_version版本号自动加1；哪怕是删除，也会对这条数据的版本号加1

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

我们会发现，在删除一个document之后，可以从一个侧面证明，它不是立即物理删除掉的，因为它的一些版本号等信息还是保留着的。先删除一条document，再重新创建这条document，其实会在delete version基础之上，再把version号加1


![图解Elasticsearch内部如何基于_version进行乐观锁并发控制](/img/es/04/图解Elasticsearch内部如何基于_version进行乐观锁并发控制.png)

### 并发控制方案

