---
title: MongoDB1-安装和增删改查
date: 2017-12-08 14:37:05
tags: [Mongo]
categories: Mongo
---


## 安装

https://www.mongodb.com/download-center

按照传统的方式，可以在这里下载mongo的安装包进行安装。

### OSX

如果是mac系统，并且按照了brew，可以直接执行`brew install mongodb`进行安装。

### docker 

现在用docker快速的搭建软件环境已经非常方便了，所以我在这里将使用docker下载mongo的镜像来部署mongo，方便随后的测试。


https://hub.docker.com/_/mongo/

<!--more-->

dockerhub提供了官方镜像，我们选择好想要下载的版本，然后映射/data/db到我们本机的目录，`--auth`表示开启授权验证，mongo默认是不需要密码的，本机测试我们可以先不加这个参数。

```bash
docker run --name my-mongo -v /Users/xiaomai/software/mongo:/data/db -d -p 27017:27017 -p 28017:28017 mongo:3.6.0 --auth 
```


因为是docker安装的，所以我们不能直接在本机上执行mongo命令来连接。

可以使用下面的命令来连接mongo：

```bash
docker exec -it my-mongo mongo test
```

查看mongo的日志：

```bash
docker logs -f my-mongo
```

安装完毕。

## 客户端连接工具

免费版：

https://robomongo.org/download

收费版：

https://studio3t.com/download/

这是同一个公司开发的，目前是比较推荐这一款工具，非常好用。

![](/img/mongo/mongo1-1.png)

## 简单使用

```javascript
> show dbs;
admin   0.000GB
config  0.000GB
local   0.000GB
> use test
switched to db test
> db
test
> show dbs;
admin   0.000GB
config  0.000GB
local   0.000GB
```

查看数据库列表，切换了数据库，再次查看数据库列表，却发现没有新增的test数据库，这是mongo的特殊所在，现在的test只是一个临时数据库，再没有产生数据的时候，他不会被真正的创建只有当真正的插入数据的时候，数据库随之才会被创建。


### 插入

```javascript
> db.hello.insert({name:'zhangsan', age:20});
WriteResult({ "nInserted" : 1 })
> show dbs;
admin   0.000GB
config  0.000GB
local   0.000GB
test    0.000GB
```

### 查询

查询一下刚才插入的数据：

```javascript
> db.hello.find({})
{ "_id" : ObjectId("5a2a3af1e2beff69d97c54c3"), "name" : "zhangsan", "age" : 20 }
{ "_id" : ObjectId("5a2a3b3ae2beff69d97c54c4"), "name" : "lisi", "age" : 30 }

```

刚才插入的数据被查询出来了，mongodb用的就是JavaScript的语法，他们的数据也是用一种叫做bson的数据结构存储的，类似于json。

#### _id

这两条数据都有一个**_id**的字段，是mongo自动生成的主键/索引。

### 删除

删除数据的演示，{}里面可以加删除的过滤条件。

```javascript
> db.hello.remove({});
WriteResult({ "nRemoved" : 2 })
> db.hello.find({}).limit(1);
```

### 修改

#### 数据准备

可以直接使用JS语法：


```javascript
> use mytest;
switched to db mytest
> var info = {name: 'zhangsan', age:10, city: 'chengdu', street: 'gaoxin'};
> db.personalinfo.insert(info);
WriteResult({ "nInserted" : 1 })
> db.personalinfo.find();
{ "_id" : ObjectId("5a2f847dcdf5d844e48cddb7"), "name" : "zhangsan", "age" : 10, "city" : "chengdu", "street" : "gaoxin" }
```

#### 修改

先把数据查出来：

```javascript
> var info = db.personalinfo.findOne({name:'zhangsan'});
> info
{
	"_id" : ObjectId("5a2f847dcdf5d844e48cddb7"),
	"name" : "zhangsan",
	"age" : 10,
	"city" : "chengdu",
	"street" : "gaoxin"
}
```
一样的用js语法对数据进行修改：

