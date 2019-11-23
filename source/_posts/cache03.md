---
title: 高可用缓存架构实战3-Redis高可用集群实战
date: 2018-02-15 17:27:23
tags: [redis]
categories: 高可用缓存架构实战
---

此为龙果学院课程笔记，记录以供以后翻看

# Redis高可用集群实战

## 如何做到99.99%高可用性

1. 什么叫99.99%的高可用性？

	在365天 * 99.99%的时间内，你的系统都是可以对外提供服务的，那就是高可用性，99.99%。

2. redis不可用是什么？单实例不可用？主从架构不可用？不可用的后果是什么？

	如果是master进程被杀了，或者系统宕机了，那就无法提供服务了。但是如果是集群中某一个slave挂掉了，没问题，还有其他的slave可以提供服务。
	
3. Redis怎么才能做到高可用？

	如果master挂了怎么办？Redis有个故障转移功能，如果master node故障时，自动检测，并且将某个slave node自动切换为master node，也可以叫做主备切换，这实现了redis主从架构下的高可用性，这其中会用到Redis的哨兵架构（它会去检测）。		
	一旦master故障，在很短的时间内，就会切换到另外一个master上去，可能就几分钟，或者几秒钟是不可用的。	
	
<!--more-->

## Redis哨兵架构介绍

Sentinel（哨兵）是Redis 的高可用性解决方案：由一个或多个Sentinel 实例 组成的Sentinel 系统可以监视任意多个主服务器，以及这些主服务器属下的所有从服务器，并在被监视的主服务器进入下线状态时，自动将下线主服务器属下的某个从服务器升级为新的主服务器。


哨兵是redis集群架构中非常重要的一个组件，主要功能如下：

1. 集群监控，负责监控redis master和slave进程是否正常工作。
2. 消息通知，如果某个redis实例有故障，那么哨兵负责发送消息作为报警通知给管理员。
3. 故障转移，如果master node挂掉了，会自动转移到slave node上。
4. 配置中心，如果故障转移发生了，通知client客户端新的master地址。

哨兵本身也是分布式的，作为一个哨兵集群去运行，互相协同工作：

1. 执行故障转移时，判断一个master node是宕机了，需要大部分的哨兵都同意才行，涉及到了分布式选举的问题。
2. 即使部分哨兵节点挂掉了，哨兵集群还是能正常工作的，因为如果一个作为高可用机制重要组成部分的故障转移系统本身是单点的，那就坑爹了。


### 哨兵的核心知识

1. **哨兵至少需要3个实例**，来保证自己的健壮性
2. 哨兵 + redis主从的部署架构，是不会保证数据零丢失的，只能保证redis集群的高可用性
3. 对于哨兵 + redis主从这种复杂的部署架构，尽量在测试环境和生产环境，都进行充足的测试和演练

#### 为什么redis哨兵集群只有2个节点无法正常工作？

哨兵集群必须部署2个以上节点，如果哨兵集群仅仅部署了个2个哨兵实例

```
+----+         +----+
| M1 |---------| R1 |
| S1 |         | S2 |
+----+         +----+
```

Configuration: quorum = 1（如果有quorum个哨兵投票选举，就认为master宕机，进行切换）

上图中2个哨兵，master宕机，s1和s2中只要有1个哨兵认为master宕机就可以进行切换，同时s1和s2中会选举出一个哨兵来执行故障转移。这个时候，它需要大多数(majority)哨兵都是运行的，2个哨兵的majority就是2（2的majority=2，3的majority=2，5的majority=3，4的majority=2），如果2个哨兵都运行着，就可以允许执行故障转移。但是，如果整个M1和S1运行的机器宕机了，那么哨兵只有1个了，此时就没有majority(大多数的哨兵)来允许执行故障转移，虽然另外一台机器还有一个R1，但是故障转移不会执行。

#### 经典的3节点哨兵集群

```
       +----+
       | M1 |
       | S1 |
       +----+
          |
+----+    |    +----+
| R2 |----+----| R3 |
| S2 |         | S3 |
+----+         +----+
```

Configuration: quorum = 2，majority

如果M1所在机器宕机了，那么三个哨兵还剩下2个，S2和S3可以一致认为master宕机，然后选举出一个来执行故障转移。

### 数据丢失问题

主备切换的过程，可能会导致数据丢失

1. 异步复制导致的数据丢失

	因为master -> slave的复制是异步的，所以可能有部分数据还没复制到slave，master就宕机了，此时这些部分数据就丢失了。
	
2. 脑裂导致的数据丢失

	![](/img/cache/cache03-1.png)
	脑裂，也就是说，某个master所在机器突然脱离了正常的网络，跟其他slave机器不能连接，但是实际上master还运行着，此时哨兵可能就会认为master宕机了，然后开启选举，将其他slave切换成了master，这个时候，集群里就会有两个master，也就是所谓的脑裂。此时虽然某个slave被切换成了master，但是可能client还没来得及切换到新的master，还继续写向旧master的数据可能也丢失了，因此旧master再次恢复的时候，会被作为一个slave挂到新的master上去，自己的数据会清空，重新从新的master复制数据。


#### 解决异步复制和脑裂导致的数据丢失

有2个参数：

```bash
min-slaves-to-write 1
min-slaves-max-lag 10
```

要求至少有1个slave，数据复制和同步的延迟不能超过10秒，如果说一旦所有的slave，数据复制和同步的延迟都超过了10秒钟，那么这个时候，master就不会再接收任何请求了，上面两个配置可以减少异步复制和脑裂导致的数据丢失。

1. 减少异步复制的数据丢失

	有了min-slaves-max-lag这个配置，就可以确保一旦slave复制数据和ack延时太长，就认为可能master宕机后损失的数据太多了，那么就拒绝写请求，这样可以把master宕机时由于部分数据未同步到slave导致的数据丢失降低的可控范围内。


2. 减少脑裂的数据丢失

	如果一个master出现了脑裂，跟其他slave丢了连接，上面的配置就确保了如果跟任何一个slave丢了连接，在10秒后发现没有slave给自己ack，那么就拒绝客户端新的写请求，因此在脑裂场景下，最多就丢失10秒的数据。

## 哨兵原理详解

### sdown和odown转换机制

sdown和odown是两种失败状态。sdown是主观宕机，就是一个哨兵如果自己觉得一个master宕机了，那么就是主观宕机。

odown是客观宕机，如果`quorum`数量的哨兵都觉得一个master宕机了，那么就是客观宕机。

sdown达成的条件很简单，如果一个哨兵ping一个master，超过了`is-master-down-after-milliseconds`参数指定的毫秒数之后，就主观认为master宕机。

sdown到odown转换的条件很简单，如果一个哨兵在指定时间内，收到了quorum指定数量的其他哨兵也认为那个master是sdown了，那么就认为是odown了，客观认为master宕机。

### 哨兵集群的自动发现机制

哨兵互相之间的发现，是通过redis的`pub/sub`系统实现的，每个哨兵都会往`__sentinel__:hello`这个channel里发送一个消息，这时候所有其他哨兵都可以消费到这个消息，并感知到其他的哨兵的存在，每隔两秒钟，每个哨兵都会往自己监控的某个master+slaves对应的`__sentinel__:hello` channel里发送一个消息，内容是自己的host、ip和runid还有对这个master的监控配置。

每个哨兵也会去监听自己监控的每个master+slaves对应的`__sentinel__:hello `channel，然后去感知到同样在监听这个master+slaves的其他哨兵的存在。每个哨兵还会跟其他哨兵交换对master的监控配置，互相进行监控配置的同步。


### slave配置的自动纠正

哨兵会负责自动纠正slave的一些配置，比如slave如果要成为潜在的master候选人，哨兵会确保slave在复制现有master的数据; 如果slave连接到了一个错误的master上，比如故障转移之后，哨兵会确保它们连接到正确的master上。

### slave->master选举算法

