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



# 分页搜索

## 分页搜索语法

参数：

* size: 一页多少条
* from：从多少条开始


```
GET /_search?size=10&from=0
```

返回结果里面写了总共有多少条：

```json
"hits": {
    "total": 8,
```

## deep paging问题

deep paging就是搜索特别深，比如总共有3w条数据，每页10条数据，搜索最后一页

请求先发到coordinate node（通常是client节点），然后请求会分配到不同的节点上去找数据，每个个shard都会把所有的数据找出来，排序后取最后10条，返回给客户端。

这个过程会耗费很大的网络带宽、内存和CPU，所以deep paging有较大的性能问题，应该尽量避免做出这种deep paging操作。


# query string语法介绍

```
GET /test_index/test_type/_search?q=test_field:test
GET /test_index/test_type/_search?q=+test_field:test
GET /test_index/test_type/_search?q=-test_field:test
```

* + test_field包含test
* - test_field不包含test

# \_all metadata介绍

	GET /test_index/test_type/_search?q=test
	
直接可以搜索所有的field，任意一个field包含指定的关键字就可以搜索出来。我们在进行中搜索的时候，难道是对document中的每一个field都进行一次搜索吗？不是这样的。

es中的`_all`元数据，在建立索引的时候，我们插入一条document，它里面包含了多个field，此时es会自动将多个field的值，全部用字符串的方式串联起来，变成一个长的字符串，作为`_all` field的值，同时建立索引。

后面如果在搜索的时候，没有对某个field指定搜索，就默认搜索_all field，其中是包含了所有field的值的。

举个例子

```json
{
  "name": "jack",
  "age": 26,
  "email": "jack@sina.com",
  "address": "guamgzhou"
}
```

`jack 26 jack@sina.com guangzhou`，作为这一条document的`_all` field的值，同时进行分词后建立对应的倒排索引。

# mapping介绍

先插入几条数据，让ES自动建立一个索引：

```json
PUT /website/article/1
{
  "post_date": "2017-01-01",
  "title": "my first article",
  "content": "this is my first article in this website",
  "author_id": 11400
}

PUT /website/article/2
{
  "post_date": "2017-01-02",
  "title": "my second article",
  "content": "this is my second article in this website",
  "author_id": 11400
}

PUT /website/article/3
{
  "post_date": "2017-01-03",
  "title": "my third article",
  "content": "this is my third article in this website",
  "author_id": 11400
}
```

下面进行搜索测试：

```json
GET /website/article/_search?q=2017			3条结果             
GET /website/article/_search?q=2017-01-01        	3条结果
GET /website/article/_search?q=post_date:2017-01-01   	1条结果
GET /website/article/_search?q=post_date:2017         	1条结果
```

