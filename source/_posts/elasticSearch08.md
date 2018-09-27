---
title: ElasticSearch08-内核原理
tags: [ElasticSearch]
date: 2018-09-28 15:12:35
categories: ElasticSearch
---


# 倒排索引

如何使文本被搜索到是搜索引擎很重要的一部分，倒排索引是很适合搜索的。

因为它的结构：

1. 包含这个关键词的document list
1. 包含这个关键词的所有document的数量：IDFinverse document frequency. 
1. 这个关键词在每个document中出现的次数：TFterm frequency. 
<!--more-->
1. 这个关键词在这个document中的次序
1. 每个document的长度：length norm
1. 包含这个关键词的所有document的平均长度

```json
Term  | Doc 1 | Doc 2 | Doc 3 | ...
------------------------------------
brown |   X   |       |  X    | ...
fox   |   X   |   X   |  X    | ...
quick |   X   |   X   |       | ...
the   |   X   |       |  X    | ...
```

倒排索引是不可变的，它的好处如下：

* 不需要锁，提升并发能力，避免锁的问题
* 数据不变，一直保存在os cache中，只要cache内存足够
* filter cache一直驻留在内存，因为数据不变
* 可以压缩，节省cpu和io开销


当然，一个不变的索引也有不好的地方。主要事实是它是不可变的! 你不能修改它。如果你需要让一个新的文档 可被搜索，你需要重建整个索引。这要么对一个索引所能包含的数据量造成了很大的限制，要么对索引可被更新的频率造成了很大的限制。

# 文档写入原理

文档在写入的时候，ES的流程如下：

1. 新文档写入buffer
2. commit point
3. buffer中的数据写入新的index segment
4. 等待在os cache中的index segment被fsync强制刷到磁盘上
5. 新的index sgement被打开，供search使用
6. buffer被清空

![](https://www.elastic.co/guide/cn/elasticsearch/guide/current/images/elas_1102.png)

**删除和更新**

每次commit point时，会有一个.del文件，标记了哪些segment中的哪些document被标记为deleted了。	
搜索的时候，会依次查询所有的segment，从旧的到新的，比如被修改过的document，在旧的segment中，会标记为deleted，在新的segment中会有其新的数据。

# 优化写入流程

现有流程的问题，每次都必须等待fsync将segment刷入磁盘，才能将segment打开供search使用，这样的话从一个document写入，到它可以被搜索，可能会超过1分钟！这就不是近实时的搜索了！主要瓶颈在于fsync实际发生磁盘IO写数据进磁盘，是很耗时的。


写入流程被改进如下：

1. 数据写入buffer
2. 每隔一定时间，buffer中的数据被写入segment文件，但是先写入os cache
3. 只要segment写入os cache，那就直接打开供search使用，不立即执行commit

![](https://www.elastic.co/guide/cn/elasticsearch/guide/current/images/elas_1105.png)

数据写入os cache，并被打开供搜索的过程，叫做refresh，默认是每隔1秒refresh一次。也就是说，每隔一秒就会将buffer中的数据写入一个新的index segment file，先写入os cache中。所以es是近实时的，数据写入到可以被搜索，默认是1秒。

POST /my_index/_refresh，可以手动refresh，一般不需要手动执行，没必要这样，让es自己搞就可以了。

比如说，我们现在的时效性要求比较低，只要求一条数据写入es，一分钟以后才让我们搜索到就可以了，那么就可以调整refresh interval。如果写的并发量和数据量比较大的话，refresh设置长一点可以优化写入速度，因为频繁的写入index segment file会比较占用资源。

```json
PUT /my_index
{
  "settings": {
    "refresh_interval": "60s" 
  }
}
```


# 可靠存储实现

再次优化的写入流程

1. 数据写入buffer缓冲和translog日志文件
2. 每隔一秒钟，buffer中的数据被写入新的segment file，并进入os cache，此时segment被打开并供search使用
3. buffer被清空
4. 重复1~3，新的segment不断添加，buffer不断被清空，而translog中的数据不断累加
5. 当translog长度达到一定程度的时候，commit操作发生
	1. buffer中的所有数据写入一个新的segment，并写入os cache，打开供使用
	2. buffer被清空
	3. 一个commit ponit被写入磁盘，标明了所有的index segment
	4. filesystem cache中的所有index segment file缓存数据，被fsync强行刷到磁盘上
	5. 现有的translog被清空，创建一个新的translog

**新的文档被添加到内存缓冲区并且被追加到了事务日志**

![新的文档被添加到内存缓冲区并且被追加到了事务日志](https://www.elastic.co/guide/cn/elasticsearch/guide/current/images/elas_1106.png)

**刷新（refresh）完成后, 缓存被清空但是事务日志不会**

![](https://www.elastic.co/guide/cn/elasticsearch/guide/current/images/elas_1107.png)

**事务日志不断积累文档**

![](https://www.elastic.co/guide/cn/elasticsearch/guide/current/images/elas_1108.png)

**在刷新（flush）之后，段被全量提交，并且事务日志被清空**

![](https://www.elastic.co/guide/cn/elasticsearch/guide/current/images/elas_1109.png)

## 数据恢复

OS cache中积累了不少数据，这个时候如果机器宕机了，虽然os cache的数据丢失了，但是translog的数据是存在的，可以基于translog和commit point进行数据恢复。

fsync+清空translog，就是flush，默认每隔30分钟flush一次，或者当translog过大的时候，也会flush。

POST /my_index/_flush，一般来说别手动flush，让它自动执行就可以了。


**translog**

translog本身，每隔5秒被fsync一次到磁盘上。在一次增删改操作之后，当fsync在primary shard和replica shard都成功之后，那次增删改操作才会成功。

但是这种在一次增删改时强行fsync translog可能会导致部分操作比较耗时，也可以允许部分数据丢失，设置异步fsync translog。

```json
PUT /my_index/_settings
{
    "index.translog.durability": "async",
    "index.translog.sync_interval": "5s"
}
```

如果你不确定这个行为的后果，最好是使用默认的参数（ "index.translog.durability": "request" ）来避免数据丢失。


# 段合并

前面说了，refresh操作默认是每秒一次，每秒生成一个新的segment file，这样文件太多了，而且每次search都要搜索所有的segment，很耗时。

ES默认会在后台执行segment merge操作，在merge的时候，被标记为deleted的document也会被彻底物理删除。

每次merge操作的执行流程：

1. 选择一些有相似大小的segment，merge成一个大的segment
2. 将新的segment flush到磁盘上去
3. 写一个新的commit point，包括了新的segment，并且排除旧的那些segment
4. 将新的segment打开供搜索
5. 将旧的segment删除

**两个提交了的段和一个未提交的段正在被合并到一个更大的段**

![](https://www.elastic.co/guide/cn/elasticsearch/guide/current/images/elas_1110.png)

**一旦合并结束，老的段被删除**

![](https://www.elastic.co/guide/cn/elasticsearch/guide/current/images/elas_1111.png)

## optimize API

optimize API大可看做是 强制合并 API 。它会将一个分片强制合并到 max_num_segments 参数指定大小的段数目。 这样做的意图是减少段的数量（通常减少到一个），来提升搜索性能。

POST /my_index/_optimize?max_num_segments=1，尽量不要手动执行，让它自动默认执行就可以了。
