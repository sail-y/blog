---
title: ElasticSearch07-索引管理
tags: [ElasticSearch]
date: 2018-09-27 11:48:13
categories: ElasticSearch
---

此为龙果学院课程学习笔记，记录以后翻看

# 索引管理

## 手动创建索引

之前都是直接插入document，ES为我们自动创建索引。其实在大部分情况下，我们是需要自己先手动创建mapping的，就像数据库建表一样，你可能需要设置primary shard的数量，字段的分词器，具体的数据类型等等。

<!--more-->

**创建索引的语法**

```json
PUT /my_index
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "my_type": {
      "properties": {
        "my_field": {
          "type": "text"
        }
      }
    }
  }
}
```

## 修改索引

`number_of_shards`是不能修改的，修改一下`number_of_replicas`试试。

```json
PUT /my_index/_settings
{
    "number_of_replicas": 1
}
```

## 删除索引

```json
DELETE /my_index
DELETE /index_one,index_two
DELETE /index_*
DELETE /_all
```


`DELETE /_all`是很危险的操作，可以在ES的配置文件里禁用掉。

**elasticsearch.yml**

```yml
action.destructive_requires_name: true
```

## 配置分词器

分词器是用于将全文字符串转换为适合搜索的倒排索引。

standard 分析器是用于全文字段的默认分析器， 对于大部分西方语系来说是一个不错的选择。 它包括了以下几点：

* standard tokenizer：以单词边界进行切分
* standard token filter：什么都不做
* lowercase token filter：将所有字母转换为小写
* stop token filter（默认被禁用）：移除停用词，比如a the it等等

## 修改分词器

启用english停用词token filter

在下面的例子中，我们创建了一个新的分析器，叫做 `es_std` ， 并使用预定义的英语停用词列表：

```json
PUT /my_index
{
  "settings": {
    "analysis": {
      "analyzer": {
        "es_std": {
          "type": "standard",
          "stopwords": "_english_"
        }
      }
    }
  }
}

GET /my_index/_analyze
{
  "analyzer": "standard", 
  "text": "a dog is in the house"
}

{
  "tokens": [
    {
      "token": "a",
      "start_offset": 0,
      "end_offset": 1,
      "type": "<ALPHANUM>",
      "position": 0
    },
    {
      "token": "dog",
      "start_offset": 2,
      "end_offset": 5,
      "type": "<ALPHANUM>",
      "position": 1
    },
    {
      "token": "is",
      "start_offset": 6,
      "end_offset": 8,
      "type": "<ALPHANUM>",
      "position": 2
    },
    {
      "token": "in",
      "start_offset": 9,
      "end_offset": 11,
      "type": "<ALPHANUM>",
      "position": 3
    },
    {
      "token": "the",
      "start_offset": 12,
      "end_offset": 15,
      "type": "<ALPHANUM>",
      "position": 4
    },
    {
      "token": "house",
      "start_offset": 16,
      "end_offset": 21,
      "type": "<ALPHANUM>",
      "position": 5
    }
  ]
}


GET /my_index/_analyze
{
  "analyzer": "es_std",
  "text":"a dog is in the house"
}

{
  "tokens": [
    {
      "token": "dog",
      "start_offset": 2,
      "end_offset": 5,
      "type": "<ALPHANUM>",
      "position": 1
    },
    {
      "token": "house",
      "start_offset": 16,
      "end_offset": 21,
      "type": "<ALPHANUM>",
      "position": 5
    }
  ]
}
```

## 自定义分词器

虽然Elasticsearch带有一些现成的分析器，然而在分析器上Elasticsearch真正的强大之处在于，你可以通过在一个适合你的特定数据的设置之中组合字符过滤器、分词器、词汇单元过滤器来创建自定义的分析器。

一个分词器就是在一个包里面组合了三种函数的一个包装器， 三种函数按照顺序被执行:

* 字符过滤器			
	字符过滤器 用来 整理 一个尚未被分词的字符串。例如，如果我们的文本是HTML格式的，它会包含像 `<p>` 或者 `<div>` 这样的HTML标签，这些标签是我们不想索引的。我们可以使用 html清除 字符过滤器 来移除掉所有的HTML标签，并且像把 `&Aacute;` 转换为相对应的Unicode字符 Á 这样，转换HTML实体。

	一个分析器可能有0个或者多个字符过滤器。