如果一个master被认为odown了，而且majority（大多数）哨兵都允许了主备切换，那么某个哨兵就会执行主备切换操作，此时首先要选举一个slave。

选举会考虑slave的一些因素：

1. 跟master断开连接的时长
2. slave优先级
3. 复制offset
4. run id

如果一个slave跟master断开连接已经超过了`down-after-milliseconds`的10倍，外加master宕机的时长，那么slave就被认为不适合选举为master。

接下来会对slave进行排序：

1. 按照slave优先级进行排序，`slave priority`越低，优先级就越高。
2. 如果`slave priority`相同，那么看`replica offset`，哪个slave复制了越多的数据，offset越靠后，优先级就越高。
3. 如果上面两个条件都相同，那么选择一个run id比较小的那个slave。

### quorum和majority

每次一个哨兵要做主备切换，首先需要`quorum`数量的哨兵认为odown，然后选举出一个哨兵来做切换，这个哨兵还得得到majority哨兵的授权，才能正式执行切换。

如果quorum < majority，比如5个哨兵，majority就是3，quorum设置为2，那么就3个哨兵授权就可以执行切换。

但是如果quorum >= majority，那么必须quorum数量的哨兵都授权，比如5个哨兵，quorum是5，那么必须5个哨兵都同意授权，才能执行切换。

### configuration epoch

哨兵会对一套redis master+slave进行监控，有相应的监控的配置，要执行切换的那个哨兵，会从要切换到的新master（salve->master）节点那里得到一个`configuration epoch`，这就是一个version号，每次切换的version号都必须是唯一的。

如果第一个选举出的哨兵切换失败了，那么其他哨兵，会等待failover-timeout时间，然后接替继续执行切换，此时会重新获取一个新的`configuration epoch`，作为新的version号。

### configuraiton传播

哨兵完成切换之后，会在自己本地更新生成最新的master配置，然后同步给其他的哨兵，就是通过之前说的pub/sub消息机制，这里之前的version号就很重要了，因为各种消息都是通过一个channel去发布和监听的，所以一个哨兵完成一次新的切换之后，新的master配置是跟着新的version号的，其他的哨兵都是根据版本号的大小来更新自己的master配置。

## 哨兵集群实战

动手实操，练习如何操作部署哨兵集群，如何基于哨兵进行故障转移，还有一些企业级的配置方案。

### 哨兵的配置文件

每一个哨兵都可以去监控多个maser-slaves的主从架构，相同的一套哨兵集群，可以去监控不同的多个redis主从集群，只需要给每个redis主从集群分配一个逻辑的名称。

`sentinel.conf`

```bash
# 指定对一个master的监控，给监控的master指定的一个名称，后面分布式集群架构里会讲到，可以配置多个master做数据拆分。
sentinel monitor mymaster 127.0.0.1 6379 2
# 超过多少毫秒跟一个redis实例断了连接，哨兵就可能认为这个redis实例挂了
sentinel down-after-milliseconds mymaster 60000
# 执行故障转移的timeout超时时长
sentinel failover-timeout mymaster 180000
# 新的master切换之后，同时有多少个slave被切换到去连接新master，重新做同步，数字越低，花费的时间越多
sentinel parallel-syncs mymaster 1
# 上面的三个配置，都是针对某个监控的master配置的，给其指定上面分配的名称即可

sentinel monitor resque 192.168.1.3 6380 4
sentinel down-after-milliseconds resque 10000
sentinel failover-timeout resque 180000
sentinel parallel-syncs resque 5

sentinel monitor mymaster 127.0.0.1 6379 
```

上面这段配置，就监控了两个master node。这是最小的哨兵配置，如果发生了master-slave故障转移，或者新的哨兵进程加入哨兵集群，那么哨兵会自动更新自己的配置文件。


	sentinel monitor master-group-name hostname port quorum
	
**quorum**的解释如下：

1. 至少多少个哨兵要一致同意，master进程挂掉了，或者slave进程挂掉了，或者要启动一个故障转移操作
2. quorum是用来识别故障的，真正执行故障转移的时候，还是要在哨兵集群执行选举，选举一个哨兵进程出来执行故障转移操作
3. 假设有5个哨兵，quorum设置了2，那么如果5个哨兵中的2个都认为master挂掉了; 2个哨兵中的一个就会做一个选举，选举一个哨兵出来，执行故障转移; 如果5个哨兵中有3个哨兵都是运行的，那么故障转移就会被允许执行


假设你的redis是1个master，4个slave，然后master宕机了，4个slave中有1个切换成了master，剩下3个slave就要挂到新的master上面去，这个时候，如果`parallel-syncs`是1，那么3个slave，一个一个地挂接到新的master上面去，1个挂接完，而且从新的master sync完数据之后，再挂接下一个。如果`parallel-syncs`是3，那么一次性就会把所有slave挂接到新的master上去。

### 在eshop-cache03上再部署一个Redis

> eshop-cache03是我本机安装的又一台虚拟机。

先安装好Redis，但是不用启动，接下来做哨兵的配置。

```
wget http://downloads.sourceforge.net/tcl/tcl8.6.1-src.tar.gz
tar -xzvf tcl8.6.1-src.tar.gz
cd  /usr/local/tcl8.6.1/unix/
./configure  
make && make install

使用redis-3.2.8.tar.gz
tar -zxvf redis-3.2.8.tar.gz
cd redis-3.2.8
make && make test
make install
```

### 配置哨兵


```bash
mkdir /etc/sentinel
mkdir -p /var/sentinel/5000
vi /etc/sentinel/5000.conf
```

`5000.conf`

