---
title: ElasticSearch06-_Search API
tags: [ElasticSearch]
date: 2018-09-21 10:15:48
categories: ElasticSearch
---

此为龙果学院课程学习笔记，记录以后翻看

前面讲了简单的搜索、分词和映射，这篇文章讲ES的搜索API


# search API

Search API的基本语法：

这是一个空查询，空查询将返回所有索引库（indices)中的所有文档：

```json
GET /_search
{}
```
<!--more-->

只用一个查询字符串，你就可以在一个、多个或者 _all 索引库（indices）和一个、多个或者所有types中查询：

```json
GET /index_2014*/type1,type2/_search
{}
```

同时你可以使用 from 和 size 参数来分页：

```json
GET /_search
{
  "from": 30,
  "size": 10
}
```


> ##一个带请求体的 GET 请求？

> 某些特定语言（特别是 JavaScript）的 HTTP 库是不允许 GET 请求带有请求体的。 事实上，一些使用者对于 GET 请求可以带请求体感到非常的吃惊。

> 而事实是这个RFC文档 RFC 7231— 一个专门负责处理 HTTP 语义和内容的文档 — 并没有规定一个带有请求体的 GET 请求应该如何处理！结果是，一些 HTTP 服务器允许这样子，而有一些 — 特别是一些用于缓存和代理的服务器 — 则不允许。

> 对于一个查询请求，Elasticsearch 的工程师偏向于使用 GET 方式，因为他们觉得它比 POST 能更好的描述信息检索（retrieving information）的行为。然而，因为带请求体的 GET 请求并不被广泛支持，所以 search API 同时支持 POST 请求：

> ```json
POST /_search
{
  "from": 30,
  "size": 10
}
```
> 类似的规则可以应用于任何需要带请求体的 GET API。

# query dsl

查询表达式(Query DSL)是一种非常灵活又富有表现力的 查询语言。 Elasticsearch 使用它可以以简单的 JSON 接口来展现 Lucene 功能的绝大部分。在你的应用中，你应该用它来编写你的查询语句。它可以使你的查询语句更灵活、更精确、易读和易调试。

要使用这种查询表达式，只需将查询语句传递给 `query` 参数：

```json
GET /_search
{
    "query": {
        "match_all": {}
    }
}
```

## Query DSL 基本语法

```json
{
    QUERY_NAME: {
        ARGUMENT: VALUE,
        ARGUMENT: VALUE,...
    }
}

{
    QUERY_NAME: {
        FIELD_NAME: {
            ARGUMENT: VALUE,
            ARGUMENT: VALUE,...
        }
    }
}
```

示例：

```json
GET /test_index/test_type/_search 
{
  "query": {
    "match": {
      "test_field": "test"
    }
  }
}
```

## 组合多个搜索条件

利用bool查询进行组合搜索，数据准备：

```json
PUT /website/article/1
{
  "title": "my elasticsearch article",
  "content": "es is very good",
  "author_id": 110
}

PUT /website/article/2
{
  "title": "my hadoop article",
  "content": "hadoop is very good",
  "author_id": 111
}

PUT /website/article/3
{
  "title": "my elasticsearch article",
  "content": "es is very bad",
  "author_id": 111
}
```

>搜索需求：title必须包含elasticsearch，content可以包含elasticsearch也可以不包含，author_id必须不为111


```json
GET /website/article/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "title": "elasticsearch"
          }
        }
      ],
      "should": [
        {
          "match": {
            "content": "elasticsearch"
          }
        }
      ],
      "must_not": [
        {
          "match": {
            "author_id": "111"
          }
        }
      ]
    }
  }
}

{
  "took": 23,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "failed": 0
  },
  "hits": {
    "total": 1,
    "max_score": 0.25316024,
    "hits": [
      {
        "_index": "website",
        "_type": "article",
        "_id": "1",
        "_score": 0.25316024,
        "_source": {
          "title": "my elasticsearch article",
          "content": "es is very good",
          "author_id": 110
        }
      }
    ]
  }
}
```

# 查询和过滤（query & filter)

在ES中查找数据，除了查询还有过滤

## query与filter示例

```json
PUT /company/employee/2
{
  "address": {
    "country": "china",
    "province": "jiangsu",
    "city": "nanjing"
  },
  "name": "tom",
  "age": 30,
  "join_date": "2016-01-01"
}

PUT /company/employee/3
{
  "address": {
    "country": "china",
    "province": "shanxi",
    "city": "xian"
  },
  "name": "marry",
  "age": 35,
  "join_date": "2015-01-01"
}
```