* 分词器		
	一个分析器 必须 有一个唯一的分词器。 分词器把字符串分解成单个词条或者词汇单元。 standard 分析器里使用的 standard 分词器 把一个字符串根据单词边界分解成单个词条，并且移除掉大部分的标点符号，然而还有其他不同行为的分词器存在。

* 词单元过滤器		
	经过分词，作为结果的 词单元流 会按照指定的顺序通过指定的词单元过滤器 。	
**举例**：

```json
PUT /my_index
{
  "settings": {
    "analysis": {
      "char_filter": {
        "&_to_and": {
          "type": "mapping",
          "mappings": ["&=> and"]
        }
      },
      "filter": {
        "my_stopwords": {
          "type": "stop",
          "stopwords": ["the", "a"]
        }
      },
      "analyzer": {
        "my_analyzer": {
          "type": "custom",
          "char_filter": ["html_strip", "&_to_and"],
          "tokenizer": "standard",
          "filter": ["lowercase", "my_stopwords"]
        }
      }
    }
  }
}
```

这里创建了一个`my_analyzer`分析器，分词用的standard，字符过滤器用了`html_strip`和`&_to_and`，词过滤器用了`lowercase`和`my_stopwords`。

测试一下分词器的效果：

```json
GET /my_index/_analyze
{
  "text": "tom&jerry are a friend in the house, <a>, HAHA!!",
  "analyzer": "my_analyzer"
}

{
  "tokens": [
    {
      "token": "tomandjerry",
      "start_offset": 0,
      "end_offset": 9,
      "type": "<ALPHANUM>",
      "position": 0
    },
    {
      "token": "are",
      "start_offset": 10,
      "end_offset": 13,
      "type": "<ALPHANUM>",
      "position": 1
    },
    {
      "token": "friend",
      "start_offset": 16,
      "end_offset": 22,
      "type": "<ALPHANUM>",
      "position": 3
    },
    {
      "token": "in",
      "start_offset": 23,
      "end_offset": 25,
      "type": "<ALPHANUM>",
      "position": 4
    },
    {
      "token": "house",
      "start_offset": 30,
      "end_offset": 35,
      "type": "<ALPHANUM>",
      "position": 6
    },
    {
      "token": "haha",
      "start_offset": 42,
      "end_offset": 46,
      "type": "<ALPHANUM>",
      "position": 7
    }
  ]
}
```

**如何在索引中使用我们自定义的分词器？**

创建一个mapping，为content设置我们自定义的分词器

```json
PUT /my_index/_mapping/my_type
{
  "properties": {
    "content": {
      "type": "text",
      "analyzer": "my_analyzer"
    }
  }
}
```

# 类型


type，是一个index中用来区分类似的文档。类似的文档可能有不同的fields，而且有不同的属性来控制索引建立、分词器。就像数据库中的 schema ，描述了文档可能具有的字段或 属性 、 每个字段的数据类型—比如 string, integer 或 date —以及Lucene是如何索引和存储这些字段的。

field的value，在底层的lucene中建立索引的时候，全部是opaque bytes类型，是不区分类型的。

Lucene 没有文档类型的概念，每个文档的类型名被存储在一个叫 `_type` 的元数据字段上。 当我们要检索某个类型的文档时, Elasticsearch 通过在 `_type` 字段上使用过滤器限制只返回这个类型的文档。

Lucene 也没有映射的概念。 映射是 Elasticsearch 将复杂 JSON 文档 映射 成 Lucene 需要的扁平化数据的方式。

一个index中的多个type，实际上是放在一起存储的，因此一个index下，不能有多个type重名，而类型或者其他设置不同的，因为那样是无法处理的。


比如有个映射和文档：

