---
title: ElasticSearch02-快速入门
tags: [ElasticSearch]
date: 2018-06-05 22:34:18
categories: ElasticSearch
---

# 快速入门

## 环境准备和安装

1. 安装JDK，至少1.8.0_73以上版本，java -version
2. 下载和解压缩Elasticsearch安装包（https://www.elastic.co/downloads/past-releases/elasticsearch-5-2-0），目录结构
	
	```
	.
	├── LICENSE.txt
	├── NOTICE.txt
	├── README.textile
	├── bin
	│   ├── elasticsearch
	│   ├── elasticsearch-plugin
	│   ├── elasticsearch-plugin.bat
	│   ├── elasticsearch-service-mgr.exe
	│   ├── elasticsearch-service-x64.exe
	│   ├── elasticsearch-service-x86.exe
	│   ├── elasticsearch-service.bat
	│   ├── elasticsearch-systemd-pre-exec
	│   ├── elasticsearch-translog
	│   ├── elasticsearch-translog.bat
	│   ├── elasticsearch.bat
	│   ├── elasticsearch.in.bat
	│   └── elasticsearch.in.sh
	├── config
	│   ├── elasticsearch.yml
	│   ├── jvm.options
	│   └── log4j2.properties
	├── lib
	│   ├── HdrHistogram-2.1.6.jar
	│   ├── elasticsearch-5.2.0.jar
	│   ├── hppc-0.7.1.jar
	│   ├── jackson-core-2.8.6.jar
	│   ├── jackson-dataformat-cbor-2.8.6.jar
	│   ├── jackson-dataformat-smile-2.8.6.jar
	│   ├── jackson-dataformat-yaml-2.8.6.jar
	│   ├── jna-4.2.2.jar
	│   ├── joda-time-2.9.5.jar
	│   ├── jopt-simple-5.0.2.jar
	│   ├── jts-1.13.jar
	│   ├── log4j-1.2-api-2.7.jar
	│   ├── log4j-api-2.7.jar
	│   ├── log4j-core-2.7.jar
	│   ├── lucene-analyzers-common-6.4.0.jar
	│   ├── lucene-backward-codecs-6.4.0.jar
	│   ├── lucene-core-6.4.0.jar
	│   ├── lucene-grouping-6.4.0.jar
	│   ├── lucene-highlighter-6.4.0.jar
	│   ├── lucene-join-6.4.0.jar
	│   ├── lucene-memory-6.4.0.jar
	│   ├── lucene-misc-6.4.0.jar
	│   ├── lucene-queries-6.4.0.jar
	│   ├── lucene-queryparser-6.4.0.jar
	│   ├── lucene-sandbox-6.4.0.jar
	│   ├── lucene-spatial-6.4.0.jar
	│   ├── lucene-spatial-extras-6.4.0.jar
	│   ├── lucene-spatial3d-6.4.0.jar
	│   ├── lucene-suggest-6.4.0.jar
	│   ├── securesm-1.1.jar
	│   ├── snakeyaml-1.15.jar
	│   ├── spatial4j-0.6.jar
	│   └── t-digest-3.0.jar
	├── modules
	│   ├── aggs-matrix-stats
	│   │   ├── aggs-matrix-stats-5.2.0.jar
	│   │   └── plugin-descriptor.properties
	│   ├── ingest-common
	│   │   ├── ingest-common-5.2.0.jar
	│   │   ├── jcodings-1.0.12.jar
	│   │   ├── joni-2.1.6.jar
	│   │   └── plugin-descriptor.properties
	│   ├── lang-expression
	│   │   ├── antlr4-runtime-4.5.1-1.jar
	│   │   ├── asm-5.0.4.jar
	│   │   ├── asm-commons-5.0.4.jar
	│   │   ├── asm-tree-5.0.4.jar
	│   │   ├── lang-expression-5.2.0.jar
	│   │   ├── lucene-expressions-6.4.0.jar
	│   │   ├── plugin-descriptor.properties
	│   │   └── plugin-security.policy
	│   ├── lang-groovy
	│   │   ├── groovy-2.4.6-indy.jar
	│   │   ├── lang-groovy-5.2.0.jar
	│   │   ├── plugin-descriptor.properties
	│   │   └── plugin-security.policy
	│   ├── lang-mustache
	│   │   ├── compiler-0.9.3.jar
	│   │   ├── lang-mustache-5.2.0.jar
	│   │   ├── plugin-descriptor.properties
	│   │   └── plugin-security.policy
	│   ├── lang-painless
	│   │   ├── antlr4-runtime-4.5.1-1.jar
	│   │   ├── asm-debug-all-5.1.jar
	│   │   ├── lang-painless-5.2.0.jar
	│   │   ├── plugin-descriptor.properties
	│   │   └── plugin-security.policy
	│   ├── percolator
	│   │   ├── percolator-5.2.0.jar
	│   │   └── plugin-descriptor.properties
	│   ├── reindex
	│   │   ├── commons-codec-1.10.jar
	│   │   ├── commons-logging-1.1.3.jar
	│   │   ├── httpasyncclient-4.1.2.jar
	│   │   ├── httpclient-4.5.2.jar
	│   │   ├── httpcore-4.4.5.jar
	│   │   ├── httpcore-nio-4.4.5.jar
	│   │   ├── plugin-descriptor.properties
	│   │   ├── reindex-5.2.0.jar
	│   │   └── rest-5.2.0.jar
	│   ├── transport-netty3
	│   │   ├── netty-3.10.6.Final.jar
	│   │   ├── plugin-descriptor.properties
	│   │   ├── plugin-security.policy
	│   │   └── transport-netty3-5.2.0.jar
	│   └── transport-netty4
	│       ├── netty-buffer-4.1.7.Final.jar
	│       ├── netty-codec-4.1.7.Final.jar
	│       ├── netty-codec-http-4.1.7.Final.jar
	│       ├── netty-common-4.1.7.Final.jar
	│       ├── netty-handler-4.1.7.Final.jar
	│       ├── netty-resolver-4.1.7.Final.jar
	│       ├── netty-transport-4.1.7.Final.jar
	│       ├── plugin-descriptor.properties
	│       ├── plugin-security.policy
	│       └── transport-netty4-5.2.0.jar
	└── plugins
	
	15 directories, 104 files
	```
3. 启动Elasticsearch：bin\elasticsearch，es本身特点之一就是开箱即用，如果是中小型应用，数据量少，操作不是很复杂的，直接启动就可以用了。

	![](/img/es/02/es_start.png)
	
4. 检查ES是否启动成功：http://localhost:9200/?pretty

	```json
	name: node名称
	cluster_name: 集群名称（默认的集群名称就是elasticsearch）
	version.number: 5.2.0，es版本号
	
	{
	  "name" : "4onsTYV",
	  "cluster_name" : "elasticsearch",
	  "cluster_uuid" : "nKZ9VK_vQdSQ1J0Dx9gx1Q",
	  "version" : {
	    "number" : "5.2.0",
	    "build_hash" : "24e05b9",
	    "build_date" : "2017-01-24T19:52:35.800Z",
	    "build_snapshot" : false,
	    "lucene_version" : "6.4.0"
	  },
	  "tagline" : "You Know, for Search"
	}
	```
5. 修改集群名称：elasticsearch.yml

	修改`elasticsearch.yml`里面的


https://www.elastic.co/downloads/past-releases/kibana-5-2-0