**搜索请求：年龄必须大于等于30，同时join_date必须是2016-01-01**

```json
GET /company/employee/_search
{
  "query": {
    "bool": {
      "must": [
        {
          "match": {
            "join_date": "2016-01-01"
          }
        }
      ],
      "filter": {
        "range": {
          "age": {
            "gte": 30
          }
        }
      }
    }
  }
}
```


## filter与query对比

* filter：仅仅只是按照搜索条件过滤出需要的数据而已，不计算任何相关度分数，对相关度没有任何影响。
* query：会去计算每个document相对于搜索条件的相关度，并按照相关度进行排序。

一般来说，如果你是在进行搜索，需要将最匹配搜索条件的数据先返回，那么用query；如果你只是要根据一些条件筛选出一部分数据，不关注其排序，那么用filter。

## filter与query性能比较

* filter：不需要计算相关度分数，不需要按照相关度分数进行排序，同时还有内置的自动cache最常使用filter的数据
* query：相反，要计算相关度分数，按照分数进行排序，而且无法cache结果


# query搜索实战

## match all查询

match_all 查询简单的 匹配所有文档。在没有指定查询方式时，它是默认的查询：

```json
GET /_search
{
    "query": {
        "match_all": {}
    }
}
```

## match查询

无论你在任何字段上进行的是全文搜索还是精确查询，match 查询是你可用的标准查询。

如果你在一个全文字段上使用 match 查询，在执行查询前，它将用正确的分析器去分析查询字符串，如果在一个精确值的字段上使用它， 例如数字、日期、布尔或者一个 not_analyzed 字符串字段，那么它将会精确匹配给定的值。

```json
GET /_search
{
    "query": { "match": { "title": "my elasticsearch article" }}
}
```

> 对于精确值的查询，你可能需要使用 filter 语句来取代 query，因为 filter 将会被缓存。

## multi match查询

multi_match 查询可以在多个字段上执行相同的 match 查询：

```json
GET /_search
{
    "multi_match": {
        "query":    "full text search",
        "fields":   [ "title", "body" ]
    }
}
```

## range 查询

`range` 查询找出那些落在指定区间内的数字或者时间：

```json
{
    "range": {
        "age": {
            "gte":  20,
            "lt":   30
        }
    }
}
```

被允许的操作符如下：

gt 大于		
gte 大于等于		
lt 小于		
lte 小于等于		

## term 查询

`term` 查询被用于精确值 匹配，这些精确值可能是数字、时间、布尔或者那些 not_analyzed 的字符串：

```json
{ "term": { "age":    26           }}
{ "term": { "date":   "2014-09-01" }}
{ "term": { "public": true         }}
{ "term": { "tag":    "full_text"  }}
```

`term` 查询对于输入的文本不 分析 ，所以它将给定的值进行精确查询。

## terms查询

`terms` 查询和 `term` 查询一样，但它允许你指定多值进行匹配。如果这个字段包含了指定值中的任何一个值，那么这个文档满足条件：

```json
GET /_search
{
    "query": { "terms": { "tag": [ "search", "full_text", "nosql" ] }}
}
```

和 term 查询一样，terms 查询对于输入的文本不分析。它查询那些精确匹配的值（包括在大小写、重音、空格等方面的差异）。

## exists 查询

这是2.x中的查询，现在已经不提供了，但是可以用filter来完成同样的效果：

```json
GET /company/employee/_search
{
    
    "query": {
      "bool": {
        "filter": {
          "exists": {
            "field": "age"
          }
        }
      }
    }
}
```

# 组合查询

现实的查询需求从来都没有那么简单；它们需要在多个字段上查询多种多样的文本，并且根据一系列的标准来过滤。为了构建类似的高级查询，你需要一种能够将多查询组合成单一查询的查询方法。

你可以用 `bool` 查询来实现你的需求。这种查询将多查询组合在一起，成为用户自己想要的布尔查询。它接收以下参数：

* must		
	文档 *必须* 匹配这些条件才能被包含进来。
* must_not		
	文档 *必须不* 匹配这些条件才能被包含进来。
* should		
	如果满足这些语句中的任意语句，将增加 `_score` ，否则，无任何影响。它们主要用于修正每个文档的相关性得分。