这个搜索结果，不太符合我们的期望，这里涉及到ES的mapping了，具体这个数字是怎么搜索出来的，后面[案例详解](#案例详解)会讲到。

自动或手动为index中的type建立的一种数据结构和相关配置，简称为mapping，
`dynamic mapping`，就是ES自动为我们建立index，创建type，以及type对应的mapping，mapping中包含了每个field对应的数据类型，以及如何分词等设置。


如何查看mapping？

```json
GET /website/_mapping/article

{
  "website": {
    "mappings": {
      "article": {
        "properties": {
          "author_id": {
            "type": "long"
          },
          "content": {
            "type": "text",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256
              }
            }
          },
          "post_date": {
            "type": "date"
          },
          "title": {
            "type": "text",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256
              }
            }
          }
        }
      }
    }
  }
}
```


搜索结果为什么不一致，因为es自动建立mapping的时候，为不同的field设置了不同的data type。不同的data type的分词、搜索等行为是不一样的。所以出现了\_all field和post\_date field的搜索表现完全不一样的结果。

# 精确搜索和全文搜索对比

## 精确搜索

2017-01-01，用精确值搜索的时候，必须输入2017-01-01，才能搜索出来
如果你输入一个01，是搜索不出来的

## 全文搜索

1. 缩写 vs. 全称：cn vs. china
2. 格式转化：like liked likes
3. 大小写：Tom vs tom
4. 同义词：like vs love

2017-01-01，2017 01 01，搜索2017，或者01，都可以搜索出来

china，搜索cn，也可以将china搜索出来		
likes，搜索like，也可以将likes搜索出来		
Tom，搜索tom，也可以将Tom搜索出来		
like，搜索love，同义词，也可以将like搜索出来		

就不是说单纯的只是匹配完整的一个值，而是可以对值进行拆分词语后（分词）进行匹配，也可以通过缩写、时态、大小写、同义词等进行匹配

# 倒排索引

倒排索引是实现“单词-文档矩阵”的一种具体存储形式，通过倒排索引，可以根据单词快速获取包含这个单词的文档列表。倒排索引主要由两个部分组成：“单词词典”和“倒排文件”。

先来两个文档：

```json
doc1：I really liked my small dogs, and I think my mom also liked them.
doc2：He never liked any dogs, so I hope that my mom will not expect me to liked him.
```


接下来分词，初步的倒排索引的建立。

演示一下倒排索引最简单的建立的一个过程

```
word		doc1			doc2

I			*				*
really		*
liked		*				*
my			*				*
small		*	
dogs		*
and			*
think		*
mom			*				*
also		*
them		*	
He							*
never						*
any							*
so							*
hope						*
that						*
will						*
not							*
expect						*
me							*
to							*
him							*
```


如果用`mother like little dog`去搜索，是搜不到结果的，搜索的时候会被拆成4个单词去搜索，即

```
mother
like
little
dog
```

但是，在我们看来mother和mom是同义词，like和liked也是一样的意思，little和small也一样，dog和dogs也一样。

所以在简历倒排所以的时候，会执行一个操作，对拆分出的各个单词进行相应的处理，以提升后面搜索的时候能够搜索到相关联的文档的概率，这个过程叫normalization。

比如时态的转换，单复数的转换，同义词的转换，大小写的转换等等

mom —> mother			
liked —> like		
small —> little		
dogs —> dog		

重新建立倒排索引，加入normalization，再次用`mother liked little dog`搜索，doc1和doc2都会搜索出来。

# 分词器介绍

分词器，是将用户输入的一段文本，分析成符合逻辑的一种工具，给你一段文本，然后将这段句子拆分成一个一个的单个的单词，同时对每个单词进行normalization（时态转换，单复数转换），分词器
提升recall召回率（召回率：搜索的时候，增加能够搜索到的结果的数量）

1. character filter：在一段文本进行分词之前，先进行预处理，比如说最常见的就是，过滤html标签（<span>hello<span> --> hello），& --> and（I&you --> I and you）
2. tokenizer：分词，hello you and me --> hello, you, and, me
3. token filter：lowercase，stop word，synonymom，dogs --> dog，liked --> like，Tom --> tom，a/the/an --> 干掉，mother --> mom，small --> little

分词器很重要，它将一段文本进行各种处理，最后处理好的结果才会拿去建立倒排索引。

## 内置分词器介绍

`Set the shape to semi-transparent by calling set_trans(5)`


* standard analyzer：set, the, shape, to, semi, transparent, by, calling, set_trans, 5（默认的是standard）
* simple analyzer：set, the, shape, to, semi, transparent, by, calling, set, trans
* whitespace analyzer：Set, the, shape, to, semi-transparent, by, calling, set_trans(5)
* language analyzer（特定的语言的分词器，比如说，english，英语分词器）：set, shape, semi, transpar, call, set_tran, 5


## query string分词

**query string必须以和index建立时相同的analyzer进行分词**

比如我们有一个document，其中有一个field，包含的value是：hello you and me。

我们要搜索这个document对应的index，搜索文本是hell me，这个搜索文本就是query string。		
query string，默认情况下，es会使用它对应的field建立倒排索引时相同的分词器去进行分词和normalization，只有这样才能实现正确的搜索。

建立倒排索引的时候，将dogs --> dog。结果搜索的时候用dogs去搜索，那不就搜索不到了吗？所以搜索的时候，那个dogs也必须变成dog才行。才能搜索到。

**query string对exact value（精确搜索）和full text（全文搜索）的区别对待**

>所以不同类型的field，可能有的就是full text，有的就是exact value。

## 案例详解

`GET /_search?q=2017`

这个查询前面说了，搜索的是`_all` field，document所有的field都会拼接成一个大字符串，进行分词搜索。

拼接以后的字符串：2017-01-02 my second article this is my second article in this website 11400

```
			doc1		doc2		doc3
2017		*			*			*
01			* 		
02						*
03									*
```

所以用2017去搜索，自然会搜索到3个。


那么用`GET /_search?q=2017-01-01`去搜索呢

2017-01-01这个query string会用跟建立倒排索引一样的分词器去进行分词，所以搜索的条件会被分词成这样：

```
2017
01
01
```
所以还是会搜索到3条。

接下来是`GET /_search?q=post_date:2017-01-01`，这里加了查询的字段了，这个字段的类型是date，es会用特别的方式进行处理，转换成时间去对这个字段进行搜索。

## 测试分词器

给一段文本和指定分词器进行分词：

```json
GET /_analyze
{
  "analyzer": "standard",
  "text": "Text to analyze"
}

{
  "tokens": [
    {
      "token": "text",
      "start_offset": 0,
      "end_offset": 4,
      "type": "<ALPHANUM>",
      "position": 0
    },
    {
      "token": "to",
      "start_offset": 5,
      "end_offset": 7,
      "type": "<ALPHANUM>",
      "position": 1
    },
    {
      "token": "analyze",
      "start_offset": 8,
      "end_offset": 15,
      "type": "<ALPHANUM>",
      "position": 2
    }
  ]
}
```

# mapping详解

为了能够将时间域视为时间，数字域视为数字，字符串域视为全文或精确值字符串， Elasticsearch 需要知道每个域中数据的类型。这个信息包含在mapping中。

mapping就是index的type的元数据，每个type都有一个自己的mapping，决定了数据类型，建立倒排索引的行为，还有进行搜索的行为。

1. 往es里面直接插入数据，es会自动建立索引，同时建立type以及对应的mapping。
2. mapping中定义了每个field的数据类型。
3. 不同的数据类型（比如说text和date），可能有的是exact value，有的是full text。
4. exact value：在建立倒排索引、分词的时候，是将整个值一起作为一个关键词建立到倒排索引中的；full text：会经历各种各样的处理、分词、normaliztion（时态转换，同义词转换，大小写转换），才会建立到倒排索引中。
5. 同时呢，exact value和full text类型的field就决定了，在一个搜索过来的时候，对exact value field或者是full text field进行搜索的行为也是不一样的，会跟建立倒排索引的行为保持一致；比如说exact value搜索的时候，就是直接按照整个值进行匹配，full text query string，也会进行分词和normalization再去倒排索引中去搜索。
6. 可以用es的dynamic mapping，让其自动建立mapping，包括自动设置数据类型；也可以提前手动创建index和type的mapping，自己对各个field进行设置，包括数据类型，包括索引行为、分词器，等等。


## mapping数据类型

Elasticsearch支持如下简单域类型：

* 字符串: string
* 整数 : byte, short, integer, long
* 浮点数: float, double
* 布尔型: boolean
* 日期: date

dynamic mapping：当你索引一个包含新域的文档--之前未曾出现-- Elasticsearch 会使用 动态映射 ，通过JSON中基本数据类型，尝试猜测域类型，使用如下规则：

true or false	-->	boolean		
123		-->	long		
123.45		-->	double		
2017-01-01	-->	date		
"hello world"	-->	string/text		

>这意味着如果你通过引号( "123" )索引一个数字，它会被映射为 string 类型，而不是 long 。但是，如果这个域已经映射为 long ，那么 Elasticsearch 会尝试将这个字符串转化为 long ，如果无法转化，则抛出一个异常。


## 查看mapping

```json
GET website/_mapping/article

{
  "website": {
    "mappings": {
      "article": {
        "properties": {
          "author_id": {
            "type": "long"
          },
          "content": {
            "type": "text",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256
              }
            }
          },
          "post_date": {
            "type": "date"
          },
          "title": {
            "type": "text",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256
              }
            }
          }
        }
      }
    }
  }
}
```

## 自定义mapping

mapping在建立以后，只能新增字段，不能修改字段类型。

先创建一个mapping：

```json
PUT /website
{
  "mappings": {
    "article": {
      "properties": {
        "author_id": {
          "type": "long"
        },
        "title": {
          "type": "text",
          "analyzer": "english"
        },
        "content": {
          "type": "text"
        },
        "post_date": {
          "type": "date"
        },
        "publisher_id": {
          "type": "text",
          "index": "not_analyzed"
        }
      }
    }
  }
}
```

试着修改mapping，比如`author_id`，会得到一个错误：

```json
PUT /website
{
  "mappings": {
    "article": {
      "properties": {
        "author_id": {
          "type": "text"
        }
      }
    }
  }
}


{
  "error": {
    "root_cause": [
      {
        "type": "index_already_exists_exception",
        "reason": "index [website/8KNSiw4wRq-67EVN20ll3A] already exists",
        "index_uuid": "8KNSiw4wRq-67EVN20ll3A",
        "index": "website"
      }
    ],
    "type": "index_already_exists_exception",
    "reason": "index [website/8KNSiw4wRq-67EVN20ll3A] already exists",
    "index_uuid": "8KNSiw4wRq-67EVN20ll3A",
    "index": "website"
  },
  "status": 400
}
```

但是如果是给已经存在的mapping新增一个field，就没问题了：

```json
PUT /website/_mapping/article
{
  "properties" : {
    "new_field" : {
      "type" :    "string",
      "index":    "not_analyzed"
    }
  }
}

{
  "acknowledged": true
}
```

## 测试mapping

你可以使用 analyze API 测试字符串域的映射，下面测试某一个mapping的字段分词情况：

```json
GET /website/_analyze
{
  "field": "content",
  "text": "my-dogs" 
}
```

## mapping复杂数据类型

除了我们提到的简单标量数据类型， JSON 还有 null 值，数组，和对象，这些 Elasticsearch 都是支持的

### multivalue field（多值域）

很有可能，我们希望 tag 域 包含多个标签。我们可以以数组的形式索引标签：

`{ "tag": [ "search", "nosql" ]}`

对于数组，没有特殊的映射需求。任何域都可以包含0、1或者多个值，就像全文域分析得到多个词条。

这暗示 数组中所有的值必须是相同数据类型的 。你不能将日期和字符串混在一起。如果你通过索引数组来创建新的域，Elasticsearch 会用数组中第一个值的数据类型作为这个域的 类型。

### empty field（空域）

当然，数组可以为空。 这相当于存在零值。 事实上，在 Lucene 中是不能存储 null 值的，所以我们认为存在 null 值的域为空域。

下面三种域被认为是空的，它们将不会被索引：

```json
"null_value":               null,
"empty_array":              [],
"array_with_null_value":    [ null ]
```
### object field（多层级对象）

我们讨论的最后一个 JSON 原生数据类是 对象 -- 在其他语言中称为哈希，哈希 map，字典或者关联数组。

内部对象 经常用于 嵌入一个实体或对象到其它对象中。例如，与其在 tweet 文档中包含 user_name 和 user_id 域，我们也可以这样写：

```json
PUT /tweet/tweet/1
{
    "tweet":            "Elasticsearch is very flexible",
    "user": {
        "id":           "@johnsmith",
        "gender":       "male",
        "age":          26,
        "name": {
            "full":     "John Smith",
            "first":    "John",
            "last":     "Smith"
        }
    }
}

GET /tweet/tweet/_mapping

{
  "tweet": {
    "mappings": {
      "tweet": {
        "properties": {
          "tweet": {
            "type": "text",
            "fields": {
              "keyword": {
                "type": "keyword",
                "ignore_above": 256
              }
            }
          },
          "user": {
            "properties": {
              "age": {
                "type": "long"
              },
              "gender": {
                "type": "text",
                "fields": {
                  "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                  }
                }
              },
              "id": {
                "type": "text",
                "fields": {
                  "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                  }
                }
              },
              "name": {
                "properties": {
                  "first": {
                    "type": "text",
                    "fields": {
                      "keyword": {
                        "type": "keyword",
                        "ignore_above": 256
                      }
                    }
                  },
                  "full": {
                    "type": "text",
                    "fields": {
                      "keyword": {
                        "type": "keyword",
                        "ignore_above": 256
                      }
                    }
                  },
                  "last": {
                    "type": "text",
                    "fields": {
                      "keyword": {
                        "type": "keyword",
                        "ignore_above": 256
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 内部对象如何索引

Lucene 不理解内部对象。 Lucene 文档是由一组键值对列表组成的。为了能让 Elasticsearch 有效地索引内部类，它把我们的文档转化成这样：

```json
{
    "tweet":            [elasticsearch, flexible, very],
    "user.id":          [@johnsmith],
    "user.gender":      [male],
    "user.age":         [26],
    "user.name.full":   [john, smith],
    "user.name.first":  [john],
    "user.name.last":   [smith]
}
```


