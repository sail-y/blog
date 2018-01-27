---
title: MongoDB2-查询详解
date: 2018-01-01 09:18:27
tags: [Mongo]
categories: Mongo
---


# 查询

MongoDB为我们提供了很强大的查询功能，之前演示的都比较简单，接下来将展示一些进阶用法。

## 数据准备

```javascript
db.personalinfo.remove({});
db.personalinfo.save({name:'zhangsan',age:10});
db.personalinfo.save({name:'lisi',age:11});
db.personalinfo.save({name:'wangsu',age:12});
```

<!--more-->

## 根据某个字段查询


```javascript
> db.personalinfo.find({age:11});
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db5"), "name" : "lisi", "age" : 11 }
```

## 过滤返回的字段

find的第二个参数可以设置需要返回的字段，以节省网络传输

```javascript
> db.personalinfo.find({}, {name:1});
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db4"), "name" : "zhangsan" }
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db5"), "name" : "lisi" }
{ "_id" : ObjectId("5a498d87f0ec47e9f5ce2db6"), "name" : "wangsu" }
```

不能同时使用包含或者排除，如果需要排除，直接不写age的字段即可。

```javascript
> db.personalinfo.find({}, {name:1, age:0});
Error: error: {
	"ok" : 0,
	"errmsg" : "Projection cannot have a mix of inclusion and exclusion.",
	"code" : 2,
	"codeName" : "BadValue"
}
```

## findOne()

findOne()跟find()的参数是一样的，只是findOne只返回查询到的第一条数据。


## 条件运算符

### 大于&小于

```javascript
> db.personalinfo.find({age:{$gt:10}});
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db5"), "name" : "lisi", "age" : 11 }
{ "_id" : ObjectId("5a498d87f0ec47e9f5ce2db6"), "name" : "wangsu", "age" : 12 }
```

* 大于：$gt
* 大于等于：$gte
* 小于：$lt
* 小于等于：$lte

多个条件：

```javascript
> db.personalinfo.find({age:{$gt:10,$lt:12}});
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db5"), "name" : "lisi", "age" : 11 }
```

### $all

$all运算符表示从数组中过滤包含的字段

```javascript
db.address.insert({name:['beijing','tianjin']});
db.address.insert({name:['beijing','shanghai']});
db.address.insert({name:['dalian','shanghai']});

> db.address.find({name: {$all: ['beijing','tianjin']}});
{ "_id" : ObjectId("5a4994c2f0ec47e9f5ce2db7"), "name" : [ "beijing", "tianjin" ] }
> db.address.find({name: {$all: ['shanghai']}});
{ "_id" : ObjectId("5a4994c2f0ec47e9f5ce2db8"), "name" : [ "beijing", "shanghai" ] }
{ "_id" : ObjectId("5a4994c2f0ec47e9f5ce2db9"), "name" : [ "dalian", "shanghai" ] }
```

### $exists

查询包含某个字段的文档。

```javascript
> db.personalinfo.find({age:{$exists:true}});
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db4"), "name" : "zhangsan", "age" : 10 }
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db5"), "name" : "lisi", "age" : 11 }
{ "_id" : ObjectId("5a498d87f0ec47e9f5ce2db6"), "name" : "wangsu", "age" : 12 }
```
$exists要和$in结合使用来判断某个字段的值为null，并且字段真的存在的情况下，默认age:null的查询方式，会把没有这个字段的数据也查出来。

```javascript
> db.personalinfo.insert({name:'zhaoliu', age:null});
WriteResult({ "nInserted" : 1 })
> db.personalinfo.insert({name:'zhaoliu', myage:14});
WriteResult({ "nInserted" : 1 })
> db.personalinfo.find({age:null});
{ "_id" : ObjectId("5a499774f0ec47e9f5ce2dba"), "name" : "zhaoliu", "age" : null }
{ "_id" : ObjectId("5a49977ef0ec47e9f5ce2dbb"), "name" : "zhaoliu", "myage" : 14 }
> db.personalinfo.find({age:{$in:[null],$exists: true}});
{ "_id" : ObjectId("5a499774f0ec47e9f5ce2dba"), "name" : "zhaoliu", "age" : null }
> 
```