* filter		
	*必须* 匹配，但它以不评分、过滤模式来进行。这些语句对评分没有贡献，只是根据过滤标准来排除或包含文档。
	
由于这是我们看到的第一个包含多个查询的查询，所以有必要讨论一下相关性得分是如何组合的。每一个子查询都独自地计算文档的相关性得分。一旦他们的得分被计算出来， bool 查询就将这些得分进行合并并且返回一个代表整个布尔操作的得分。

下面的查询用于查找 title 字段匹配 how to make millions 并且不被标识为 spam 的文档。那些被标识为 starred 或在2014之后的文档，将比另外那些文档拥有更高的排名。如果 _两者_ 都满足，那么它排名将更高：

```json
{
    "bool": {
        "must":     { "match": { "title": "how to make millions" }},
        "must_not": { "match": { "tag":   "spam" }},
        "should": [
            { "match": { "tag": "starred" }},
            { "range": { "date": { "gte": "2014-01-01" }}}
        ]
    }
}
```

## 增加带过滤器（filter）的查询

如果我们不想因为文档的时间而影响得分，可以用 filter 语句来重写前面的例子：

```json
{
    "bool": {
        "must":     { "match": { "title": "how to make millions" }},
        "must_not": { "match": { "tag":   "spam" }},
        "should": [
            { "match": { "tag": "starred" }}
        ],
        "filter": {
          "range": { "date": { "gte": "2014-01-01" }} 
        }
    }
}
```

## constant_score查询

尽管没有 bool 查询使用这么频繁，constant_score 查询也是你工具箱里有用的查询工具。它将一个不变的常量评分应用于所有匹配的文档。它被经常用于你只需要执行一个 filter 而没有其它查询（例如，评分查询）的情况下。

可以使用它来取代只有 filter 语句的 bool 查询。在性能上是完全相同的，但对于提高查询简洁性和清晰度有很大帮助。

{
    "constant_score":   {
        "filter": {
            "term": { "category": "ebooks" } 
        }
    }
}

> term 查询被放置在 constant_score 中，转成不评分的 filter。这种方式可以用来取代只有 filter 语句的 bool 查询。

# 验证查询


查询可以变得非常的复杂，尤其 和不同的分析器与不同的字段映射结合时，理解起来就有点困难了。不过 `validate-query` API 可以用来验证查询是否合法。

```json
GET /test_index/test_type/_validate/query?explain
{
  "query": {
    "math": {
      "test_field": "test"
    }
  }
}

{
  "valid": false,
  "error": "org.elasticsearch.common.ParsingException: no [query] registered for [math]"
}
```
说没有`math`这个查询，一看是单词写错了，应该是`match`。

这个一般用在那种特别复杂庞大的搜索下，比如写了上百行的搜索，这个时候可以先用validate api去验证一下，搜索是否合法。


# 排序

为了按照相关性来排序，需要将相关性表示为一个数值。在 Elasticsearch 中， *相关性得分* 由一个浮点数进行表示，并在搜索结果中通过 `_score` 参数返回， 默认排序是 `_score` 降序。

有时，相关性评分对你来说并没有意义。例如，下面的查询返回所有 user_id 字段包含 1 的结果：

```json
GET /_search
{
    "query" : {
        "bool" : {
            "filter" : {
                "term" : {
                    "user_id" : 1
                }
            }
        }
    }
}
```



## 定制排序规则

有时候我们查询的数据需要根据时间，数量之类的排序。我们可以使用 sort 参数进行实现：

```json
GET /company/employee/_search 
{
  "query": {
    "constant_score": {
      "filter": {
        "range": {
          "age": {
            "gte": 30
          }
        }
      }
    }
  },
  "sort": [
    {
      "join_date": {
        "order": "asc"
      }
    }
  ]
}
```

## String排序

如果对一个string field进行排序，结果往往不准确，因为分词后是多个单词，再排序就不是我们想要的结果了。

通常解决方案是，将一个string field建立两次索引，一个分词，用来进行搜索；一个不分词，用来进行排序。

实验一下，重新建索引，为`title`设置一个分词的，和一个不分词的。

```json
DELETE /website
PUT /website 
{
  "mappings": {
    "article": {
      "properties": {
        "title": {
          "type": "text",
          "fields": {
            "raw": {
              "type": "keyword"
            }
          },
          "fielddata": true
        },
        "content": {
          "type": "text"
        },
        "post_date": {
          "type": "date"
        },
        "author_id": {
          "type": "long"
        }
      }
    }
  }
}
```

