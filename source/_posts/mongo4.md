---
title: MongoDB4-GridFS、Capped Collections、索引与查询计划
date: 2018-01-07 10:13:24
tags: [Mongo]
categories: Mongo
---

# GridFS

https://docs.mongodb.com/manual/core/gridfs/index.html#use-gridfs

GridFS 用于存储和恢复那些超过16M（BSON文件限制）的文件(如：图片、音频、视频等)。

GridFS 也是文件存储的一种方式，但是它是存储在MonoDB的集合中。

GridFS 可以更好的存储大于16M的文件。

GridFS 会将大文件对象分割成多个小的chunk(文件片段),一般为256k/个,每个chunk将作为MongoDB的一个文档(document)被存储在chunks集合中。

GridFS 用两个集合来存储一个文件：fs.files与fs.chunks。

每个文件的实际内容被存在chunks(二进制数据)中,和文件有关的meta数据(filename,content_type,还有用户自定义的属性)将会被存在files集合中。
<!--more-->
以下是简单的 fs.files 集合文档：

```js
{
   "filename": "test.txt",
   "chunkSize": NumberInt(261120),
   "uploadDate": ISODate("2014-04-13T11:32:33.557Z"),
   "md5": "7b762939321e146569b07f72c62cca4f",
   "length": NumberInt(646)
}
```

以下是简单的 fs.chunks 集合文档：

```js
{
   "files_id": ObjectId("534a75d19f54bfec8a2fe44b"),
   "n": NumberInt(0),
   "data": "Mongo Binary Data"
}
```

## mongofiles

mongodb提供了一个`mongofiles`命令来管理GridFS。

`mongofiles <options> <commands> <filename>`

它的参数在文档都有详细的解释

https://docs.mongodb.com/manual/reference/program/mongofiles/index.html


### 上传

上传一个东西测试一下，`-d`指定数据库，`-l`指定要上传的文件地址

```bash
~ mongofiles -d mytest -l /Users/xiaomai/Desktop/WXWork_2.4.5.213.dmg put wxwork.dmg
2018-01-07T11:59:51.831+0800	connected to: localhost
added file: wxwork.dmg
```

可以查一下fs.files和fs.chunks这两个数据库

```js
> db.fs.files.find();
{ "_id" : ObjectId("5a519b37e59cf07feeb8eca8"), "chunkSize" : 261120, "uploadDate" : ISODate("2018-01-07T03:59:52.285Z"), "length" : 22230276, "md5" : "b0c833f7325342227ddff80e03462000", "filename" : "wxwork.dmg" }
```

由于chunks里保存的二进制数据，特别多，所以查询的时候把data字段给忽略一下

```bash
> db.fs.chunks.find({},{data:0});
{ "_id" : ObjectId("5a519b37e59cf07feeb8eca9"), "files_id" : ObjectId("5a519b37e59cf07feeb8eca8"), "n" : 0 }
{ "_id" : ObjectId("5a519b37e59cf07feeb8ecaa"), "files_id" : ObjectId("5a519b37e59cf07feeb8eca8"), "n" : 1 }
{ "_id" : ObjectId("5a519b37e59cf07feeb8ecab"), "files_id" : ObjectId("5a519b37e59cf07feeb8eca8"), "n" : 2 }
{ "_id" : ObjectId("5a519b37e59cf07feeb8ecac"), "files_id" : ObjectId("5a519b37e59cf07feeb8eca8"), "n" : 3 }
{ "_id" : ObjectId("5a519b37e59cf07feeb8ecad"), "files_id" : ObjectId("5a519b37e59cf07feeb8eca8"), "n" : 4 }
{ "_id" : ObjectId("5a519b37e59cf07feeb8ecae"), "files_id" : ObjectId("5a519b37e59cf07feeb8eca8"), "n" : 5 }
{ "_id" : ObjectId("5a519b37e59cf07feeb8ecaf"), "files_id" : ObjectId("5a519b37e59cf07feeb8eca8"), "n" : 6 }
Type "it" for more
```

当然，这个数据也不少，chunkSize是261120，除以1024，一块是255k。

### 搜索

```bash
➜  ~ mongofiles -d mytest search w
2018-01-07T12:44:41.433+0800	connected to: localhost
wxwork.dmg	22230276
```

### 删除

