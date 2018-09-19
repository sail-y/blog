---
title: ElasticSearch05-搜索详解
tags: [ElasticSearch]
date: 2018-09-19 11:36:54
categories: ElasticSearch
---


此为龙果学院课程学习笔记，记录以后翻看

前面讲了Document的增删改查和集群原理，接下来就是ES的重头戏了，搜索。

# \_search结果解析

当发出一个搜索请求的时候，会拿到很多结果，下面说一下搜索结果里的各种数据，都代表了什么含义。
<!--more-->

```json
GET _search

{
  "took": 10,
  "timed_out": false,
  "_shards": {
    "total": 16,
    "successful": 16,
    "failed": 0
  },
  "hits": {
    "total": 8,
    "max_score": 1,
    "hits": [
      {
        "_index": ".kibana",
        "_type": "config",
        "_id": "5.2.0",
        "_score": 1,
        "_source": {
          "buildNum": 14695
        }
      },
      {
        "_index": "test_index",
        "_type": "test_type",
        "_id": "8",
        "_score": 1,
        "_source": {
          "test_field": "test client 2"
        }
      },
      {
        "_index": "test_index",
        "_type": "test_type",
        "_id": "10",
        "_score": 1,
        "_source": {
          "test_field1": "test1",
          "test_field2": "updated test2"
        }
      },
      {
        "_index": "ecommerce",
        "_type": "product",
        "_id": "2",
        "_score": 1,
        "_source": {
          "name": "jiajieshi yagao",
          "desc": "youxiao fangzhu",
          "price": 25,
          "producer": "jiajieshi producer",
          "tags": [
            "fangzhu"
          ]
        }
      },
      {
        "_index": "ecommerce",
        "_type": "product",
        "_id": "1",
        "_score": 1,
        "_source": {
          "name": "gaolujie yagao",
          "desc": "gaoxiao meibai",
          "price": 30,
          "producer": "gaolujie producer",
          "tags": [
            "meibai",
            "fangzhu"
          ]
        }
      },
      {
        "_index": "test_index",
        "_type": "test_type",
        "_id": "7",
        "_score": 1,
        "_source": {
          "test_field": "test client 2"
        }
      },
      {
        "_index": "test_index1",
        "_type": "test_type",
        "_id": "1",
        "_score": 1,
        "_source": {
          "test": "hello es"
        }
      },
      {
        "_index": "ecommerce",
        "_type": "product",
        "_id": "3",
        "_score": 1,
        "_source": {
          "name": "zhonghua yagao",
          "desc": "caoben zhiwu",
          "price": 40,
          "producer": "zhonghua producer",
          "tags": [
            "qingxin"
          ]
        }
      }
    ]
  }
}
```

* `took`：整个搜索请求花费了多少毫秒
* `hits.total`：本次搜索，返回了几条结果
* `hits.max_score`：本次搜索的所有结果中，最大的相关度分数是多少，每一条document对于search的相关度，越相关，`_score`分数越大，排位越靠前
* `hits.hits`：默认查询前10条数据，包含完整数据，`_score`降序排序
* `shards`：shards fail的条件（primary和replica全部挂掉），不影响其他shard。默认情况下来说，一个搜索请求，会打到一个index的所有primary shard上去，当然了，每个primary shard都可能会有一个或多个replic shard，所以请求也可以到primary shard的其中一个replica shard上去。
* `timeout`：默认没有所谓的timeout，如果搜索特别慢每个shard都要好几分钟，那么搜索请求会一直等待结果返回。ES提供了timeout机制，指定每个shard在设置的timeout时间内马上已经搜索到的数据（可能是部分，也可能是全部），直接返回给client程序，而不是等到所有的数据全部搜索出来以后再返回。确保一次请求可以在用户指定的timeout时常内完成，为一些时间敏感的搜索应用提供良好支持。

	`GET /_search?timeout=10m`
	
# multi-index和multi-type搜索模式

如何一次性搜索多个index和多个type下的数据

* `/_search`：所有索引，所有type下的所有数据都搜索出来
* `/index1/_search`：指定一个index，搜索其下所有type的数据
* `/index1,index2/_search`：同时搜索两个index下的数据
* `/*1,*2/_search`：按照通配符去匹配多个索引
* `/index1/type1/_search`：搜索一个index下指定的type的数据
* `/index1/type1,type2/_search`：可以搜索一个index下多个type的数据
* `/index1,index2/type1,type2/_search`：搜索多个index下的多个type的数据
* `/_all/type1,type2/_search`：_all，可以代表搜索所有index下的指定type的数据

## 搜索基本原理

客户端发送一个搜索请求，会把请求分配到所有的primary shard上去执行，因为每个shard都包含部分数据，所以每个shard上都可能会包含搜索请求的结果。但是如果primary shard有replica shard，那么请求也可以分配到replica shard上去执行。