> 在 ES2.x 版本字符串数据是没有 keyword 和 text 类型的，只有string类型，ES更新到5版本后，取消了 string 数据类型，代替它的是 keyword 和 text 数据类型，那么 keyword 和 text 有什么区别了？ 		
> Text 数据类型被用来索引长文本，比如说电子邮件的主体部分或者一款产品的介绍。这些文本会被分析，在建立索引前会将这些文本进行分词，转化为词的组合，建立索引。允许 ES来检索这些词语。text 数据类型不能用来排序和聚合。		
> Keyword 数据类型用来建立电子邮箱地址、姓名、邮政编码和标签等数据，不需要进行分词。可以被用来检索过滤、排序和聚合。keyword 类型字段只能用本身来进行检索。


准备数据：

```json
PUT /website/article/1
{
  "title": "first article",
  "content": "this is my first article",
  "post_date": "2017-01-01",
  "author_id": 110
}

PUT /website/article/2
{
  "title": "second article",
  "content": "this is my second article",
  "post_date": "2017-01-02",
  "author_id": 110
}
```



搜索：

```json
GET /website/article/_search
{ 
  "query": {
    "match_all": {}
  },
  "sort": [
    {
      "title": {
        "order": "desc"
      }
    }
  ]
}

GET /website/article/_search
{
  
  "query": {
    "match_all": {}
  },
  "sort": [
    {
      "title.raw": {
        "order": "desc"
      }
    }
  ]
}
```

# 相关性评分


每个文档都有相关性评分，用一个正浮点数字段 `_score` 来表示 。 `_score` 的评分越高，相关性越高。

查询语句会为每个文档生成一个 _score 字段。简单来说，就是计算出一个索引中的文本，与搜索文本他们之间的关联匹配程度。

在 Elasticsearch 中, 标准的算法是 Term Frequency/Inverse Document Frequency, 简写为 TF/IDF, (5.0 以上版本, 改为了据说更先进的 BM25 算法)


* Term frequency：搜索文本中的各个词条在field文本中出现了多少次，出现次数越多，就越相关
* Inverse document frequency：搜索文本中的各个词条在整个索引的所有文档中出现了多少次，出现的次数越多，就越不相关
* Field-length norm：field长度越长，相关度越弱


## 理解评分标准

当调试一条复杂的查询语句时， 想要理解 `_score` 究竟是如何计算是比较困难的。Elasticsearch 在 每个查询语句中都有一个 explain 参数，将 explain 设为 true 就可以得到更详细的信息。