```json
{
   "ecommerce": {
      "mappings": {
         "elactronic_goods": {
            "properties": {
               "name": {
                  "type": "string",
               },
               "price": {
                  "type": "double"
               },
	       "service_period": {
		  "type": "string"
	       }			
            }
         },
         "fresh_goods": {
            "properties": {
               "name": {
                  "type": "string",
               },
               "price": {
                  "type": "double"
               },
	       "eat_period": {
		  "type": "string"
	       }
            }
         }
      }
   }
}

{
  "name": "geli kongtiao",
  "price": 1999.0,
  "service_period": "one year"
}

{
  "name": "aozhou dalongxia",
  "price": 199.0,
  "eat_period": "one week"
}
```

实际在Lucene里的数据可能是：

```json
{
   "ecommerce": {
      "mappings": {
        "_type": {
          "type": "string",
          "index": "not_analyzed"
        },
        "name": {
          "type": "string"
        }
        "price": {
          "type": "double"
        }
        "service_period": {
          "type": "string"
        }
        "eat_period": {
          "type": "string"
        }
      }
   }
}

{
  "_type": "elactronic_goods",
  "name": "geli kongtiao",
  "price": 1999.0,
  "service_period": "one year",
  "eat_period": ""
}

{
  "_type": "fresh_goods",
  "name": "aozhou dalongxia",
  "price": 199.0,
  "service_period": "",
  "eat_period": "one week"
}
```

所以最佳实践是，将类似结构的type放在一个index下，这些type应该有多个field是相同的。		
**假如你将两个type的field完全不同，放在一个index下，那么就每条数据都至少有一半的field在底层的lucene中是空值，会有严重的性能问题**。

# 根对象

映射的最高一层被称为 根对象 ，它可能包含下面几项：

* 一个 properties 节点，列出了文档中可能包含的每个字段的映射
* 各种元数据字段，它们都以一个下划线开头，例如 `_type` 、 `_id` 和 `_source`
* 设置项，控制如何动态处理新的字段，例如 `analyzer` 、 `dynamic_date_formats` 和 `dynamic_templates`
* 其他设置，可以同时应用在根对象和其他 `object` 类型的字段上，例如 `enabled` 、 `dynamic` 和 `include_in_all`

```json
PUT /my_index
{
  "mappings": {
    "my_type": {
      "properties": {}
    }
  }
}
```

## properties

文档的字段描述，包含type，index，analyzer

```json
PUT /my_index/_mapping/my_type
{
  "properties": {
    "title": {
      "type": "text"
    }
  }
}
```

## _source

Elasticsearch 在 `_source` 字段存储代表文档体的JSON字符串。和所有被存储的字段一样， `_source` 字段在被写入磁盘之前先会被压缩。

好处：

1. 查询的时候，直接可以拿到完整的document，不需要先拿document id，再发送一次请求拿document
1. partial update基于_source实现
1. reindex时，直接基于_source实现，不需要从数据库（或者其他外部存储）查询数据再修改
1. 可以基于_source定制返回field
1. debug query更容易，因为可以直接看到_source

不需要的话，也可以禁用_source，不保存原始对象

```json
PUT /my_index/_mapping/my_type2
{
  "_source": {"enabled": false}
}
```

## _all

前面说过，将所有field打包在一起，作为一个_all field，建立索引。没指定任何field进行搜索时，就是使用_all field在搜索。

```json
PUT /my_index/_mapping/my_type3
{
  "_all": {"enabled": false}
}
```

也可以在field级别设置`include_in_all` field，设置是否要将field的值包含在`_all` field中>

```json
PUT /my_index/_mapping/my_type4
{
  "properties": {
    "my_field": {
      "type": "text",
      "include_in_all": false
    }
  }
}
```

## 标识性metadata

* _id		
	文档的 ID 字符串
* _type		
	文档的类型名
* _index		
	文档所在的索引
* _uid		
	`_type` 和 `_id` 连接在一起构造成 type#id
	
# 定制dynamic策略

ES在数据遇到新的字段时候，会为我们自动mapping，但是我们也可以定制化这个策略：

* true：遇到陌生字段，就进行dynamic mapping
* false：遇到陌生字段，就忽略
* strict：遇到陌生字段，就报错

修改策略为`strict`：

