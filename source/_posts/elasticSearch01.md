---
title: ElasticSearch01-介绍
tags: [ElasticSearch]
date: 2018-06-03 11:46:54
categories: ElasticSearch
---

# 简介

官网：http://www.elastic.co/products/elasticsearch

系列文章版本基于ElasticSearch5.2



## 什么是Elasticsearch

ElasticSearch是一个基于Lucene的搜索服务器。它提供了一个分布式多用户能力的全文搜索引擎，基于RESTful web接口。Elasticsearch是用Java开发的，并作为Apache许可条款下的开放源码发布，是当前流行的企业级搜索引擎。设计用于云计算中，能够达到实时搜索，稳定，可靠，快速，安装使用方便。

<!--more-->

### 什么是搜索？

百度：我们比如说想找寻任何的信息的时候，就会上百度去搜索一下，比如说找一部自己喜欢的电影，或者说找一本喜欢的书，或者找一条感兴趣的新闻（提到搜索的第一印象）
但是百度 != 搜索，这是不对的

还有一种是垂直搜索（站内搜索）：

互联网的搜索：电商网站，招聘网站，新闻网站，各种app
IT系统的搜索：OA软件，办公自动化软件，会议管理，日程管理，项目管理，员工管理，搜索“张三”，“张三儿”，“张小三”；有个电商网站，卖家，后台管理系统，搜索“牙膏”，订单，“牙膏相关的订单”

搜索，就是在任何场景下，找寻你想要的信息，输入一段你要搜索的关键字，期望找到这个关键字相关的有些信息

### 如果用数据库做搜索会怎么样？

做软件开发或者对IT、计算机有一定的了解的话，都知道数据都是存储在数据库里面的，比如说电商网站的商品信息，招聘网站的职位信息，新闻网站的新闻信息，等等。所以说很自然的一点，如果说从技术的角度去考虑，如何实现如电商网站内部的搜索功能，就可以考虑去使用数据库去进行搜索。

**弊端：**

1. 每条记录的指定字段的文本，可能会很长，比如说“商品描述”字段的长度，有长达数千个，甚至数万个字符，这个时候，每次都要对每条记录的所有文本进行扫描，懒判断，包不包含指定的关键词（比如说“牙膏”）
2. 不能将搜索词拆分开来，尽可能去搜索更多的符合你的期望的结果，比如输入“生化机”，就搜索不出来“生化危机”，也就是没有分词功能。

而且用数据库来实现搜索，是不太靠谱的。通常来说，性能会很差。


### 什么是全文检索和Lucene？

1. 全文检索，倒排索引

	![](/img/es/01/什么是全文检索.png)
	
2. lucene，就是一个jar包，里面包含了封装好的各种建立倒排索引，以及进行搜索的代码，包括各种算法。我们就用java开发的时候，引入lucene jar，然后基于lucene的api进行去进行开发就可以了。用lucene，我们就可以去将已有的数据建立索引，lucene会在本地磁盘上面，给我们组织索引的数据结构。另外的话，我们也可以用lucene提供的一些功能和api来针对磁盘上额

### 什么是Elasticsearch？


![](/img/es/01/什么是Elasticsearch.png)



## Elasticsearch功能介绍

### 分布式的搜索引擎和数据分析引擎

搜索：百度，网站的站内搜索，IT系统的检索

数据分析：电商网站，最近7天牙膏这种商品销量排名前10的商家有哪些；新闻网站，最近1个月访问量排名前3的新闻版块是哪些


### 全文检索，结构化检索，数据分析

* 全文检索：我想搜索商品名称包含牙膏的商品，`select * from products where product_name like "%牙膏%"`
* 结构化检索：我想搜索商品分类为日化用品的商品都有哪些，`select * from products where category='日化用品'`

	部分匹配、自动完成、搜索纠错、搜索推荐
* 数据分析：我们分析每一个商品分类下有多少个商品，`select category_id,count(*) from products group by category_id`