```json
GET /test_index/test_type/_search?explain
{
  "query": {
    "match": {
      "test_field": "test"
    }
  }
}


{
  "took": 2,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "failed": 0
  },
  "hits": {
    "total": 2,
    "max_score": 0.25316024,
    "hits": [
      {
        "_shard": "[test_index][1]",
        "_node": "LrOx5yeUQQaYbF4L13z5Zw",
        "_index": "test_index",
        "_type": "test_type",
        "_id": "8",
        "_score": 0.25316024,
        "_source": {
          "test_field": "test client 2"
        },
        "_explanation": {
          "value": 0.25316024,
          "description": "sum of:",
          "details": [
            {
              "value": 0.25316024,
              "description": "weight(test_field:test in 0) [PerFieldSimilarity], result of:",
              "details": [
                {
                  "value": 0.25316024,
                  "description": "score(doc=0,freq=1.0 = termFreq=1.0\n), product of:",
                  "details": [
                    {
                      "value": 0.2876821,
                      "description": "idf, computed as log(1 + (docCount - docFreq + 0.5) / (docFreq + 0.5)) from:",
                      "details": [
                        {
                          "value": 1,
                          "description": "docFreq",
                          "details": []
                        },
                        {
                          "value": 1,
                          "description": "docCount",
                          "details": []
                        }
                      ]
                    },
                    {
                      "value": 0.88,
                      "description": "tfNorm, computed as (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * fieldLength / avgFieldLength)) from:",
                      "details": [
                        {
                          "value": 1,
                          "description": "termFreq=1.0",
                          "details": []
                        },
                        {
                          "value": 1.2,
                          "description": "parameter k1",
                          "details": []
                        },
                        {
                          "value": 0.75,
                          "description": "parameter b",
                          "details": []
                        },
                        {
                          "value": 3,
                          "description": "avgFieldLength",
                          "details": []
                        },
                        {
                          "value": 4,
                          "description": "fieldLength",
                          "details": []
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "value": 0,
              "description": "match on required clause, product of:",
              "details": [
                {
                  "value": 0,
                  "description": "# clause",
                  "details": []
                },
                {
                  "value": 1,
                  "description": "*:*, product of:",
                  "details": [
                    {
                      "value": 1,
                      "description": "boost",
                      "details": []
                    },
                    {
                      "value": 1,
                      "description": "queryNorm",
                      "details": []
                    }
                  ]
                }
              ]
            }
          ]
        }
      },
      {
        "_shard": "[test_index][3]",
        "_node": "LrOx5yeUQQaYbF4L13z5Zw",
        "_index": "test_index",
        "_type": "test_type",
        "_id": "7",
        "_score": 0.25316024,
        "_source": {
          "test_field": "test client 2"
        },
        "_explanation": {
          "value": 0.25316024,
          "description": "sum of:",
          "details": [
            {
              "value": 0.25316024,
              "description": "weight(test_field:test in 0) [PerFieldSimilarity], result of:",
              "details": [
                {
                  "value": 0.25316024,
                  "description": "score(doc=0,freq=1.0 = termFreq=1.0\n), product of:",
                  "details": [
                    {
                      "value": 0.2876821,
                      "description": "idf, computed as log(1 + (docCount - docFreq + 0.5) / (docFreq + 0.5)) from:",
                      "details": [
                        {
                          "value": 1,
                          "description": "docFreq",
                          "details": []
                        },
                        {
                          "value": 1,
                          "description": "docCount",
                          "details": []
                        }
                      ]
                    },
                    {
                      "value": 0.88,
                      "description": "tfNorm, computed as (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * fieldLength / avgFieldLength)) from:",
                      "details": [
                        {
                          "value": 1,
                          "description": "termFreq=1.0",
                          "details": []
                        },
                        {
                          "value": 1.2,
                          "description": "parameter k1",
                          "details": []
                        },
                        {
                          "value": 0.75,
                          "description": "parameter b",
                          "details": []
                        },
                        {
                          "value": 3,
                          "description": "avgFieldLength",
                          "details": []
                        },
                        {
                          "value": 4,
                          "description": "fieldLength",
                          "details": []
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "value": 0,
              "description": "match on required clause, product of:",
              "details": [
                {
                  "value": 0,
                  "description": "# clause",
                  "details": []
                },
                {
                  "value": 1,
                  "description": "*:*, product of:",
                  "details": [
                    {
                      "value": 1,
                      "description": "boost",
                      "details": []
                    },
                    {
                      "value": 1,
                      "description": "queryNorm",
                      "details": []
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  }
}
```


它提供了 `_explanation` 。每个 入口都包含一个 description 、 value 、 details 字段，它分别告诉你计算的类型、计算结果和任何我们需要的计算细节。

因为我测试的版本是5.2，所以从结果看出并不是上面介绍的TF/IDF算法，大致可以看到IDF，依然存在，但是Term frequency和Field-length norm则改为了一个组合算法(tfNorm)。

