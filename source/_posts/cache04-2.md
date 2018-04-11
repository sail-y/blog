---
title: zookeeper+kafka集群的安装部署
date: 2018-02-20 15:09:58
tags: [zookeeper, kafka]
categories: kafka
---

# zookeeper集群搭建

将zookeeper-3.4.5.tar.gz拷贝到/usr/local目录下。
对zookeeper-3.4.5.tar.gz进行解压缩：
	
	tar -zxvf zookeeper-3.4.5.tar.gz

对zookeeper目录进行重命名：
	
	mv zookeeper-3.4.5 zk

配置zookeeper相关的环境变量

```bash
vi ~/.bashrc
export ZOOKEEPER_HOME=/usr/local/zk
export PATH=$ZOOKEEPER_HOME/bin
source ~/.bashrc

cd zk/conf
cp zoo_sample.cfg zoo.cfg

vi zoo.cfg
#修改：dataDir=/usr/local/zk/data
#新增：
server.0=eshop-cache01:2888:3888	
server.1=eshop-cache02:2888:3888
server.2=eshop-cache03:2888:3888

cd zk
mkdir data
cd data
echo 0 >> myid
```
<!--more-->

这是eshop-cache01节点的搭建，另外2个节点，一样的步骤去搭建。

在另外两个节点上按照上述步骤配置ZooKeeper，使用scp将zk和.bashrc拷贝到eshop-cache02和eshop-cache03上即可。唯一的区别是`myid`标识号分别设置为1和2。

```bash
scp ~/.bashrc root@eshop-cache02:~/
scp -r /usr/local/zk root@eshop-cache02:/usr/local/
```


分别在三台机器上执行：
	
	zkServer.sh start
	
检查ZooKeeper状态：

	zkServer.sh status
	
应该是一个leader，两个follower

jps：检查三个节点是否都有QuromPeerMain进程


# kafka集群搭建

将`kafka_2.11-1.0.0.tgz`拷贝到/usr/local目录下。


对kafka_2.9.2-0.8.1.tgz进行解压缩：
	
	tar -zxvf kafka_2.11-1.0.0.tgz
	
对kafka目录进行改名：
	
	mv kafka_2.11-1.0.0 kafka



配置kafka

```bash
vi /usr/local/kafka/config/server.properties
# broker.id：依次增长的整数，0、1、2，集群中Broker的唯一id
zookeeper.connect=192.168.2.201:2181,192.168.2.202:2181,192.168.2.203:2181
```

按照上述步骤在另外两台机器分别安装kafka。用scp把kafka拷贝到其他机器即可。
唯一区别的，就是server.properties中的broker.id，要设置为1和2

在三台机器上的kafka目录下，分别执行以下命令：

	nohup bin/kafka-server-start.sh config/server.properties &


使用jps检查启动是否成功:


```bash
jps
1697 Kafka
1316 QuorumPeerMain
1997 Jps
```


使用基本命令检查kafka是否搭建成功:

```bash
bin/kafka-topics.sh --zookeeper 192.168.2.201:2181,192.168.2.202:2181,192.168.2.203:2181 --topic test --replication-factor 1 --partitions 1 --create

bin/kafka-console-producer.sh --broker-list 192.168.2.201:9092,192.168.2.202:9092,192.168.2.203:9092 --topic test

bin/kafka-console-consumer.sh --zookeeper 192.168.2.201:2181,192.168.2.202:2181,192.168.2.203:2181 --topic test --from-beginning

```