```bash
➜  ~ mongofiles -d mytest delete wxwork.dmg 
2018-01-07T12:45:46.190+0800	connected to: localhost
successfully deleted all instances of 'wxwork.dmg' from GridFS
```


# Capped Collections

https://docs.mongodb.com/manual/core/capped-collections/index.html

> Capped collections are fixed-size collections that support high-throughput operations that insert and retrieve documents based on insertion order. Capped collections work in a way similar to circular buffers: once a collection fills its allocated space, it makes room for new documents by overwriting the oldest documents in the collection.


MongoDB 固定集合（Capped Collections）是性能出色且有着固定大小的集合，对于大小固定，我们可以想象其就像一个环形队列，当集合空间用完后，再插入的元素就会覆盖最初始的头部的元素！

一般只新增不更新，更新要求更新后的集合大小不能超过之前的大小，否则会出错。

2.2版本之后，_id就自带索引了，在2.2之前，需要显式的在_id字段上创建索引。


## 创建

https://docs.mongodb.com/manual/core/capped-collections/index.html#create-a-capped-collection

```js
> db.createCollection("log",{capped:true,size:1000})
{ "ok" : 1 }
```

mongodb会先判断size的大小是否超过限制，然后再判断集合里文档的数量是否超过了max设定的值。

```js
> db.createCollection("log", { capped : true, size : 100, max : 2 } )
> db.log.insert({count:1});
WriteResult({ "nInserted" : 1 })
> db.log.insert({count:2});
WriteResult({ "nInserted" : 1 })
> db.log.insert({count:3});
WriteResult({ "nInserted" : 1 })
> db.log.insert({count:4});
WriteResult({ "nInserted" : 1 })
> db.log.insert({count:5});
WriteResult({ "nInserted" : 1 })
> db.log.find({});
{ "_id" : ObjectId("5a51aec1fef2eb6e769d4f36"), "count" : 4 }
{ "_id" : ObjectId("5a51aec5fef2eb6e769d4f37"), "count" : 5 }
```
这也印证了之前的说法，在超过2条以后，新插入的会覆盖最早的记录。

## 查询

https://docs.mongodb.com/manual/core/capped-collections/index.html#query-a-capped-collection

如果没有指定排序，mongodb会保证查询的结果就是插入的顺序。

```js
> db.log.find().sort({$natural: -1})
{ "_id" : ObjectId("5a51aec5fef2eb6e769d4f37"), "count" : 5 }
{ "_id" : ObjectId("5a51aec1fef2eb6e769d4f36"), "count" : 4 }
```

判断一个集合是否是capped：

```js
> db.log.isCapped();
true
```

转换一个普通的集合成固定集合：

```js
> db.runCommand({'convertToCapped': 'hello', size:1000});
{ "ok" : 1 }
> db.hello.isCapped()
true
```

# 索引与查询计划

索引通常能够极大的提高查询的效率，如果没有索引，MongoDB在读取数据时必须扫描集合中的每个文件并选取那些符合查询条件的记录。

这种扫描全集合的查询效率是非常低的，特别在处理大量的数据时，查询可以要花费几十秒甚至几分钟，这对网站的性能是非常致命的。

索引是特殊的数据结构，索引存储在一个易于遍历读取的数据集合中，索引是对数据库表中一列或多列的值进行排序的一种结构。