### 对海量数据进行近实时的处理

* 分布式：ES自动可以将海量数据分散到多台服务器上去存储和检索
* 海量数据的处理：分布式以后，就可以采用大量的服务器去存储和检索数据，自然而然就可以实现海量数据的处理了
* 近实时：如果检索数据要花费1小时（这就不叫近实时，这叫离线批处理，batch-processing）；近实时是在秒级别对数据进行搜索和分析

跟分布式/海量数据相反：lucene，单机应用，只能在单台服务器上使用，最多只能处理单台服务器可以处理的数据量


### Elasticsearch的适用场景


1. 维基百科，类似百度百科，牙膏，牙膏的维基百科，全文检索，高亮，搜索推荐
2. The Guardian（国外新闻网站），类似搜狐新闻，用户行为日志（点击，浏览，收藏，评论）+社交网络数据（对某某新闻的相关看法），数据分析，给到每篇新闻文章的作者，让他知道他的文章的公众反馈（好，坏，热门，垃圾，鄙视，崇拜）
3. Stack Overflow（国外的程序异常讨论论坛），IT问题，程序的报错，提交上去，有人会跟你讨论和回答，全文检索，搜索相关问题和答案，程序报错了，就会将报错信息粘贴到里面去，搜索有没有对应的答案
4. GitHub（开源代码管理），搜索上千亿行代码
5. 电商网站，检索商品
6. 日志数据分析，logstash采集日志，ES进行复杂的数据分析（ELK技术，elasticsearch+logstash+kibana）
7. 商品价格监控网站，用户设定某商品的价格阈值，当低于该阈值的时候，发送通知消息给用户，比如说订阅牙膏的监控，如果高露洁牙膏的家庭套装低于50块钱，就通知我，我就去买
8. BI系统，商业智能，Business Intelligence。比如说有个大型商场集团，BI，分析一下某某区域最近3年的用户消费金额的趋势以及用户群体的组成构成，产出相关的数张报表，**区，最近3年，每年消费金额呈现100%的增长，而且用户群体85%是高级白领，开一个新商场。ES执行数据分析和挖掘，Kibana进行数据可视化
9. 国内：站内搜索（电商，招聘，门户，等等），IT系统搜索（OA，CRM，ERP，等等），数据分析（ES热门的一个使用场景）

### Elasticsearch的特点

1. 可以作为一个大型分布式集群（数百台服务器）技术，处理PB级数据，服务大公司；也可以运行在单机上，服务小公司
2. Elasticsearch不是什么新技术，主要是将全文检索、数据分析以及分布式技术，合并在了一起，才形成了独一无二的ES；lucene（全文检索），商用的数据分析软件（也是有的），分布式数据库（mycat）
3. 对用户而言，是开箱即用的，非常简单，作为中小型的应用，直接3分钟部署一下ES，就可以作为生产环境的系统来使用了，数据量不大，操作不是太复杂
4. 数据库的功能面对很多领域是不够用的（事务，还有各种联机事务型的操作）；特殊的功能，比如全文检索，同义词处理，相关度排名，复杂数据分析，海量数据的近实时处理；Elasticsearch作为传统数据库的一个补充，提供了数据库所不能提供的很多功能
 

## ElasticSearch核心概念

### lucene和elasticsearch的前世今生


elasticsearch，基于lucene，隐藏复杂性，提供简单易用的restful api接口、java api接口（还有其他语言的api接口）

1. 分布式的文档存储引擎
2. 分布式的搜索引擎和分析引擎
3. 分布式海量数据，支持PB级数据

开箱即用，优秀的默认参数，不需要任何额外设置，完全开源

关于elasticsearch的一个传说，有一个程序员失业了，陪着自己老婆去英国伦敦学习厨师课程。程序员在失业期间想给老婆写一个菜谱搜索引擎，觉得lucene实在太复杂了，就开发了一个封装了lucene的开源项目，compass。后来程序员找到了工作，是做分布式的高性能项目的，觉得compass不够，就写了elasticsearch，让lucene变成分布式的系统。