```javascript
> info.address = {'city':info.city, 'street':info.street};
{ "city" : "chengdu", "street" : "gaoxin" }
> info.username = info.name;
zhangsan
> info.userage = info.age;
10
> delete info.name;
true
> delete info.age;
true
> delete info.city;
true
> delete info.street;
true
```

完成修改，update有4个参数，第一个是查询条件，第二个是替换的对象，还有两个参数是可选的：

```javascript
> db.personalinfo.update({'name':'zhangsan'}, info);
WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 })
> db.personalinfo.find();
{ "_id" : ObjectId("5a2f847dcdf5d844e48cddb7"), "address" : { "city" : "chengdu", "street" : "gaoxin" }, "username" : "zhangsan", "userage" : 10 }
```


#### 修改器演示

```javascript
> db.personalinfo.remove({});
> db.personalinfo.insert({name:'zhangsan', age:10});
WriteResult({ "nInserted" : 1 })
> db.personalinfo.insert({name:'zhangsan', age:20});
WriteResult({ "nInserted" : 1 })
> db.personalinfo.insert({name:'zhangsan', age:30});
WriteResult({ "nInserted" : 1 })
> db.personalinfo.insert({name:'zhangsan', age:40});
WriteResult({ "nInserted" : 1 })
> db.personalinfo.find();
{ "_id" : ObjectId("5a2f8a2afd5fb3999c47142b"), "name" : "zhangsan", "age" : 10 }
{ "_id" : ObjectId("5a2f8a2dfd5fb3999c47142c"), "name" : "zhangsan", "age" : 20 }
{ "_id" : ObjectId("5a2f8a30fd5fb3999c47142d"), "name" : "zhangsan", "age" : 30 }
{ "_id" : ObjectId("5a2f8a32fd5fb3999c47142e"), "name" : "zhangsan", "age" : 40 }
> var zhangsan = db.personalinfo.findOne({name:'zhangsan',age:10});
> zhangsan.age++;
10
> zhangsan.age
11
> db.personalinfo.update({name:'zhangsan'}, zhangsan);
WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 })
> db.personalinfo.find();
{ "_id" : ObjectId("5a2f8a2afd5fb3999c47142b"), "name" : "zhangsan", "age" : 11 }
{ "_id" : ObjectId("5a2f8a2dfd5fb3999c47142c"), "name" : "zhangsan", "age" : 20 }
{ "_id" : ObjectId("5a2f8a30fd5fb3999c47142d"), "name" : "zhangsan", "age" : 30 }
{ "_id" : ObjectId("5a2f8a32fd5fb3999c47142e"), "name" : "zhangsan", "age" : 40 }
```


这里看到第一条记录被修改成了11岁。

```javascript
> var zhangsan = db.personalinfo.findOne({name:'zhangsan',age:40});
> zhangsan.age++;
40
> db.personalinfo.update({name:'zhangsan'}, zhangsan);
WriteResult({
	"nMatched" : 0,
	"nUpserted" : 0,
	"nModified" : 0,
	"writeError" : {
		"code" : 66,
		"errmsg" : "After applying the update, the (immutable) field '_id' was found to have been altered to _id: ObjectId('5a2f8a32fd5fb3999c47142e')"
	}
})
```

这次我们查询出40岁的张三，然后再次进行修改，这里得到一个错误，说_id不能被修改，说明update默认是条件过滤到的第一条数据来进行修改。


##### $inc修改器

我们可以用_id字段来进行简便的修改，这里用了$inc修改器，来对数值进行修改：

```javascript
> db.personalinfo.update({_id:ObjectId('5a2f8a2afd5fb3999c47142b')}, {$inc: {age:1}});
WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 })
> db.personalinfo.find();
{ "_id" : ObjectId("5a2f8a2afd5fb3999c47142b"), "name" : "zhangsan", "age" : 12 }
{ "_id" : ObjectId("5a2f8a2dfd5fb3999c47142c"), "name" : "zhangsan", "age" : 20 }
{ "_id" : ObjectId("5a2f8a30fd5fb3999c47142d"), "name" : "zhangsan", "age" : 30 }
{ "_id" : ObjectId("5a2f8a32fd5fb3999c47142e"), "name" : "zhangsan", "age" : 40 }
> 
```