```bash
port 5000
bind 192.168.2.201
dir /var/sentinel/5000
sentinel monitor mymaster 192.168.2.201 6379 2
sentinel down-after-milliseconds mymaster 30000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1

port 5000
bind 192.168.2.202
dir /var/sentinel/5000
sentinel monitor mymaster 192.168.2.201 6379 2
sentinel down-after-milliseconds mymaster 30000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1

port 5000
bind 192.168.2.203
dir /var/sentinel/5000
sentinel monitor mymaster 192.168.2.201 6379 2
sentinel down-after-milliseconds mymaster 30000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

注意这是3段哨兵的配置，分别在我的3台虚拟机上进行配置。哨兵默认用26379端口，默认不能跟其他机器在指定端口连通，只能在本地访问，所以要改一下`bind`配置，把三台redis实例的ip都加上。


### 启动哨兵进程

在eshop-cache01、eshop-cache02、eshop-cache03三台机器上，分别启动三个哨兵进程，组成一个集群，观察一下日志的输出。

```
redis-sentinel /etc/sentinel/5000.conf
redis-server /etc/sentinel/5000.conf --sentinel
```
日志输出：

```log
1318:X 16 Feb 18:59:15.097 # +monitor master mymaster 192.168.2.201 6379 quorum 2
1318:X 16 Feb 18:59:15.099 * +slave slave 192.168.2.202:6379 192.168.2.202 6379 @ mymaster 192.168.2.201 6379
1318:X 16 Feb 18:59:15.177 * +sentinel sentinel 6f6009aac859757a296467f11f68af7284e4c9ff 192.168.2.202 5000 @ mymaster 192.168.2.201 6379
1318:X 16 Feb 18:59:16.861 * +sentinel sentinel 4fbf75c6fcbfdd09fe8460b6e12006561567f24d 192.168.2.203 5000 @ mymaster 192.168.2.201 6379
```
日志里会显示出来，每个哨兵都能去监控到对应的redis master，并能够自动发现对应的slave。

哨兵之间，互相会自动进行发现，用的就是之前说的pub/sub，消息发布和订阅channel消息系统和机制。

### 检查哨兵状态

redis-cli -h 192.168.2.201 -p 5000

sentinel master mymaster
SENTINEL slaves mymaster
SENTINEL sentinels mymaster

SENTINEL get-master-addr-by-name mymaster


## 哨兵管理和容灾演练

### 哨兵节点的增加和删除

如果是增加sentinel，会自动发现。

删除sentinel的步骤：

1. 停止sentinel进程
2. SENTINEL RESET *，在所有sentinel上执行，清理所有的master状态
3. SENTINEL MASTER mastername，在所有sentinel上执行，查看所有sentinel对数量是否达成了一致

### slave的永久下线

让master摘除某个已经下线的slave：`SENTINEL RESET mastername`，在所有的哨兵上面执行.


### slave切换为Master的优先级

slave->master选举优先级：`slave-priority`，值越小优先级越高

### 基于哨兵集群架构下的安全认证

每个slave都有可能切换成master，所以每个实例都要配置两个指令

master上启用安全认证，`requirepass`
master连接口令，`masterauth`

sentinel配置：`sentinel auth-pass <master-group-name> <pass>`

### 容灾演练

通过哨兵看一下当前的master：`SENTINEL get-master-addr-by-name mymaster`。

把master节点kill -9掉，pid文件也删除掉。

日志：

```
1336:X 16 Feb 22:05:18.458 # -sdown master mymaster 192.168.2.201 6379
1336:X 16 Feb 22:05:18.458 # -odown master mymaster 192.168.2.201 6379
1336:X 16 Feb 22:05:18.458 # +selected-slave slave 192.168.2.202:6379 192.168.2.202 6379 @ mymaster 192.168.2.201 6379
1336:X 16 Feb 22:05:18.458 * +failover-state-send-slaveof-noone slave 192.168.2.202:6379 192.168.2.202 6379 @ mymaster 192.168.2.201 6379
1336:X 16 Feb 22:05:18.559 * +failover-state-wait-promotion slave 192.168.2.202:6379 192.168.2.202 6379 @ mymaster 192.168.2.201 6379
1336:X 16 Feb 22:05:19.417 # +promoted-slave slave 192.168.2.202:6379 192.168.2.202 6379 @ mymaster 192.168.2.201 6379
1336:X 16 Feb 22:05:19.417 # +failover-state-reconf-slaves master mymaster 192.168.2.201 6379
1336:X 16 Feb 22:05:19.486 # +failover-end master mymaster 192.168.2.201 6379
1336:X 16 Feb 22:05:19.486 # +switch-master mymaster 192.168.2.201 6379 192.168.2.202 6379
1336:X 16 Feb 22:05:19.486 * +slave slave 192.168.2.201:6379 192.168.2.201 6379 @ mymaster 192.168.2.202 6379
1336:X 16 Feb 22:05:29.593 * +convert-to-slave slave 192.168.2.201:6379 192.168.2.201 6379 @ mymaster 192.168.2.202 6379
```

查看sentinel的日志，是否出现+sdown字样，识别出了master的宕机问题; 然后出现+odown字样，就是指定的quorum哨兵数量，都认为master宕机了。


1. 三个哨兵进程都认为master是sdown了
2. 超过quorum指定的哨兵进程都认为sdown之后，就变为odown
3. 哨兵1是被选举为要执行后续的主备切换的那个哨兵
4. 哨兵1去新的master（slave）获取了一个新的config version
5. 尝试执行failover
6. 投票选举出一个slave去切换成master，每个哨兵都会执行一次投票
7. `failover-state-send-slaveof-noone`，不让它去做任何节点的slave了; 把slave提拔成master; 旧的master认为不再是master了
8. 哨兵就自动认为之前的201:6379变成了slave了，202:6379变成了master了
9. 哨兵去探查了一下201:6379这个salve的状态，认为它sdown了

所有哨兵选举出了一个实例，来执行主备切换操作，可以看到投票的日志`xxx voted for xxxx`。如果majority的哨兵都存活着，那么就会执行主备切换操作，刚才日志里也看到了，`+switch-master mymaster 192.168.2.201 6379 192.168.2.202 6379`。

再通过哨兵看一下master：SENTINEL get-master-addr-by-name mymaster

```bash
[root@eshop-cache01 ~]# redis-cli -h 192.168.2.201 -p 5000
192.168.2.201:5000> SENTINEL get-master-addr-by-name mymaster
1) "192.168.2.202"
2) "6379"
```

可以看到master已经变成`192.168.2.202:6379`了，接下来我们试试故障恢复，再将旧的master重新启动，查看是否被哨兵自动切换成slave节点。

```bash
[root@eshop-cache01 ~]# /etc/init.d/redis_6379 start
```

重新看一下202上的`info replication`：

```bash
192.168.2.202:6379> info replication
# Replication
role:master
connected_slaves:1
slave0:ip=192.168.2.201,port=6379,state=online,offset=219972,lag=1
```
发现201它变成了一个slave了。

所以容灾的演练的步骤是：


1. 手动杀掉master
2. 哨兵能否执行主备切换，将slave切换为master
3. 哨兵完成主备切换后，新的master能否使用
4. 故障恢复，将旧的master重新启动
5. 哨兵能否自动将旧的master变为slave，挂接到新的master上面去，而且也是可以使用的

### 哨兵的生产环境部署

配置文件改成后台运行，然后把日志路径配置上。

	daemonize yes
	logfile /var/log/sentinel/5000.log
	mkdir -p /var/log/sentinel


## 如何让Redis支持1T以上大数据

### 单Master的redis在海量数据面前的瓶颈

Master节点的数据和slave节点的数据是一样的，master最大能容纳多大的数据量，那么slave也就只能容纳多大的数据量。

Redis的缓存清理算法，将旧的很少使用的数据，给清除出内存，然后保证内存中，就只有固定大小的内存，不可能超过master内存的物理上线。

但是如果要让Redis保存1T以上的数据在缓存里，供系统高性能的查询和运行，在单机Master的情况下，目前几乎是不可能达到的。

### 怎么才能够突破单机瓶颈，让redis支撑海量数据？

如果要支撑更大数据量的缓存，那就横向扩容更多的master节点，每个master节点就能存放更多的数据了，单台服务器是32GB，30台左右就可以支撑1T的数据量了。

### Redis集群架构

Redis集群架构支持N个master node，每个master node都可以挂载多个slave node，依然是读写分离的架构，对于每个master来说，写就写到master，然后读就从master对应的slave去读。

集群高可用：因为每个master都有slave节点，那么如果master挂掉，redis cluster的的机制，就会自动将某个slave切换成master。

redis cluster = 多master + 读写分离 + 高可用。

所以只需要基于redis cluster去搭建redis集群即可，**不需要**手工去搭建replication复制+主从架构+读写分离+哨兵集群+高可用。


### redis cluster vs. replication + sentinel

如果数据量很少，主要是为了承载高并发高性能的场景，比如你的缓存一般就几个G，单机足够了。

如果是**replication**架构，一个mater，多个slave，需要几个slave跟要求的读吞吐量有关系，然后搭建一个sentinel集群，去保证redis主从架构的高可用性，就能满足需求了。**redis cluster**主要是针对**海量数据+高并发+高可用**的场景，如果数据量很大，那么建议就用**redis cluster**。

### 分布式数据存储的核心算法

随着技术的进步，算法的进阶：

	hash算法 -> 一致性hash算法（memcached） -> redis cluster，hash slot算法

用不同的算法，就决定了在多个master节点的时候，数据如何分布到这些节点上去。

1. hash算法

	![最老土的hash算法以及弊端](/img/cache/最老土的hash算法以及弊端.png)
	
	先是通过对key计算hash值，然后对节点数量（3）取模，取模结果一定是0~2之间，小于节点数量，然后根据索引去对应节点删取数据。如果某一个master宕机了，所有请求过来都会重新基于新的节点数量（2）去取模，此时所有数据都无法获取到，大量的流量会涌入到数据库中，几乎100%的缓存都可能失效了。

2. 一致性hash算法

	![一致性hash算法的讲解和优点](/img/cache/一致性hash算法的讲解和优点.png)
	
	同样是先是通过对key计算hash值，然后用hash值落在圆环上的某个点，然后顺时针去寻找最近的一个节点。这个算法保证了如果某一台master宕机，只有之前那台master上的数据会受到影响，因为顺时针会找到下一个节点，还是找不到数据，此时只有1/3的数据找不到，流量会涌入到数据库中，重新查询一次。但是一致性hash算法也有一个问题，那就是换缓存热点数据问题，可能集中在某个hash区间的值特别多，会导致大量数据都涌入同一个master内，造成master的热点问题，性能出现瓶颈。
	
3. 优化一致性hash算法

	![一致性hash算法的虚拟节点实现负载均衡](/img/cache/一致性hash算法的虚拟节点实现负载均衡.png)

	为了解决缓存热点数据问题，增加了虚拟节点的概念，如上图的黑色圆圈。给每个master都做了均匀分布的虚拟节点。这样的话，在每个区间内，大量的数据都会均分到不同的节点上，而不是按照顺时针的顺序去涌入同一个master内。
	
4. hash slot算法

	![redis cluster hash slot算法](/img/cache/redis cluster hash slot算法.png)
	
	Redis 集群有16384个哈希槽,每个key通过CRC16校验后对16384取模来决定放置哪个槽.集群的每个节点负责一部分hash槽,举个例子,比如当前集群有3个节点,那么:
	
		* 节点 A 包含 0 到 5500号哈希槽
		* 节点 B 包含5501 到 11000 号哈希槽
		* 节点 C 包含11001 到 16384号哈希槽
	
	这种结构很容易添加或者删除节点. 比如如果我想新添加个节点D, 我需要从节点 A, B, C中得部分槽到D上. 如果我像移除节点A,需要将A中得槽移到B和C节点上,然后将没有任何槽的A节点从集群中移除即可. 由于从一个节点将哈希槽移动到另一个节点并不会停止服务,所以无论添加删除或者改变某个节点的哈希槽的数量都不会造成集群不可用的状态.
	
	
## Redis Cluster介绍

Redis 集群是一个提供在多个Redis间节点间共享数据的程序集。

 Redis 集群的优势:
 
1. 自动将数据进行分片，每个master上放一部分数据。
2. 提供内置的高可用支持，部分master不可用时，还是可以继续工作。


### Redis Cluster实战部署

Redis Cluster会自动去做master+slave架构的复制和读写分离，以及master+slave的高可用+主备切换，支持多个master的hash slot分布式数据存储，所以我们之前的redis主从，哨兵集群，全部都不需要了。

#### Redis Cluster的重要配置

```bash
cluster-enabled <yes/no>