### $mod

$mod是取模

```javacript
> db.personalinfo.find({age:{$mod:[5,2]}});
{ "_id" : ObjectId("5a498d87f0ec47e9f5ce2db6"), "name" : "wangsu", "age" : 12 }
```


### $ne

$ne表示不等于

```javascript
> db.personalinfo.find({age:{$ne:5}});
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db4"), "name" : "zhangsan", "age" : 10 }
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db5"), "name" : "lisi", "age" : 11 }
{ "_id" : ObjectId("5a498d87f0ec47e9f5ce2db6"), "name" : "wangsu", "age" : 12 }
{ "_id" : ObjectId("5a499774f0ec47e9f5ce2dba"), "name" : "zhaoliu", "age" : null }
{ "_id" : ObjectId("5a49977ef0ec47e9f5ce2dbb"), "name" : "zhaoliu", "myage" : 14 }
> db.personalinfo.find({age:{$ne:5, $exists:1}});
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db4"), "name" : "zhangsan", "age" : 10 }
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db5"), "name" : "lisi", "age" : 11 }
{ "_id" : ObjectId("5a498d87f0ec47e9f5ce2db6"), "name" : "wangsu", "age" : 12 }
{ "_id" : ObjectId("5a499774f0ec47e9f5ce2dba"), "name" : "zhaoliu", "age" : null }
```

### $in

```javascript
> db.personalinfo.find({age:{$in:[11,12]}});
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db5"), "name" : "lisi", "age" : 11 }
{ "_id" : ObjectId("5a498d87f0ec47e9f5ce2db6"), "name" : "wangsu", "age" : 12 }
```

not in

```javascript
> db.personalinfo.find({age:{$nin:[11,12]}});
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db4"), "name" : "zhangsan", "age" : 10 }
```


### $size

根据数组长度筛选

```java
db.mydemo.insert({myarray:[1,2,3,4]});
db.mydemo.insert({myarray:[1,2,3]});
db.mydemo.insert({myarray:[1,2,3,5]});

> db.mydemo.find({myarray: {$size: 3}})
{ "_id" : ObjectId("5a4999d8f26cb8a9ec47407e"), "myarray" : [ 1, 2, 3 ] }
```

### /a/

查询某个字段包含字符

```javascript
> db.personalinfo.find({name:/a/})
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db4"), "name" : "zhangsan", "age" : 10 }
{ "_id" : ObjectId("5a498d87f0ec47e9f5ce2db6"), "name" : "wangsu", "age" : 12 }
```

### $where

$where比较常用在一些复杂的查询条件，它的内容是一个JavaScript的代码表达式。

```java
> db.personalinfo.find({$where: 'this.age > 10'});
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db5"), "name" : "lisi", "age" : 11 }
{ "_id" : ObjectId("5a498d87f0ec47e9f5ce2db6"), "name" : "wangsu", "age" : 12 }
```

### 分页

```javascript
> db.personalinfo.find().count();
3
> db.personalinfo.find().skip(1);
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db5"), "name" : "lisi", "age" : 11 }
{ "_id" : ObjectId("5a498d87f0ec47e9f5ce2db6"), "name" : "wangsu", "age" : 12 }
> db.personalinfo.find().limit(2);
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db4"), "name" : "zhangsan", "age" : 10 }
{ "_id" : ObjectId("5a498d86f0ec47e9f5ce2db5"), "name" : "lisi", "age" : 11 }
```

count()默认是统计整个文档的数量，要根据之前的条件统计，需要加上参数true。

```javascript
> db.personalinfo.find().limit(2).count();
3
> db.personalinfo.find().limit(2).count(true);
2
```

查询就介绍到这里，后面的文章将继续介绍MongoDB的聚合操作。