##### $set修改器

$set修改可以完成对属性的设定，如果属性不存在则添加，如果存在则修改。

```javascript
> db.personalinfo.update({_id:ObjectId('5a2f8a2afd5fb3999c47142b')}, {$set: {address:'chengdu'}});
WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 })
> db.personalinfo.find();
{ "_id" : ObjectId("5a2f8a2afd5fb3999c47142b"), "name" : "zhangsan", "age" : 12, "address" : "chengdu" }
{ "_id" : ObjectId("5a2f8a2dfd5fb3999c47142c"), "name" : "zhangsan", "age" : 20 }
{ "_id" : ObjectId("5a2f8a30fd5fb3999c47142d"), "name" : "zhangsan", "age" : 30 }
{ "_id" : ObjectId("5a2f8a32fd5fb3999c47142e"), "name" : "zhangsan", "age" : 40 }
```

同样的，$unset修改器可以删除一个属性。

```javascript
> db.personalinfo.update({_id:ObjectId('5a2f8a2afd5fb3999c47142b')}, {$unset: {address:'chengdu'}});
> db.personalinfo.find();
{ "_id" : ObjectId("5a2f8a2afd5fb3999c47142b"), "name" : "zhangsan", "age" : 12 }
{ "_id" : ObjectId("5a2f8a2dfd5fb3999c47142c"), "name" : "zhangsan", "age" : 20 }
{ "_id" : ObjectId("5a2f8a30fd5fb3999c47142d"), "name" : "zhangsan", "age" : 30 }
{ "_id" : ObjectId("5a2f8a32fd5fb3999c47142e"), "name" : "zhangsan", "age" : 40 }
```

##### $push修改器

$push修改器可以对数组进行操作，增加一个books的属性，是一个数组。

```javascript
> db.personalinfo.update({_id:ObjectId('5a2f8a2afd5fb3999c47142b')}, {$push:{books:'MongoDB'}});
WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 })
> db.personalinfo.find();
{ "_id" : ObjectId("5a2f8a2afd5fb3999c47142b"), "name" : "zhangsan", "age" : 12, "books" : [ "MongoDB" ] }
{ "_id" : ObjectId("5a2f8a2dfd5fb3999c47142c"), "name" : "zhangsan", "age" : 20 }
{ "_id" : ObjectId("5a2f8a30fd5fb3999c47142d"), "name" : "zhangsan", "age" : 30 }
{ "_id" : ObjectId("5a2f8a32fd5fb3999c47142e"), "name" : "zhangsan", "age" : 40 }
```

##### $addToSet修改器

跟Java里的Set概念，如果是重复的数据，则不会被添加。

```javascipt
> db.personalinfo.update({_id:ObjectId('5a2f8a2afd5fb3999c47142b')}, {$addToSet:{books:'MongoDB'}});
WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 0 })
> db.personalinfo.find();
{ "_id" : ObjectId("5a2f8a2afd5fb3999c47142b"), "name" : "zhangsan", "age" : 12, "books" : [ "MongoDB" ] }
{ "_id" : ObjectId("5a2f8a2dfd5fb3999c47142c"), "name" : "zhangsan", "age" : 20 }
{ "_id" : ObjectId("5a2f8a30fd5fb3999c47142d"), "name" : "zhangsan", "age" : 30 }
{ "_id" : ObjectId("5a2f8a32fd5fb3999c47142e"), "name" : "zhangsan", "age" : 40 }
> 
```

我们再次为books属性添加了一个MongoDB的数据，跟我们期望的一样，重复的数据没有被添加。

##### 修改数组某一个值 （索引）

在需要修改数组中的某一个值的时候，还是可以用`$set`修改器来进行修改，只需要在key的后面加上一个索引。