cluster-config-file <filename>：这是指定一个文件，供cluster模式下的redis实例保存集群状态，包括集群中其他机器的信息，比如节点的上线和下线，故障转移，不是我们去维护的，给它指定一个文件，让redis自己去维护。

cluster-node-timeout <milliseconds>：节点存活超时时长，超过一定时长，认为节点宕机，master宕机的话就会触发主备切换，slave宕机就不会提供服务。
```

#### 在三台机器上启动6个redis实例

redis cluster集群，要求至少3个master去组成一个高可用，健壮的分布式的集群，每个master都建议至少给一个slave，所以3个master，3个slave，这是最少的要求。如果是正式环境下，建议在6台机器上去搭建，是为了保证每个master都跟自己的slave不在同一台机器上，自然是6台自然更好，否则机器挂了，一个master+一个slave就死了，集群也就不可用了。

我的虚拟机为了方便测试，使用3台机器去搭建6个redis实例的redis cluster。

先创建目录：

```bash
mkdir -p /etc/redis-cluster
mkdir -p /var/log/redis
```

201：

```bash
mkdir -p /var/redis/7001
mkdir -p /var/redis/7002
```
202：

```bash
mkdir -p /var/redis/7003
mkdir -p /var/redis/7004
```

203：

```bash
mkdir -p /var/redis/7005
mkdir -p /var/redis/7006
```

写六份配置文件分别对应7001~7006，/etc/redis/7001.conf，每台机器上2个实例：

```bash
port 7001
cluster-enabled yes
cluster-config-file /etc/redis-cluster/node-7001.conf
cluster-node-timeout 15000
daemonize	yes							
pidfile		/var/run/redis_7001.pid 						
dir 		/var/redis/7001		
logfile /var/log/redis/7001.log
bind 192.168.2.201
appendonly yes
```

将上面的配置文件，在/etc/redis下放6个，分别为: 7001.conf，7002.conf，7003.conf，7004.conf，7005.conf，7006.conf，至少要用3个master节点启动，每个master加一个slave节点，先选择6个节点，启动6个实例。


#### 准备生产环境的启动脚本

在/etc/init.d下，放6个启动脚本，分别为: `redis_7001, redis_7002, redis_7003, redis_7004, redis_7005, redis_7006`。

```bash
cd /etc/init.d/
cp redis_6379 redis_7001
vi redis_7001 
```
将`REDISPORT`修改为7001~7006对应的端口号。

检查一下3台机器上的配置文件，目录是否都已经准备好，然后分别在3台机器上，启动6个redis实例。

```bash
[root@eshop-cache01 redis]# /etc/init.d/redis_7001 start
[root@eshop-cache01 redis]# /etc/init.d/redis_7002 start
[root@eshop-cache02 init.d]# /etc/init.d/redis_7003 start
[root@eshop-cache02 init.d]# /etc/init.d/redis_7004 start
[root@eshop-cache03 init.d]# /etc/init.d/redis_7005 start
[root@eshop-cache03 init.d]# /etc/init.d/redis_7006 start
```

#### 创建Redis集群

创建集群的工具是用的`redis-trib`，它是用ruby写的，所以我们得先安装ruby环境。

```
yum install –y gcc* openssl* wget
wget https://cache.ruby-lang.org/pub/ruby/2.3/ruby-2.3.1.tar.gz
tar -zxvf ruby-2.3.1.tar.gz
cd ruby-2.3.1
./configure -prefix=/usr/local/ruby
make && make install
ln -sf /usr/local/ruby/bin/* /usr/bin/

wget http://rubygems.org/downloads/redis-3.3.0.gem
gem install -l ./redis-3.3.0.gem
gem list --check redis gem
```
我在安装的时候遇到一个错误

```bash
gem install -l ./redis-3.3.0.gem
ERROR:  Loading command: install (LoadError)
	cannot load such file -- zlib
ERROR:  While executing gem ... (NoMethodError)
    undefined method `invoke_with_build_args' for nil:NilClass
```
解决方法：

```bash
yum install zlib-devel
cd ruby-2.3.1/ext/zlib  
ruby ./extconf.rb  
make && make install 
```

然后安装：

```
gem install -l ./redis-3.3.0.gem
cp /usr/local/redis-4.0.8/src/redis-trib.rb /usr/local/bin
redis-trib.rb create --replicas 1 192.168.2.201:7001 192.168.2.201:7002 192.168.2.202:7003 192.168.2.202:7004 192.168.2.203:7005 192.168.2.203:7006
```

--replicas: 每个master有几个slave

6台机器，3个master，3个slave，尽量自己让master和slave不在一台机器上。

```bash
[root@eshop-cache01 local]# redis-trib.rb create --replicas 1 192.168.2.201:7001 192.168.2.201:7002 192.168.2.202:7003 192.168.2.202:7004 192.168.2.203:7005 192.168.2.203:7006
>>> Creating cluster
>>> Performing hash slots allocation on 6 nodes...
Using 3 masters:
192.168.2.201:7001
192.168.2.202:7003
192.168.2.203:7005
Adding replica 192.168.2.202:7004 to 192.168.2.201:7001
Adding replica 192.168.2.203:7006 to 192.168.2.202:7003
Adding replica 192.168.2.201:7002 to 192.168.2.203:7005
M: 158414bbcaa2cf0b9b30a81d2e31fb35ba5b4972 192.168.2.201:7001
   slots:0-5460 (5461 slots) master
S: 8861dda48f95e748bc0e7df2757cdc723c897f28 192.168.2.201:7002
   replicates 5183cdee2295a07af3e98226887da2a645d979d1
M: a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43 192.168.2.202:7003
   slots:5461-10922 (5462 slots) master
S: cc8a78087798e148b257d2ae33815a25715109e8 192.168.2.202:7004
   replicates 158414bbcaa2cf0b9b30a81d2e31fb35ba5b4972
M: 5183cdee2295a07af3e98226887da2a645d979d1 192.168.2.203:7005
   slots:10923-16383 (5461 slots) master
S: 19f6027db2837cc56dd581a3c826a687d096207a 192.168.2.203:7006
   replicates a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43
Can I set the above configuration? (type 'yes' to accept): yes
>>> Nodes configuration updated
>>> Assign a different config epoch to each node
>>> Sending CLUSTER MEET messages to join the cluster
Waiting for the cluster to join......
>>> Performing Cluster Check (using node 192.168.2.201:7001)
M: 158414bbcaa2cf0b9b30a81d2e31fb35ba5b4972 192.168.2.201:7001
   slots:0-5460 (5461 slots) master
   1 additional replica(s)
S: 8861dda48f95e748bc0e7df2757cdc723c897f28 192.168.2.201:7002
   slots: (0 slots) slave
   replicates 5183cdee2295a07af3e98226887da2a645d979d1
M: 5183cdee2295a07af3e98226887da2a645d979d1 192.168.2.203:7005
   slots:10923-16383 (5461 slots) master
   1 additional replica(s)
M: a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43 192.168.2.202:7003
   slots:5461-10922 (5462 slots) master
   1 additional replica(s)
S: cc8a78087798e148b257d2ae33815a25715109e8 192.168.2.202:7004
   slots: (0 slots) slave
   replicates 158414bbcaa2cf0b9b30a81d2e31fb35ba5b4972
S: 19f6027db2837cc56dd581a3c826a687d096207a 192.168.2.203:7006
   slots: (0 slots) slave
   replicates a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

可以检查一下集群的状态：

```bash
redis-trib.rb check 192.168.2.201:7001
```


#### Redis Cluster测试

接下来对刚才搭建的集群做一些测试，**Redis Cluster**提供了多个master，数据可以分布式存储在多个master上; 每个master都带着slave，自动就做读写分离; 某个master如果故障，那么就会自动将slave切换成master，从而达到高可用。

##### 实验多master写入 -> 海量数据的分布式存储

```bash
[root@eshop-cache01 local]# redis-cli -h 192.168.2.201 -p 7001
192.168.2.201:7001> set mykey1 v1
OK
192.168.2.201:7001> set mykey2 v2
(error) MOVED 14119 192.168.2.203:7005
192.168.2.201:7001> set mykey3 v3
(error) MOVED 9990 192.168.2.202:7003
```
我们在redis cluster写入数据的时候，其实是可以将请求发送到任意一个master上去执行的。但是，每个master都会计算这个key对应的CRC16值，然后对16384个**hash slot**取模，找到key对应的**hash slot**，找到hash slot对应的master。如果对应的master就在自己本地的话，set mykey1 v1，mykey1这个key对应的hashslot就在自己本地，那么自己就处理掉了。但是如果计算出来的hashslot在其他master上，那么就会给客户端返回一个moved error，告诉你，你得到哪个master上去执行这条写入的命令。**什么叫做多master的写入，就是每条数据只能存在于一个master上，不同的master负责存储不同的数据，分布式的数据存储。100w条数据，5个master，每个master就负责存储20w条数据，分布式数据存储。**

所以我们需要去7005和7003实例上执行后面2条语句。

```bash
redis-cli -h 192.168.2.202 -p 7003
192.168.2.202:7003> set mykey3 v3
OK
redis-cli -h 192.168.2.203 -p 7005
192.168.2.203:7005> set mykey2 v2
OK
```

##### 实验不同master各自的slave读取 -> 读写分离

刚才是写入数据，现在我们去各自的从节点试试取数据，根据之前是日志分析，我们知道每台master的从节点信息如下：

```bash
Adding replica 192.168.2.202:7004 to 192.168.2.201:7001
Adding replica 192.168.2.203:7006 to 192.168.2.202:7003
Adding replica 192.168.2.201:7002 to 192.168.2.203:7005
```

试试看，发现读不到，原来在redis cluster中，如果你要在slave读取数据，那么需要带先执行`readonly`指令，再`get mykey1`。

```bash
redis-cli -h 192.168.2.202 -p 7004
192.168.2.202:7004> get mykey1
(error) MOVED 1860 192.168.2.201:7001
192.168.2.202:7004> readonly
OK
192.168.2.202:7004> get mykey1
"v1"
```

实际上Redis的客户端是可以帮我们自动路由的，只需要在连接的时候加上`-c`的参数。

```bash
redis-cli -h 192.168.2.201 -p 7001 -c
192.168.2.201:7001> set mykey2 v2
-> Redirected to slot [14119] located at 192.168.2.203:7005
OK
192.168.2.203:7005> get mykey1
-> Redirected to slot [1860] located at 192.168.2.201:7001
"v1"
```

现在我们发现实验redis cluster的读写分离的时候，会发现有一定的限制性，因为默认情况下，redis cluster的核心的理念，主要是用slave做高可用的，每个master挂一两个slave，主要是做数据的热备，还有master故障时的主备切换，**它的侧重点在高可用，而不是读写分离。**

redis cluster默认是不支持slave节点读或者写的，跟我们手动基于`replication`搭建的主从架构不一样。想要在从节点上读取数据，必须要先执行`readonly`指令。

虽然Redis Cluster的主从架构出来了，但是要做读写分离，就复杂了一点，jedis客户端，对redis cluster的读写分离支持不太好。默认是读和写都到master上去执行，如果你要让最流行的`jedis`做redis cluster的读写分离的访问，那可能还得自己修改一点jedis的源码，成本比较高。要不然你就是自己基于`jedis`，封装一下，自己做一个redis cluster的读写分离的访问api。

核心的思路是这样：**`redis cluster`就没有所谓的读写分离的概念了。读写分离是为了要建立一主多从的架构，才能横向任意扩展slave node去支撑更大的读吞吐量。redis cluster的架构下，实际上本身master就是可以任意扩展的，你如果要支撑更大的读吞吐量，或者写吞吐量，或者数据量，直接对master进行横向扩展就可以了，也能实现支撑更高的读吞吐的效果。**

##### 实验自动故障切换 -> 高可用性

我现在把201上的7001给杀掉，看202的7004是否会接替它的位置。

```bash
redis-trib.rb check 192.168.2.201:7002
>>> Performing Cluster Check (using node 192.168.2.201:7002)
S: 8861dda48f95e748bc0e7df2757cdc723c897f28 192.168.2.201:7002
   slots: (0 slots) slave
   replicates 5183cdee2295a07af3e98226887da2a645d979d1
M: a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43 192.168.2.202:7003
   slots:5461-10922 (5462 slots) master
   1 additional replica(s)
M: cc8a78087798e148b257d2ae33815a25715109e8 192.168.2.202:7004
   slots:0-5460 (5461 slots) master
   0 additional replica(s)
S: 19f6027db2837cc56dd581a3c826a687d096207a 192.168.2.203:7006
   slots: (0 slots) slave
   replicates a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43
M: 5183cdee2295a07af3e98226887da2a645d979d1 192.168.2.203:7005
   slots:10923-16383 (5461 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

可以看到，`202:7004`已经变成了master，现在去7004上获取`mykey1`的值，看看是否能获取到。

```bash
redis-cli -h 192.168.2.202 -p 7004
192.168.2.202:7004> get mykey1
"v1"
```

再试着把201:7001给重新启动，它将自动作为slave挂载到了202:7004上面去。

```bash
/etc/init.d/redis_7001 start
Starting Redis server...
redis-trib.rb check 192.168.2.201:7002
>>> Performing Cluster Check (using node 192.168.2.201:7002)
S: 8861dda48f95e748bc0e7df2757cdc723c897f28 192.168.2.201:7002
   slots: (0 slots) slave
   replicates 5183cdee2295a07af3e98226887da2a645d979d1
M: a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43 192.168.2.202:7003
   slots:5461-10922 (5462 slots) master
   1 additional replica(s)
M: cc8a78087798e148b257d2ae33815a25715109e8 192.168.2.202:7004
   slots:0-5460 (5461 slots) master
   1 additional replica(s)
S: 19f6027db2837cc56dd581a3c826a687d096207a 192.168.2.203:7006
   slots: (0 slots) slave
   replicates a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43
S: 158414bbcaa2cf0b9b30a81d2e31fb35ba5b4972 192.168.2.201:7001
   slots: (0 slots) slave
   replicates cc8a78087798e148b257d2ae33815a25715109e8
M: 5183cdee2295a07af3e98226887da2a645d979d1 192.168.2.203:7005
   slots:10923-16383 (5461 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

进一步验证，`slave0:ip=192.168.2.201,port=7001,state=online,offset=4565,lag=1`：

```bash
redis-cli -h 192.168.2.202 -p 7004
192.168.2.202:7004> info replication
# Replication
role:master
connected_slaves:1
slave0:ip=192.168.2.201,port=7001,state=online,offset=4565,lag=1
master_replid:38c489e10e3ede8290476aefec3e0ca9822f056e
master_replid2:6451a5d9f0c94fd5191b94898181424c39a24528
master_repl_offset:4565
second_repl_offset:4300
repl_backlog_active:1
repl_backlog_size:1048576
repl_backlog_first_byte_offset:1
repl_backlog_histlen:4565
```


#### Redis Cluster水平扩容

之前说了不建议在Redis Cluster上做读写分离，建议直接对master进行水平扩容来横向扩展读写吞吐量，还有支撑海量数据。

假设redis单机，读吞吐是5w/s，写吞吐2w/s。扩展redis到5台master，读吞吐可以达到总量25w/s QPS，写可以达到10w/s QPS。扩容到5台master，能支撑的总的缓存数据量就是30G，40G，如果是100台，那就是600G，800G，甚至1T+的海量数据。

单机Redis的内存一般就6G、8G，如果内存太大，fork类操作的时候很耗时，会导致请求延时的问题。

Redis扩容方法：

##### 加入新master

203上执行：
	
```bash
mkdir -p /var/redis/7007
cd /etc/redis
cp 7006.conf 7007.conf
vi 7007.conf
# 改一下里面的配置
port 7007
cluster-enabled yes
cluster-config-file /etc/redis-cluster/node-7007.conf
cluster-node-timeout 15000
daemonize	yes							
pidfile		/var/run/redis_7007.pid 						
dir 		/var/redis/7007		
logfile /var/log/redis/7007.log
bind 192.168.2.203
appendonly yes
	
cd /etc/init.d/
cp redis_7006 redis_7007
vi redis_7007
# REDISPORT=7007
	
/etc/init.d/redis_7007 start
```
	
启动完成后，加入master，在201上执行：
	
```bash
redis-trib.rb add-node 192.168.2.203:7007 192.168.2.201:7001
>>> Adding node 192.168.2.203:7007 to cluster 192.168.2.201:7001
>>> Performing Cluster Check (using node 192.168.2.201:7001)
S: 158414bbcaa2cf0b9b30a81d2e31fb35ba5b4972 192.168.2.201:7001
   slots: (0 slots) slave
   replicates cc8a78087798e148b257d2ae33815a25715109e8
S: 19f6027db2837cc56dd581a3c826a687d096207a 192.168.2.203:7006
   slots: (0 slots) slave
   replicates a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43
M: cc8a78087798e148b257d2ae33815a25715109e8 192.168.2.202:7004
   slots:0-5460 (5461 slots) master
   1 additional replica(s)
M: 5183cdee2295a07af3e98226887da2a645d979d1 192.168.2.203:7005
   slots:10923-16383 (5461 slots) master
   1 additional replica(s)
S: 8861dda48f95e748bc0e7df2757cdc723c897f28 192.168.2.201:7002
   slots: (0 slots) slave
   replicates 5183cdee2295a07af3e98226887da2a645d979d1
M: a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43 192.168.2.202:7003
   slots:5461-10922 (5462 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
>>> Send CLUSTER MEET to node 192.168.2.203:7007 to make it join the cluster.
[OK] New node added correctly.
```
	
确认一下，发现新加入的7007的master没有被分配任何的slot，所以还要需要处理：
	
```bash
redis-trib.rb check 192.168.2.201:7001
>>> Performing Cluster Check (using node 192.168.2.201:7001)
S: 158414bbcaa2cf0b9b30a81d2e31fb35ba5b4972 192.168.2.201:7001
   slots: (0 slots) slave
   replicates cc8a78087798e148b257d2ae33815a25715109e8
M: 5fe91cff7ab6c20b2e2ccc0815b0a7227119f52e 192.168.2.203:7007
   slots: (0 slots) master
   0 additional replica(s)
S: 19f6027db2837cc56dd581a3c826a687d096207a 192.168.2.203:7006
   slots: (0 slots) slave
   replicates a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43
M: cc8a78087798e148b257d2ae33815a25715109e8 192.168.2.202:7004
   slots:0-5460 (5461 slots) master
   1 additional replica(s)
M: 5183cdee2295a07af3e98226887da2a645d979d1 192.168.2.203:7005
   slots:10923-16383 (5461 slots) master
   1 additional replica(s)
S: 8861dda48f95e748bc0e7df2757cdc723c897f28 192.168.2.201:7002
   slots: (0 slots) slave
   replicates 5183cdee2295a07af3e98226887da2a645d979d1
M: a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43 192.168.2.202:7003
   slots:5461-10922 (5462 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

##### reshard一些数据过去

resharding的意思就是把一部分hash slot从一些node上迁移到另外一些node上。
	
```bash
redis-trib.rb reshard 192.168.2.201:7001
How many slots do you want to move (from 1 to 16384)? 4096
What is the receiving node ID? 5fe91cff7ab6c20b2e2ccc0815b0a7227119f52e
Please enter all the source node IDs.
  Type 'all' to use all the nodes as source nodes for the hash slots.
  Type 'done' once you entered all the source nodes IDs.
Source node #1:cc8a78087798e148b257d2ae33815a25715109e8
Source node #2:5183cdee2295a07af3e98226887da2a645d979d1
Source node #3:a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43
Source node #4:done
```
	
要把之前3个master算上，总共4096个hashslot迁移到新的第四个master上去，

##### 添加node作为slave

203执行：
	
```bash
mkdir -p /var/redis/7008
cd /etc/redis
cp 7006.conf 7008.conf
vi 7008.conf
# 改一下里面的配置
port 7008
cluster-enabled yes
cluster-config-file /etc/redis-cluster/node-7008.conf
cluster-node-timeout 15000
daemonize	yes							
pidfile		/var/run/redis_7008.pid 						
dir 		/var/redis/7008		
logfile /var/log/redis/7008.log
bind 192.168.2.203
appendonly yes
	
cd /etc/init.d/
cp redis_7006 redis_7008
vi redis_7008
# REDISPORT=7008
	
/etc/init.d/redis_7008 start
```
	
201执行，将新的节点挂载到7004`cc8a78087798e148b257d2ae33815a25715109e8 `上面去：
	
```bash
redis-trib.rb add-node --slave --master-id cc8a78087798e148b257d2ae33815a25715109e8 192.168.2.203:7008 192.168.2.201:7001
```
	
##### 删除node

先用resharding将数据都移除到其他节点，确保node为空之后，才能执行remove操作，之前7007上是4096个slot，所以要移动3次，分别是移动1365个slot到7003，1365个slot到7004，1366个slot到7005上。
	
```bash
redis-trib.rb reshard 192.168.2.201:7001
redis-trib.rb del-node 192.168.2.201:7001 5fe91cff7ab6c20b2e2ccc0815b0a7227119f52e
>>> Removing node 5fe91cff7ab6c20b2e2ccc0815b0a7227119f52e from cluster 192.168.2.201:7001
>>> Sending CLUSTER FORGET messages to the cluster...
>>> SHUTDOWN the node.
```
	
当你清空了一个master的hashslot时，redis cluster就会自动将其slave挂载到其他master上去，这个时候就只要删除掉master就可以了。
	
#### Redis Cluster的Slave自动迁移

比如现在有10个master，每个有1个对应的slave，然后现在新增了3个slave作为冗余，有的master就有2个slave了，出现了salve冗余。这个时候如果某个master的slave挂了，那么redis cluster会自动迁移一个冗余的slave给那个挂掉slave的master。

它可以避免这样一个场景：如果你每个master只有一个slave，万一某一个slave死了，然后很快，master也死了，那可用性就降低了。但是如果你给整个集群挂载了一些冗余slave，那么某个master的slave死了，冗余的slave会被自动迁移过去，作为master的新slave，此时即使那个master也死了，还是有一个slave会切换成master的。


上面的实验中有一个master是有冗余slave的，直接让其他master其中的一个slave死掉，然后看有冗余slave会不会自动挂载到那个master，`203:7005`的master，冗余了一个slave。

```bash
redis-trib.rb check 192.168.2.201:7001
>>> Performing Cluster Check (using node 192.168.2.201:7001)
S: 158414bbcaa2cf0b9b30a81d2e31fb35ba5b4972 192.168.2.201:7001
   slots: (0 slots) slave
   replicates 5183cdee2295a07af3e98226887da2a645d979d1
S: 19f6027db2837cc56dd581a3c826a687d096207a 192.168.2.203:7006
   slots: (0 slots) slave
   replicates a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43
M: cc8a78087798e148b257d2ae33815a25715109e8 192.168.2.202:7004
   slots:1365-6825 (5461 slots) master
   1 additional replica(s)
S: 77aa78066b1a542e501bd9a0691f5f923529c482 192.168.2.203:7008
   slots: (0 slots) slave
   replicates cc8a78087798e148b257d2ae33815a25715109e8
M: 5183cdee2295a07af3e98226887da2a645d979d1 192.168.2.203:7005
   slots:6826,10923-16383 (5462 slots) master
   2 additional replica(s)
S: 8861dda48f95e748bc0e7df2757cdc723c897f28 192.168.2.201:7002
   slots: (0 slots) slave
   replicates 5183cdee2295a07af3e98226887da2a645d979d1
M: a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43 192.168.2.202:7003
   slots:0-1364,6827-10922 (5461 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

现在把`203:7008`给kill掉，并删除pidfile，这样`202:7004`就没有slave了，看看Redis Cluster会做些什么。

```bash
redis-trib.rb check 192.168.2.201:7001
>>> Performing Cluster Check (using node 192.168.2.201:7001)
S: 158414bbcaa2cf0b9b30a81d2e31fb35ba5b4972 192.168.2.201:7001
   slots: (0 slots) slave
   replicates cc8a78087798e148b257d2ae33815a25715109e8
S: 19f6027db2837cc56dd581a3c826a687d096207a 192.168.2.203:7006
   slots: (0 slots) slave
   replicates a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43
M: cc8a78087798e148b257d2ae33815a25715109e8 192.168.2.202:7004
   slots:1365-6825 (5461 slots) master
   1 additional replica(s)
M: 5183cdee2295a07af3e98226887da2a645d979d1 192.168.2.203:7005
   slots:6826,10923-16383 (5462 slots) master
   1 additional replica(s)
S: 8861dda48f95e748bc0e7df2757cdc723c897f28 192.168.2.201:7002
   slots: (0 slots) slave
   replicates 5183cdee2295a07af3e98226887da2a645d979d1
M: a7d09608d3669b0bff9152dc4c62fc2f8e5c2e43 192.168.2.202:7003
   slots:0-1364,6827-10922 (5461 slots) master
   1 additional replica(s)
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

可以看到，之前`203:7005`是有2个slave的，Redis Cluster在7008挂掉以后，自动将`201:7001`作为slave挂载到了`202:7004`下面。


### Redis Cluster核心原理

#### 节点间的内部通信机制

##### gossip协议

redis cluster节点间采取gossip协议进行通信，集群本身有很多元数据，比如hashslot和节点之间的映射，master和slave之间的关系，故障信息等等。

像集中式的存储，例如采用zookeeper集中式的维护和存储元数据。举个例子，集群元数据集中式存储的一个典型的代表，就是大数据领域里面的storm（分布式的大数据实时计算引擎），集中式的元数据存储架构底层是基于zookeeper（分布式协调中间件）的集群，这样来维护所有集群的元数据。

gossip跟集中式不同，不是将集群元数据（节点信息，故障，等等）集中存储在某个节点上，每个节点都持有一份元数据，互相之间不断通信，保持整个集群所有节点的数据是完整的。

`集中式`：**好处在于，元数据的更新和读取，时效性非常好，一旦元数据出现了变更，立即就更新到集中式的存储中，其他节点读取的时候立即就可以感知到; 不好在于，所有的元数据的跟新压力全部集中在一个地方，可能会导致元数据的存储有压力。**

`gossip`：**好处在于元数据的更新比较分散，不是集中在一个地方，更新请求会陆陆续续发到所有节点上去更新，有一定的延时，降低了压力; 缺点，元数据更新有延时，可能导致集群的一些操作会有一些滞后。**

##### 10000端口

每个节点都有一个专门用于节点间通信的端口，就是自己提供服务的端口号+10000，比如7001，那么用于节点间通信的就是17001端口。每个节点每隔一段时间都会往另外几个节点发送ping消息，同时其他节点接收到ping之后返回pong。


##### 交换的信息

节点之间相互交换信息包括故障信息，节点的增加和移除，hash slot信息，等等。


#### gossip协议

gossip协议包含多种消息，包括ping，pong，meet，fail，等等。

* ping: 每个节点都会频繁给其他节点发送ping，其中包含自己的状态还有自己维护的集群元数据，互相通过ping交换元数据。

* meet: 某个节点发送meet给新加入的节点，让新节点加入集群中，然后新节点就会开始与其他节点进行通信。

	`redis-trib.rb add-node`其实内部就是发送了一个gossip meet消息，给新加入的节点，通知那个节点去加入我们的集群。
	
* pong: 返回ping和meet，包含自己的状态和其他信息，也可以用于信息广播和更新。
* fail: 某个节点判断另一个节点fail之后，就发送fail给其他节点，通知其他节点，指定的节点宕机了。


ping很频繁，而且要携带一些元数据，所以可能会加重网络负担，每个节点每秒会执行10次ping，每次会选择5个最久没有通信的其他节点。当然如果发现某个节点通信延时达到了`cluster_node_timeout / 2`，那么立即发送ping，避免数据交换延时过长，落后的时间太长了，比如说，两个节点之间都10分钟没有交换数据了，那么整个集群处于严重的元数据不一致的情况，就会有问题。`cluster_node_timeout`可以调整，如果值比较大，那么会降低发送的频率，每次ping的目的一个是带上自己节点的信息，还有就是带上1/10其他节点的信息一起发送出去，跟其他节点进行数据交换。每次至少发给3个其他节点，最多发送总节点-2个其他节点。

### 面向集群的jedis内部实现原理

jedis cluster api与redis cluster集群交互的一些基本原理。

#### 基于重定向的客户端

1. 请求重定向

	客户端可能会挑选任意一个redis实例去发送命令，每个redis实例接收到命令，都会计算key对应的hash slot，如果在本地就在本地处理，否则返回moved给客户端，让客户端进行重定向。`cluster keyslot mykey`，可以查看一个key对应的hash slot是什么。用redis-cli的时候，可以加入-c参数，支持自动的请求重定向，redis-cli接收到moved之后，会自动重定向到对应的节点执行命令。
	
2. 计算hash slot
	
	计算hash slot的算法，就是根据key计算CRC16值，然后对16384取模，拿到对应的hash slot。用hash tag可以手动指定key对应的slot，同一个hash tag下的key，都会在一个hash slot中，比如`set mykey1:{100}`和`set mykey2:{100}`。
	
3. hash slot查找

	节点间通过gossip协议进行数据交换，这样就知道每个hash slot在哪个节点上。
	
#### smart jedis

1. 什么是smart jedis
	
	**基于重定向的客户端，很消耗网络IO，因为大部分情况下，可能都会出现一次请求重定向，才能找到正确的节点。**所以大部分的客户端，比如java redis客户端，就是jedis，都是smart的，本地维护一份hashslot -> node的映射表，大部分情况下，直接走本地缓存就可以找到hashslot -> node，不需要通过节点进行moved重定向。
	
2. JedisCluster的工作原理
	
	在JedisCluster初始化的时候，就会随机选择一个node，初始化hashslot -> node映射表，同时为每个节点创建一个JedisPool连接池。每次基于JedisCluster执行操作，首先JedisCluster都会在本地计算key的hashslot，然后在本地映射表找到对应的节点。如果那个node正好还是持有那个hashslot，那么就ok; 如果进行了reshard这样的操作，可能hashslot已经不在那个node上了，就会返回moved，那么利用该节点的元数据，更新本地的hashslot -> node映射表缓存。重复上面几个步骤，直到找到对应的节点，如果重试超过5次，那么就报错，JedisClusterMaxRedirectionException。jedis老版本，可能会出现在集群某个节点故障还没完成自动切换恢复时，频繁更新hash slot，频繁ping节点检查活跃，导致大量网络IO开销，jedis最新版本，对于这些过度的hash slot更新和ping，都进行了优化，避免了类似问题。
	
3. hashslot迁移和ask重定向

	如果hash slot正在迁移，那么会返回ask重定向给jedis，jedis接收到ask重定向之后，会重新定位到目标节点去执行，但是因为ask发生在hash slot迁移过程中，所以JedisCluster API收到ask是不会更新hashslot本地缓存。如果确定hashslot已经迁移完了，moved还是会更新本地hashslot->node映射表缓存的。
	
	
### Redis Cluster高可用性与主备切换原理

redis cluster的高可用的原理，几乎跟哨兵是类似的

1. 判断节点宕机

	如果一个节点认为另外一个节点宕机，那么就是pfail，主观宕机。
	
	如果多个节点都认为另外一个节点宕机了，那么就是fail，客观宕机，跟哨兵的原理几乎一样，sdown，odown。
	
	在`cluster-node-timeout`内，某个节点一直没有返回pong，那么就被认为pfail。
	
	如果一个节点认为某个节点pfail了，那么会在gossip ping消息中，ping给其他节点，如果超过半数的节点都认为pfail了，那么就会变成fail。

2. 从节点过滤

	对宕机的master node，从其所有的slave node中，选择一个切换成master node。检查每个slave node与master node断开连接的时间，如果超过了`cluster-node-timeout * cluster-slave-validity-factor`，那么就没有资格切换成master，这个从节点超时过滤的步骤也是跟哨兵是一样。
3. 从节点选举

	> 哨兵：对所有从节点进行排序，先排slave priority，然后offset，最后是run id

	每个从节点，都根据自己对master复制数据的offset，来设置一个选举时间，offset越大（复制数据越多）的从节点，选举时间越靠前，优先进行选举
	
	所有的master node开始slave选举投票，给要进行选举的slave进行投票，如果大部分master node（N/2 + 1）都投票给了某个从节点，那么选举通过，那个从节点可以切换成master
	
	从节点执行主备切换，从节点切换为主节点

4. 与哨兵比较

	整个流程跟哨兵相比，非常类似，所以说redis cluster功能强大，直接集成了replication和sentinal的功能。
	
## Redis在实践中的常见问题以及优化思路

### fork耗时导致高并发请求延时

RDB和AOF的时候，其实生成RDB快照，AOF rewrite会有耗费磁盘IO的过程，主进程fork子进程。fork的时候，子进程是需要拷贝父进程的空间内存页表的，也是会耗费一定的时间的，一般来说，如果父进程内存有1个G的数据，那么fork可能会耗费在20ms左右，如果是10G~30G，那么就会耗费20 * 10，甚至20 * 30，也就是几百毫秒的时间。

`info stats`中的latest_fork_usec，可以看到最近一次fork的时长。redis单机QPS一般在几万，fork可能一下子就会拖慢几万条操作的请求时长，从几毫秒变成1秒。

优化思路：

fork耗时跟redis主进程的内存有关系，一般控制redis的内存在10GB以内，slave -> master，全量复制很耗时。

### AOF的阻塞问题

redis将数据写入AOF缓冲区，单独开一个线程做fsync操作，每秒一次。但是redis主线程会检查两次fsync的时间，如果距离上次fsync时间超过了2秒，那么**数据写请求**就会阻塞。everysec，最多丢失2秒的数据，一旦fsync超过2秒的延时，整个redis就被拖慢。

优化思路：

优化硬盘写入速度，建议采用SSD，不要用普通的机械硬盘，SSD，大幅度提升磁盘读写的速度。

### 主从复制延迟问题


主从复制可能会超时严重，这个时候需要良好的监控和报警机制。在`info replication`中，可以看到master和slave复制的offset，做一个差值就可以看到对应的延迟量，如果延迟过多，那么就进行报警。这个问题主要是做好监控。

### 主从复制风暴问题

如果一下子让多个slave从master去执行全量复制，一份大的rdb同时发送到多个slave，会导致网络带宽被严重占用。如果一个master真的要挂载多个slave，那尽量用树状结构，不要用星型结构。

### vm.overcommit_memory

0: 检查有没有足够内存，没有的话申请内存失败
1: 允许使用内存直到用完为止
2: 内存地址空间不能超过swap + 50%

如果是0的话，可能导致类似fork等操作执行失败，申请不到足够的内存空间

	cat /proc/sys/vm/overcommit_memory
	echo "vm.overcommit_memory=1" >> /etc/sysctl.conf
	sysctl vm.overcommit_memory=1

### swapiness

	cat /proc/version，查看linux内核版本

如果linux内核版本<3.5，那么swapiness设置为0，这样系统宁愿swap也不会oom killer（杀掉进程）
如果linux内核版本>=3.5，那么swapiness设置为1，这样系统宁愿swap也不会oom killer

这样可以保证redis不会被杀掉

	echo 0 > /proc/sys/vm/swappiness
	echo vm.swapiness=0 >> /etc/sysctl.conf


### 最大打开文件句柄

	ulimit -n 10032 10032

去上网搜一下，不同的操作系统，版本，设置的方式都不太一样

### tcp backlog

	cat /proc/sys/net/core/somaxconn
	echo 511 > /proc/sys/net/core/somaxconn
	
## Redis总结

如果你的数据量不大，单master就可以容纳，一般来说你的缓存的总量在10G以内就可以，那么建议按照以下架构去部署redis。

redis持久化+备份方案+容灾方案+replication（主从+读写分离）+sentinal（哨兵集群，3个节点，高可用性），可以支撑的数据量在10G以内，可以支撑的写QPS在几万左右，可以支撑的读QPS可以上10万以上（随你的需求，水平扩容slave节点就可以），可用性在99.99%。


如果你的数据量很大，比如（国内排名前三的大电商网站，x宝，x东，x宁易购），数据量是很大的，redis cluster多master分布式存储数据，可以水平扩容。如果要支撑更多的数据量，1T+以上没问题，只要扩容master即可，读写QPS分别都达到几十万都没问题，只要扩容master，redis cluster对读写分离支持不太好，需要执行`readonly`才能去slave上读。

Redis Cluster支撑99.99%可用性也没问题，slave -> master的主备切换，冗余slave去进一步提升可用性的方案（每个master挂一个slave，但是整个集群再加个3个slave冗余一下）。