```json
PUT /my_index
{
  "mappings": {
    "my_type": {
      "dynamic": "strict",
      "properties": {
        "title": {
          "type": "text"
        },
        "address": {
          "type": "object",
          "dynamic": "true"
        }
      }
    }
  }
}
```

测试添加数据，这里多了一个mapping里没有的content字段，因为是`strict`策略，所以ES报错了：

```json
PUT /my_index/my_type/1
{
  "title": "my article",
  "content": "this is my article",
  "address": {
    "province": "guangdong",
    "city": "guangzhou"
  }
}

{
  "error": {
    "root_cause": [
      {
        "type": "strict_dynamic_mapping_exception",
        "reason": "mapping set to strict, dynamic introduction of [content] within [my_type] is not allowed"
      }
    ],
    "type": "strict_dynamic_mapping_exception",
    "reason": "mapping set to strict, dynamic introduction of [content] within [my_type] is not allowed"
  },
  "status": 400
}
```

## date_detection

默认会按照一定格式识别date，比如yyyy-MM-dd。但是如果某个field先过来一个2017-01-01的值，就会被自动dynamic mapping成date，后面如果再来一个"hello world"之类的值，就会报错。可以手动关闭某个type的date_detection，如果有需要，自己手动指定某个field为date类型。

```json
PUT /my_index/_mapping/my_type
{
    "date_detection": false
}
```

## 自定义dynamic mapping template（type level）


```json
PUT /my_index
{
  "mappings": {
    "my_type": {
      "dynamic_templates": [
        {
          "en": {
            "match": "*_en",
            "match_mapping_type": "string",
            "mapping": {
              "type": "string",
              "analyzer": "english"
            }
          }
        },
        {
          "long_to_date": {
            "match": "*time",
            "match_mapping_type": "long",
            "mapping": {
              "type": "date",
              "index": "not_analyzed"
            }
          }
        }
      ]
    }
  }
}
```

测试一下：

```json
PUT /my_index/my_type/1
{
  "title": "this is my first article",
  "title_en": "this is my first article",
  "create_time": 1538031023000
}
```

看看ES为我们创建的mapping，`create_time`成功被映射成了date类型，`title_en`设置了english为分词器。

```json
GET /my_index/my_type/_mapping

{
  "my_index": {
    "mappings": {
      "my_type": {
        "dynamic_templates": [
          {
            "en": {
              "match": "*_en",
              "match_mapping_type": "string",
              "mapping": {
                "analyzer": "english",
                "type": "string"
              }
            }
          },
          {
            "long_to_date": {
              "match": "*time",
              "match_mapping_type": "long",
              "mapping": {
                "index": "not_analyzed",
                "type": "date"
              }
            }
          }
        ],
        "properties": {
          "create_time": {
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
          },
          "title_en": {
            "type": "text",
            "analyzer": "english"
          }
        }
      }
    }
  }
}
```


## 自定义dynamic mapping template（index level）

`_default_`就是设置这个index下所有的模板，type自己的配置可以覆盖`_default_`的配置。

```json
PUT /my_index
{
    "mappings": {
        "_default_": {
            "_all": { "enabled":  false }
        },
        "blog": {
            "_all": { "enabled":  true  }
        }
    }
}
```

# 重建索引

一个field的设置是不能被修改的，如果要修改一个Field，那么应该重新按照新的mapping，建立一个index，然后将数据批量查询出来，重新用bulk api写入index中。

批量查询的时候，建议采用scroll api，并且采用多线程并发的方式来reindex数据，每次scoll就查询指定日期的一段数据，交给一个线程即可。

## 场景

一开始，依靠dynamic mapping，插入数据，但是不小心有些数据是2017-01-01这种日期格式的，所以title这种field被自动映射为了date类型，实际上它应该是string类型的。

```json
PUT /my_index/my_type/3
{
  "title": "2017-01-03"
}

{
  "my_index": {
    "mappings": {
      "my_type": {
        "properties": {
          "title": {
            "type": "date"
          }
        }
      }
    }
  }
}
```

当后期向索引中加入string类型的title值的时候，就会报错