```javascript
> db.personalinfo.update({_id:ObjectId('5a2f8a2afd5fb3999c47142b')}, {$set:{'books.0':'Mongo'}});
WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 })
> db.personalinfo.find();
{ "_id" : ObjectId("5a2f8a2afd5fb3999c47142b"), "name" : "zhangsan", "age" : 12, "books" : [ "Mongo", "JVM" ] }
{ "_id" : ObjectId("5a2f8a2dfd5fb3999c47142c"), "name" : "zhangsan", "age" : 20 }
{ "_id" : ObjectId("5a2f8a30fd5fb3999c47142d"), "name" : "zhangsan", "age" : 30 }
{ "_id" : ObjectId("5a2f8a32fd5fb3999c47142e"), "name" : "zhangsan", "age" : 40 }
> 
```

##### 修改数组某一个值（根据查询条件）

先把books改成一个对象的数组

```javascript
> db.personalinfo.update({_id:ObjectId('5a2f8a2afd5fb3999c47142b')}, {$push:{'books':{name:'Mongo', price:20}}});
WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 })
> db.personalinfo.find();
{ "_id" : ObjectId("5a2f8a2afd5fb3999c47142b"), "name" : "zhangsan", "age" : 12, "books" : { "name" : "Mongo", "price" : 20 } }
{ "_id" : ObjectId("5a2f8a2dfd5fb3999c47142c"), "name" : "zhangsan", "age" : 20 }
{ "_id" : ObjectId("5a2f8a30fd5fb3999c47142d"), "name" : "zhangsan", "age" : 30 }
{ "_id" : ObjectId("5a2f8a32fd5fb3999c47142e"), "name" : "zhangsan", "age" : 40 }
```

现在需要将books里mongo的价格改成30，但是不用索引。mongo为我们提供了一个$表示当前查询到的数据。
update的前两个参数<查询条件>和<更新操作>中，如果你在<查询条件>中查询的内容是array里的内容，<更新操作>中就可以使用"$"来引用前查询中匹配到的元素。


```javascript
db.personalinfo.update({'books.name':'Mongo'}, {$set:{'books.$.price':30}});
```

#### update参数详解

```javascript
> db.personalinfo.update
function (query, obj, upsert, multi) {
....
}
```
1. query表示查询条件
2. obj表示修改的对象
3. upsert表示更新或者插入
4. multi表示批量更新

##### upsert演示

```javascript
> db.personalinfo.remove({});
WriteResult({ "nRemoved" : 4 })
> db.personalinfo.insert({name:'zhangsan'});
WriteResult({ "nInserted" : 1 })
> db.personalinfo.find();
{ "_id" : ObjectId("5a3130c1fd5fb3999c47142f"), "name" : "zhangsan" }
> db.personalinfo.update({name:'zhangsan'}, {$inc: {count:3}});
WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 })
> db.personalinfo.find();
{ "_id" : ObjectId("5a3130c1fd5fb3999c47142f"), "name" : "zhangsan", "count" : 3 }
```
直接修改不存在的属性，会新增一个属性。


这里查询了一个`lisi`的数据，默认情况下是不存在的，但是如果把upsert设置为true之后，就成了有数据就更新，没有就insert一条。

```javascript
> db.personalinfo.update({name:'lisi'}, {$inc: {count:3}});
WriteResult({ "nMatched" : 0, "nUpserted" : 0, "nModified" : 0 })
> db.personalinfo.update({name:'lisi'}, {$inc: {count:3}}, true);
WriteResult({
	"nMatched" : 0,
	"nUpserted" : 1,
	"nModified" : 0,
	"_id" : ObjectId("5a31313f7cb00d3f6c6c4591")
})
> db.personalinfo.find();
{ "_id" : ObjectId("5a3130c1fd5fb3999c47142f"), "name" : "zhangsan", "count" : 3 }
{ "_id" : ObjectId("5a31313f7cb00d3f6c6c4591"), "name" : "lisi", "count" : 3 }
> 
```

##### 批量更新

先准备几条数据：

```javascript
> db.personalinfo.save({'name':'zhangsan','age':10,'address':'beijing'})
WriteResult({ "nInserted" : 1 })
> db.personalinfo.save({'name':'lisi','age':10,'address':'guangzhou'})
WriteResult({ "nInserted" : 1 })
> db.personalinfo.save({'name':'wangwu','age':20,'address':'shanghai'})
WriteResult({ "nInserted" : 1 })
> db.personalinfo.save({'name':'zhaoliu','age':10,'address':'shenzhen'})
WriteResult({ "nInserted" : 1 })
```