具体可以参考文章 [ElasticSearch 的分数 (_score) 是怎么计算得出 (2.X & 5.X)](https://ruby-china.org/topics/31934)

* tfNorm反映的该term在所有满足条件的doc中field中的重要性，一般来说，相同的freq 下，field的长度越短，那么取值就越高。
* IDF反映的是term的影响因子，如果docCount很大，docFreq很小，标示该term在doc之间具有很好的分辨力，当然IDF值也就越大。

## 文档是如何被匹配上的

当 explain 选项加到某一文档上时， explain api 会帮助你理解为何这个文档会被匹配，更重要的是，一个文档为何没有被匹配。

请求路径为 /index/type/id/_explain ，如下所示：

```json
GET /test_index/test_type/7/_explain
{
  "query": {
    "match": {
      "test_field": "world"
    }
  }
}
```

不只是我们之前看到的充分解释 ，我们现在有了一个 description 元素，它将告诉我们：

`"description": "no match on required clause (test_field:world)",`


# Doc Values

搜索的时候，要依靠倒排索引；排序的时候，需要依靠正排索引，看到每个document的每个field，然后进行排序，所谓的正排索引，其实就是doc values。在建立索引的时候，一方面会建立倒排索引，以供搜索用；一方面会建立正排索引，也就是doc values，以供排序，聚合，过滤等操作使用。doc values是被保存在磁盘上的，此时如果内存足够，os会自动将其缓存在内存中，性能还是会很高；如果内存不足够，os会将其写入磁盘上。

# 分布式检索过程

讨论一下在分布式环境中搜索是怎么执行的，搜索被执行成一个两阶段过程，我们称之为 query then fetch 。

## 查询阶段


在初始 *查询阶段* 时， 查询会广播到索引中每一个分片拷贝（主分片或者副本分片）。 每个分片在本地执行搜索并构建一个匹配文档的 _优先队列_。

> ## 优先队列
> 一个 优先队列 仅仅是一个存有 top-n 匹配文档的有序列表。优先队列的大小取决于分页参数 from 和 size 。例如，如下搜索请求将需要足够大的优先队列来放入100条文档。
> 
> ```json
GET /_search
{
    "from": 90,
    "size": 10
}
```

**查询过程分布式搜索**

![查询过程分布式搜索](https://www.elastic.co/guide/cn/elasticsearch/guide/current/images/elas_0901.png)

查询阶段包含以下三个步骤:

1. 客户端发送一个 search 请求到 Node 3 ， Node 3 会创建一个大小为 from + size 的空优先队列。
2. Node 3 将查询请求转发到索引的每个主分片或副本分片中。每个分片在本地执行查询并添加结果到大小为 from + size 的本地有序优先队列中。
3. 每个分片返回各自优先队列中所有文档的 ID 和排序值给协调节点，也就是 Node 3 ，它合并这些值到自己的优先队列中来产生一个全局排序后的结果列表。

当一个搜索请求被发送到某个节点时，这个节点就变成了协调节点。 这个节点的任务是广播查询请求到所有相关分片并将它们的响应整合成全局排序后的结果集合，这个结果集合会返回给客户端。

这个也跟前面说的deep paging问题有关，from + size 分页太深，每个分片都要返回大量的数据给协调节点，会消耗大量的带宽，内存，cpu。

**replica shard如何增加查询吞吐量**

第一步是广播请求到索引中每一个节点的分片拷贝。查询请求可以被某个主分片或某个副本分片处理， 这就是为什么更多的副本（当结合更多的硬件）能够增加搜索吞吐率。 协调节点将在之后的请求中轮询所有的分片拷贝来分摊负载。

## 取回阶段


查询阶段标识哪些文档满足 搜索请求，但是我们仍然需要取回这些文档。这是取回阶段的任务, 正如 图 “分布式搜索的取回阶段” 所展示的。

![分布式搜索的取回阶段](https://www.elastic.co/guide/cn/elasticsearch/guide/current/images/elas_0902.png)

分布式阶段由以下步骤构成：

1. 协调节点辨别出哪些文档需要被取回并向相关的分片提交多个 GET 请求。
2. 每个分片加载并 丰富 文档，如果有需要的话，接着返回文档给协调节点。
3. 一旦所有的文档都被取回了，协调节点返回结果给客户端。

协调节点首先决定哪些文档 确实 需要被取回。例如，如果我们的查询指定了 { "from": 90, "size": 10 } ，最初的90个结果会被丢弃，只有从第91个开始的10个结果需要被取回。这些文档可能来自和最初搜索请求有关的一个、多个甚至全部分片。

协调节点给持有相关文档的每个分片创建一个 multi-get request ，并发送请求给同样处理查询阶段的分片副本。

一般搜索，如果不加from和size，就默认搜索前10条，按照_score排序。


# 搜索参数

有几个搜索参数可以影响搜索过程。

## preference

preference 参数允许用来控制由哪些分片或节点来处理搜索请求。 它接受像 `_primary`, `_primary_first`, `_local`, `_only_node:xyz`, `_prefer_node:xyz`, 和 `_shards:2,3` 这样的值。

> ## Bouncing Results
> 想象一下有两个文档有同样值的时间戳字段，搜索结果用 timestamp 字段来排序。 由于搜索请求是在所有有效的分片副本间轮询的，那就有可能发生主分片处理请求时，这两个文档是一种顺序， 而副本分片处理请求时又是另一种顺序。

> 这就是所谓的 bouncing results 问题: 每次用户刷新页面，搜索结果表现是不同的顺序。 让同一个用户始终使用同一个分片，这样可以避免这种问题， 可以设置 preference 参数为一个特定的任意值比如用户会话ID来解决。

## timeout

通常分片处理完它所有的数据后再把结果返回给协同节点，协同节点把收到的所有结果合并为最终结果。

这意味着花费的时间是最慢分片的处理时间加结果合并的时间。如果有一个节点有问题，就会导致所有的响应缓慢。

参数 `timeout` 告诉 分片允许处理数据的最大时间。如果没有足够的时间处理所有数据，这个分片的结果可以是部分的，甚至是空数据。

## routing

定制参数 routing ，它能够在索引时提供来确保相关的文档，比如属于某个用户的文档被存储在某个分片上。 在搜索的时候，不用搜索索引的所有分片，而是通过指定几个 routing 值来限定只搜索几个相关的分片，默认是`_id`路由，也可以指定字段`?routing=user_1,user2`。


## search_type

缺省的搜索类型是 query_then_fetch 。 在某些情况下，你可能想明确设置 search_type 为 dfs_query_then_fetch 来改善相关性精确度：

```json
GET /_search?search_type=dfs_query_then_fetch
```

搜索类型 dfs_query_then_fetch 有预查询阶段，这个阶段可以从所有相关分片获取词频来计算全局词频。 

# scroll 查询

如果是用from + size的查询方式，会有我们之前说的Deep Paging问题，而且ES默认也限制了size的大小最多只能是1w条。如果一次性要查出来比如10万条数据，那么性能会很差，此时一般会采取用scoll滚动查询，一批一批的查，直到所有数据都查询完处理完。

使用scoll滚动搜索，可以先搜索一批数据，然后下次再搜索一批数据，以此类推，直到搜索出全部的数据来。		
scoll搜索会在第一次搜索的时候，保存一个当时的视图快照，之后只会基于该旧的视图快照提供数据搜索，如果这个期间数据变更，是不会让用户看到的。		
采用基于_doc进行排序的方式，性能较高。		
每次发送scroll请求，我们还需要指定一个scoll参数，指定一个时间窗口，每次搜索请求只要在这个时间窗口内能完成就可以了。

```json
GET /test_index/test_type/_search?scroll=1m
{
  "query": {
    "match_all": {}
  },
  "sort": [ "_doc" ],
  "size": 1
}

{
  "_scroll_id": "DnF1ZXJ5VGhlbkZldGNoBQAAAAAAAOOqFkxyT3g1eWVVUVFhWWJGNEwxM3o1WncAAAAAAADjqxZMck94NXllVVFRYVliRjRMMTN6NVp3AAAAAAAA46wWTHJPeDV5ZVVRUWFZYkY0TDEzejVadwAAAAAAAOOuFkxyT3g1eWVVUVFhWWJGNEwxM3o1WncAAAAAAADjrRZMck94NXllVVFRYVliRjRMMTN6NVp3",
  "took": 2,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "failed": 0
  },
  "hits": {
    "total": 3,
  .....
```

这个查询的返回结果包括一个字段 `_scroll_id`， 它是一个base64编码的长字符串 ((("scroll_id"))) 。 现在我们能传递字段 `_scroll_id` 到 `_search/scroll`查询接口获取下一批结果：下一次再发送scoll请求的时候，必须带上这个`scoll_id`


```json
GET /_search/scroll
{
    "scroll": "1m", 
    "scroll_id" : "DnF1ZXJ5VGhlbkZldGNoBQAAAAAAAOOqFkxyT3g1eWVVUVFhWWJGNEwxM3o1WncAAAAAAADjqxZMck94NXllVVFRYVliRjRMMTN6NVp3AAAAAAAA46wWTHJPeDV5ZVVRUWFZYkY0TDEzejVadwAAAAAAAOOuFkxyT3g1eWVVUVFhWWJGNEwxM3o1WncAAAAAAADjrRZMck94NXllVVFRYVliRjRMMTN6NVp3"
}
```

这个scroll查询返回的下一批结果。 尽管我们指定字段 size 的值为1000，我们有可能取到超过这个值数量的文档。 当查询的时候， 字段 size 作用于单个分片，所以每个批次实际返回的文档数量最大为 size * number_of_primary_shards 。

scoll看起来挺像分页的，但是其实使用场景不一样。分页主要是用来一页一页搜索，给用户看的；scoll主要是用来一批一批检索数据，让系统进行处理的。