![](https://docs.mongodb.com/manual/_images/index-for-sort.bakedsvg.svg)

mongodb默认会给每一个集合的`_id`字段上创建一个索引。


## 创建索引

数据准备：

```js
> db.myindex.insert({name:'zhangsan', age:10});
> db.myindex.insert({name:'lisi', age:20});
> db.myindex.insert({name:'wangwu', age:14});
> db.myindex.find();
{ "_id" : ObjectId("5a51c3d1a893e40faf1670cb"), "name" : "zhangsan", "age" : 10 }
{ "_id" : ObjectId("5a51c3e5a893e40faf1670cc"), "name" : "lisi", "age" : 20 }
{ "_id" : ObjectId("5a51c404a893e40faf1670cd"), "name" : "wangwu", "age" : 14 }
```

查询一下现有索引：

```js
> db.myindex.getIndexes();
[
	{
		"v" : 2,
		"key" : {
			"_id" : 1
		},
		"name" : "_id_",
		"ns" : "test.myindex"
	}
]
```

给age和name创建一个索引，1和-1表示升序还是降序：

```js
> db.myindex.createIndex({age:1});
{
	"createdCollectionAutomatically" : false,
	"numIndexesBefore" : 1,
	"numIndexesAfter" : 2,
	"ok" : 1
}
> db.myindex.createIndex({name:1});
{
	"createdCollectionAutomatically" : false,
	"numIndexesBefore" : 2,
	"numIndexesAfter" : 3,
	"ok" : 1
}
> db.myindex.getIndexes();
[
	{
		"v" : 2,
		"key" : {
			"_id" : 1
		},
		"name" : "_id_",
		"ns" : "test.myindex"
	},
	{
		"v" : 2,
		"key" : {
			"age" : 1
		},
		"name" : "age_1",
		"ns" : "test.myindex"
	},
	{
		"v" : 2,
		"key" : {
			"name" : 1
		},
		"name" : "name_1",
		"ns" : "test.myindex"
	}
]
```



给索引起个别名，并将创建索引的操作后台运行，意思不会阻塞当前的线程。

```js
> db.myindex.createIndex({name:1}, {name:'helloIndex', background:1})
{
	"createdCollectionAutomatically" : false,
	"numIndexesBefore" : 1,
	"numIndexesAfter" : 2,
	"ok" : 1
}
> db.myindex.getIndexes();
[
	{
		"v" : 2,
		"key" : {
			"_id" : 1
		},
		"name" : "_id_",
		"ns" : "test.myindex"
	},
	{
		"v" : 2,
		"key" : {
			"name" : 1
		},
		"name" : "helloIndex",
		"ns" : "test.myindex",
		"background" : 1
	}
]
```



## 删除索引

删除单个：

```js
> db.myindex.dropIndex({name:1})
```

删除所有：


```js
> db.myindex.dropIndexes();
{
	"nIndexesWas" : 2,
	"msg" : "non-_id indexes dropped for collection",
	"ok" : 1
}
> db.myindex.getIndexes();
[
	{
		"v" : 2,
		"key" : {
			"_id" : 1
		},
		"name" : "_id_",
		"ns" : "test.myindex"
	}
]
```

## 唯一索引

指定unique参数创建一个唯一索引，插入字段有相同的值，会执行失败。

```js
> db.myindex.dropIndex({name:1});
{ "nIndexesWas" : 2, "ok" : 1 }
> db.myindex.createIndex({name:1}, {unique:1})
{
	"createdCollectionAutomatically" : false,
	"numIndexesBefore" : 1,
	"numIndexesAfter" : 2,
	"ok" : 1
}
> db.myindex.getIndexes();
[
	{
		"v" : 2,
		"key" : {
			"_id" : 1
		},
		"name" : "_id_",
		"ns" : "test.myindex"
	},
	{
		"v" : 2,
		"unique" : true,
		"key" : {
			"name" : 1
		},
		"name" : "name_1",
		"ns" : "test.myindex"
	}
]
> db.myindex.insert({name:'zhangsan',age:2});
WriteResult({
	"nInserted" : 0,
	"writeError" : {
		"code" : 11000,
		"errmsg" : "E11000 duplicate key error collection: test.myindex index: name_1 dup key: { : \"zhangsan\" }"
	}
})
```

## 查询计划

虽然设置了索引，我们在做查询的时候，可能并不是很确定到底用到了索引没有。跟传统sql一样，mongo提供了查询计划来检测。

```js
> db.myindex.find({name:'zhangsan'}).explain();
{
	"queryPlanner" : {
		"plannerVersion" : 1,
		"namespace" : "test.myindex",
		"indexFilterSet" : false,
		"parsedQuery" : {
			"name" : {
				"$eq" : "zhangsan"
			}
		},
		"winningPlan" : {
			"stage" : "FETCH",
			"inputStage" : {
				"stage" : "IXSCAN",
				"keyPattern" : {
					"name" : 1
				},
				"indexName" : "name_1",
				"isMultiKey" : false,
				"multiKeyPaths" : {
					"name" : [ ]
				},
				"isUnique" : true,
				"isSparse" : false,
				"isPartial" : false,
				"indexVersion" : 2,
				"direction" : "forward",
				"indexBounds" : {
					"name" : [
						"[\"zhangsan\", \"zhangsan\"]"
					]
				}
			}
		},
		"rejectedPlans" : [ ]
	},
	"serverInfo" : {
		"host" : "2dd4d04418b1",
		"port" : 27017,
		"version" : "3.6.0",
		"gitVersion" : "a57d8e71e6998a2d0afde7edc11bd23e5661c915"
	},
	"ok" : 1
}
```

主要是看`indexBounds`，可以确定是用了name的索引。

因为之前把age上的索引删除了，所以查询age>5的数据，则没有用到索引。

```js
> db.myindex.find({age:{$gt:5}}).explain();
{
	"queryPlanner" : {
		"plannerVersion" : 1,
		"namespace" : "test.myindex",
		"indexFilterSet" : false,
		"parsedQuery" : {
			"age" : {
				"$gt" : 5
			}
		},
		"winningPlan" : {
			"stage" : "COLLSCAN",
			"filter" : {
				"age" : {
					"$gt" : 5
				}
			},
			"direction" : "forward"
		},
		"rejectedPlans" : [ ]
	},
	"serverInfo" : {
		"host" : "2dd4d04418b1",
		"port" : 27017,
		"version" : "3.6.0",
		"gitVersion" : "a57d8e71e6998a2d0afde7edc11bd23e5661c915"
	},
	"ok" : 1
}
```

## 重建索引

```js
> db.myindex.reIndex();
{
	"nIndexesWas" : 2,
	"nIndexes" : 2,
	"indexes" : [
		{
			"v" : 2,
			"key" : {
				"_id" : 1
			},
			"name" : "_id_",
			"ns" : "test.myindex"
		},
		{
			"v" : 2,
			"unique" : true,
			"key" : {
				"name" : 1
			},
			"name" : "name_1",
			"ns" : "test.myindex"
		}
	],
	"ok" : 1
}
```

## 组合索引

https://docs.mongodb.com/manual/indexes/index.html#compound-index

![](https://docs.mongodb.com/manual/_images/index-compound-key.bakedsvg.svg)

```js
> db.myindex.createIndex({age:1, name:1}, {name:'myNameAndAge'})
{
	"createdCollectionAutomatically" : false,
	"numIndexesBefore" : 2,
	"numIndexesAfter" : 3,
	"ok" : 1
}
> db.myindex.getIndexes();
[
	{
		"v" : 2,
		"key" : {
			"_id" : 1
		},
		"name" : "_id_",
		"ns" : "test.myindex"
	},
	{
		"v" : 2,
		"unique" : true,
		"key" : {
			"name" : 1
		},
		"name" : "name_1",
		"ns" : "test.myindex"
	},
	{
		"v" : 2,
		"key" : {
			"age" : 1,
			"name" : 1
		},
		"name" : "myNameAndAge",
		"ns" : "test.myindex"
	}
]
```

# 查询优化器

mysql里面有一个慢查询日志，记录了查询比较慢的一些查询，可以让开发人员分析。

mongodb也提供了profiling，它默认是没有开启的，需要手动开启，0表示没有开启。

```js
> db.getProfilingLevel();
0
```
这个值为1的时候，大于100毫秒的的查询会被记录，如果为2，所有的查询记录都会被记录。


数据准备:

```js
> db.post.save({name:'zhangsan', age:20})
> db.post.save({name:'lisi', age:21})
> db.post.save({name:'wangwu', age:22})
```

改变profilingLevel，开启profiling，为了演示，设置成2，记录所有的查询。

```js
> db.setProfilingLevel(2);
{ "was" : 0, "slowms" : 100, "sampleRate" : 1, "ok" : 1 }
>
```

可以看到多了一个集合，实际上查询记录就会被记录到system.profile集合当中。

```js
> show collections;
post
system.profile
```

```js
> db.post.find();
{ "_id" : ObjectId("5a51cef5a893e40faf1670cf"), "name" : "zhangsan", "age" : 20 }
{ "_id" : ObjectId("5a51cf00a893e40faf1670d0"), "name" : "lisi", "age" : 21 }
{ "_id" : ObjectId("5a51cf0aa893e40faf1670d1"), "name" : "wangwu", "age" : 22 }
> db.system.profile.find().pretty();
{
	"op" : "query",
	"ns" : "mytest.post",
	"command" : {
		"find" : "post",
		"filter" : {
			
		},
		"$db" : "mytest"
	},
	"keysExamined" : 0,
	"docsExamined" : 3,
	"cursorExhausted" : true,
	"numYield" : 0,
	"locks" : {
		"Global" : {
			"acquireCount" : {
				"r" : NumberLong(2)
			}
		},
		"Database" : {
			"acquireCount" : {
				"r" : NumberLong(1)
			}
		},
		"Collection" : {
			"acquireCount" : {
				"r" : NumberLong(1)
			}
		}
	},
	"nreturned" : 3,
	"responseLength" : 249,
	"protocol" : "op_msg",
	"millis" : 0,
	"planSummary" : "COLLSCAN",
	"execStats" : {
		"stage" : "COLLSCAN",
		"nReturned" : 3,
		"executionTimeMillisEstimate" : 0,
		"works" : 5,
		"advanced" : 3,
		"needTime" : 1,
		"needYield" : 0,
		"saveState" : 0,
		"restoreState" : 0,
		"isEOF" : 1,
		"invalidates" : 0,
		"direction" : "forward",
		"docsExamined" : 3
	},
	"ts" : ISODate("2018-01-07T07:58:31.109Z"),
	"client" : "172.17.0.1",
	"appName" : "MongoDB Shell",
	"allUsers" : [ ],
	"user" : ""
}
```

profile的内容有点多，docsExamined扫描过3个文档，nreturned表示返回了3个文档。接着给name创建一个索引，再查询一次。

```js
db.post.createIndex({name:1})
db.post.find({name:'zhangsan'});
db.system.profile.find().pretty()
{
	"op" : "query",
	"ns" : "mytest.post",
	"command" : {
		"find" : "post",
		"filter" : {
			"name" : "zhangsan"
		},
		"$db" : "mytest"
	},
	"keysExamined" : 1,
	"docsExamined" : 1,
	"cursorExhausted" : true,
	"numYield" : 0,
	"locks" : {
		"Global" : {
			"acquireCount" : {
				"r" : NumberLong(2)
			}
		},
		"Database" : {
			"acquireCount" : {
				"r" : NumberLong(1)
			}
		},
		"Collection" : {
			"acquireCount" : {
				"r" : NumberLong(1)
			}
		}
	},
	"nreturned" : 1,
	"responseLength" : 141,
	"protocol" : "op_msg",
	"millis" : 4,
	"planSummary" : "IXSCAN { name: 1 }",
	"execStats" : {
		"stage" : "FETCH",
		"nReturned" : 1,
		"executionTimeMillisEstimate" : 0,
		"works" : 2,
		"advanced" : 1,
		"needTime" : 0,
		"needYield" : 0,
		"saveState" : 0,
		"restoreState" : 0,
		"isEOF" : 1,
		"invalidates" : 0,
		"docsExamined" : 1,
		"alreadyHasObj" : 0,
		"inputStage" : {
			"stage" : "IXSCAN",
			"nReturned" : 1,
			"executionTimeMillisEstimate" : 0,
			"works" : 2,
			"advanced" : 1,
			"needTime" : 0,
			"needYield" : 0,
			"saveState" : 0,
			"restoreState" : 0,
			"isEOF" : 1,
			"invalidates" : 0,
			"keyPattern" : {
				"name" : 1
			},
			"indexName" : "name_1",
			"isMultiKey" : false,
			"multiKeyPaths" : {
				"name" : [ ]
			},
			"isUnique" : false,
			"isSparse" : false,
			"isPartial" : false,
			"indexVersion" : 2,
			"direction" : "forward",
			"indexBounds" : {
				"name" : [
					"[\"zhangsan\", \"zhangsan\"]"
				]
			},
			"keysExamined" : 1,
			"seeks" : 1,
			"dupsTested" : 0,
			"dupsDropped" : 0,
			"seenInvalidated" : 0
		}
	},
	"ts" : ISODate("2018-01-07T08:04:05.695Z"),
	"client" : "172.17.0.1",
	"appName" : "MongoDB Shell",
	"allUsers" : [ ],
	"user" : ""
}
```

因为post的name字段是加了索引的，所以这次的查询记录，indexName显示用到的索引名称，keysExamined为1，表示扫描了1条索引，这次docsExamined为1，只扫描了一条文档。



索引和查询计划就说到这里，下面的文章，讲解最后一部分，也就是副本集。