把第4个参数设置成了true，表示执行批量更新

```javascript
> db.personalinfo.update({age:10}, {$set:{company:'sap'}}, false, true);
WriteResult({ "nMatched" : 3, "nUpserted" : 0, "nModified" : 3 })
> db.personalinfo.find();
{ "_id" : ObjectId("5a48c6c9f0ec47e9f5ce2dac"), "name" : "zhangsan", "age" : 10, "address" : "beijing", "company" : "sap" }
{ "_id" : ObjectId("5a48c6c9f0ec47e9f5ce2dad"), "name" : "lisi", "age" : 10, "address" : "guangzhou", "company" : "sap" }
{ "_id" : ObjectId("5a48c6c9f0ec47e9f5ce2dae"), "name" : "wangwu", "age" : 20, "address" : "shanghai" }
{ "_id" : ObjectId("5a48c6caf0ec47e9f5ce2daf"), "name" : "zhaoliu", "age" : 10, "address" : "shenzhen", "company" : "sap" }
```



### save

mongo提供了一个save操作，它的行为取决于你是否传入了\_id参数，如果你没有传，会先造一个，如果你传了_id，则会进行修改。

```javascript
> db.personalinfo.save({'_id':5,'username':'zhangsan'})
WriteResult({ "nMatched" : 0, "nUpserted" : 1, "nModified" : 0, "_id" : 5 })
> db.personalinfo.save({'_id':5,'username':'lisi'})
WriteResult({ "nMatched" : 1, "nUpserted" : 0, "nModified" : 1 })
> db.personalinfo.find();
{ "_id" : 5, "username" : "lisi" }
> db.personalinfo.insert({'_id':5,'username':'lisi'})
WriteResult({
	"nInserted" : 0,
	"writeError" : {
		"code" : 11000,
		"errmsg" : "E11000 duplicate key error collection: mytest.personalinfo index: _id_ dup key: { : 5.0 }"
	}
})
```

### findAndModify

它是一种原子操作，正常情况下，查询并修改是两步操作，但是mongo为我们提供的这个函数，是原子性的，不会在多线程情况下出现并发问题。

>Modifies and returns a single document. By default, the returned document does not include the modifications made on the update. To return the document with the modifications made on the update, use the new option. 

修改并返回一个文档，默认是返回修改之前的文档，如果要返回修改之后的，设置`new`这个参数。

```javascript
db.collection.findAndModify({
    query: <document>,
    sort: <document>,
    remove: <boolean>,
    update: <document>,
    new: <boolean>,
    fields: <document>,
    upsert: <boolean>,
    bypassDocumentValidation: <boolean>,
    writeConcern: <document>,
    collation: <document>,
    arrayFilters: [ <filterdocument1>, ... ]
});
```

重要参数解释：

* query：查询参数
* sort：排序的方式
* remove：remove和update只能设置一个，删除查询条件筛选的内容
* update：remove和update只能设置一个，修改查询条件筛选的内容
* new：返回修改之后的文档
* fields：表示返回的数据需要的字段

#### 演示

数据准备：

```javascript
db.personalinfo.remove({});
db.personalinfo.save({'name':'zhangsan','age':10,'address':'beijing'})
db.personalinfo.save({'name':'lisi','age':10,'address':'guangzhou'})
db.personalinfo.save({'name':'wangwu','age':20,'address':'shanghai'})
db.personalinfo.save({'name':'zhaoliu','age':10,'address':'shenzhen'})
```

传入必要的参数，对数据进行修改，返回了修改成功的那一条数据。

```javascript
> db.personalinfo.findAndModify({
...     query: {name:'zhangsan'},
...     sort: {age:-1},
...     remove: false,
...     update:{$set:{address:'nanjing'}},
...     new:true
... });
{
	"_id" : ObjectId("5a48d102f0ec47e9f5ce2db0"),
	"name" : "zhangsan",
	"age" : 10,
	"address" : "nanjing"
}
```