### elasticsearch的核心概念

1. Near Realtime（NRT）：近实时，两个意思，从写入数据到数据可以被搜索到有一个小延迟（大概1秒）；基于es执行搜索和分析可以达到秒级
	
	![Elasticsearch近实时概念的解释](/img/es/01/Elasticsearch近实时概念的解释.png)


2. Cluster：集群，包含多个节点，每个节点属于哪个集群是通过一个配置（集群名称，默认是elasticsearch）来决定的，对于中小型应用来说，刚开始一个集群就一个节点很正常
3. Node：节点，集群中的一个节点，节点也有一个名称（默认是随机分配的），节点名称很重要（在执行运维管理操作的时候），默认节点会去加入一个名称为“elasticsearch”的集群，如果直接启动一堆节点，那么它们会自动组成一个elasticsearch集群，当然一个节点也可以组成一个elasticsearch集群
4. Document&field：文档，es中的最小数据单元，一个document可以是一条客户数据，一条商品分类数据，一条订单数据，通常用JSON数据结构表示，每个index下的type中，都可以去存储多个document。一个document里面有多个field，每个field就是一个数据字段。
5. Index：索引，包含一堆有相似结构的文档数据，比如可以有一个客户索引，商品分类索引，订单索引，索引有一个名称。一个index包含很多document，一个index就代表了一类类似的或者相同的document。比如说建立一个product index，商品索引，里面可能就存放了所有的商品数据，所有的商品document。
6. Type：类型，每个索引里都可以有一个或多个type，type是index中的一个逻辑数据分类，一个type下的document，都有相同的field，比如博客系统，有一个索引，可以定义用户数据type，博客数据type，评论数据type。

	```
	商品index，里面存放了所有的商品数据，商品document

	但是商品分很多种类，每个种类的document的field可能不太一样，比如说电器商品，可能还包含一些诸如售后时间范围这样的特殊field；生鲜商品，还包含一些诸如生鲜保质期之类的特殊field
	
	type，日化商品type，电器商品type，生鲜商品type
	
	日化商品type：product_id，product_name，product_desc，category_id，category_name
	电器商品type：product_id，product_name，product_desc，category_id，category_name，service_period
	生鲜商品type：product_id，product_name，product_desc，category_id，category_name，eat_period
	
	每一个type里面，都会包含一堆document
	
	
	{
	  "product_id": "2",
	  "product_name": "长虹电视机",
	  "product_desc": "4k高清",
	  "category_id": "3",
	  "category_name": "电器",
	  "service_period": "1年"
	}
	
	
	{
	  "product_id": "3",
	  "product_name": "基围虾",
	  "product_desc": "纯天然，冰岛产",
	  "category_id": "4",
	  "category_name": "生鲜",
	  "eat_period": "7天"
	}
	```
	
7. shard：单台机器无法存储大量数据，es可以将一个索引中的数据切分为多个shard，分布在多台服务器上存储。有了shard就可以横向扩展，存储更多数据，让搜索和分析等操作分布到多台服务器上去执行，提升吞吐量和性能。每个shard都是一个lucene index。
8. replica：任何一个服务器随时可能故障或宕机，此时shard可能就会丢失，因此可以为每个shard创建多个replica副本。replica可以在shard故障时提供备用服务，保证数据不丢失，多个replica还可以提升搜索操作的吞吐量和性能。primary shard（建立索引时一次设置，不能修改，默认5个），replica shard（随时修改数量，默认1个），默认每个索引10个shard，5个primary shard，5个replica shard，最小的高可用配置，是2台服务器。

	![shard和replica的解释](/img/es/01/shard和replica的解释.png)



### elasticsearch核心概念 vs. 数据库核心概念



| Elasticsearch |  数据库      | 
|----------|:-------------:|
| Document |  行 |
| Type |    表   |
| Index | 库|