```json
PUT /my_index/my_type/4
{
  "title": "my first article"
}

{
  "error": {
    "root_cause": [
      {
        "type": "mapper_parsing_exception",
        "reason": "failed to parse [title]"
      }
    ],
    "type": "mapper_parsing_exception",
    "reason": "failed to parse [title]",
    "caused_by": {
      "type": "illegal_argument_exception",
      "reason": "Invalid format: \"my first article\""
    }
  },
  "status": 400
}
```

如果此时想修改title的类型，是不可能的

```json
PUT /my_index/_mapping/my_type
{
  "properties": {
    "title": {
      "type": "text"
    }
  }
}

{
  "error": {
    "root_cause": [
      {
        "type": "illegal_argument_exception",
        "reason": "mapper [title] of different type, current_type [date], merged_type [text]"
      }
    ],
    "type": "illegal_argument_exception",
    "reason": "mapper [title] of different type, current_type [date], merged_type [text]"
  },
  "status": 400
}
```

此时，唯一的办法就是进行reindex。重新建立一个索引，将旧索引的数据查询出来，再导入新索引。

比如旧索引的名字，是`old_index`，新索引的名字是`new_index`，终端是java应用，已经在使用`old_index`在操作了，难道还要去停止java应用，修改使用的index为new_index，才重新启动java应用吗？这个过程中，就会导致java应用停机，可用性降低，这样肯定不好。

那么在我们的例子中先给旧索引一个别名，客户端先用`goods_index`这个别名来操作，此时实际指向的是旧的`my_index`。

```json
PUT /my_index/_alias/goods_index
```

然后新建一个index，调整其title的类型为string

```json
PUT /my_index_new
{
  "mappings": {
    "my_type": {
      "properties": {
        "title": {
          "type": "text"
        }
      }
    }
  }
}
```

使用scroll api将数据批量查询出来

```json
GET /my_index/_search?scroll=1m
{
    "query": {
        "match_all": {}
    },
    "sort": ["_doc"],
    "size":  1
}

{
  "_scroll_id": "DnF1ZXJ5VGhlbkZldGNoBQAAAAAAAwhlFkxyT3g1eWVVUVFhWWJGNEwxM3o1WncAAAAAAAMIZhZMck94NXllVVFRYVliRjRMMTN6NVp3AAAAAAADCGQWTHJPeDV5ZVVRUWFZYkY0TDEzejVadwAAAAAAAwhnFkxyT3g1eWVVUVFhWWJGNEwxM3o1WncAAAAAAAMIaBZMck94NXllVVFRYVliRjRMMTN6NVp3",
  "took": 38,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "failed": 0
  },
  "hits": {
    "total": 3,
    "max_score": null,
    "hits": [
      {
        "_index": "my_index",
        "_type": "my_type",
        "_id": "2",
        "_score": null,
        "_source": {
          "title": "2017-01-02"
        },
        "sort": [
          0
        ]
      }
    ]
  }
}
```

采用bulk api将scoll查出来的一批数据，批量写入新索引。

```json
POST /_bulk
{ "index":{ "_index": "my_index_new", "_type": "my_type", "_id": "2" }}
{ "title":"2017-01-02" }
```

反复循环，查询一批又一批的数据出来，采取bulk api将每一批数据批量写入新索引。

将goods_index alias切换到my_index_new上去，java应用会直接通过index别名使用新的索引中的数据，java应用程序不需要停机，零停机，高可用。

```json
POST /_aliases
{
    "actions": [
        { "remove": { "index": "my_index", "alias": "goods_index" }},
        { "add":    { "index": "my_index_new", "alias": "goods_index" }}
    ]
}
```


直接通过goods_index别名来查询，是否成功，这里只有一条，因为我只操作了一条。

```json
GET /goods_index/my_type/_search

{
  "took": 24,
  "timed_out": false,
  "_shards": {
    "total": 5,
    "successful": 5,
    "failed": 0
  },
  "hits": {
    "total": 1,
    "max_score": 1,
    "hits": [
      {
        "_index": "my_index_new",
        "_type": "my_type",
        "_id": "2",
        "_score": 1,
        "_source": {
          "title": "2017-01-02"
        }
      }
    ]
  }
}
```

