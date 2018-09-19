---
title: centos7安装redis4.0.10并进行生产环境部署
tags: [redis]
date: 2018-07-19 23:24:16
categories: redis
---


# 下载

直奔主题，官网下载redis最新版本（2018年07月19日）

http://download.redis.io/releases/redis-4.0.10.tar.gz


# 环境准备

安装tcl

```bash
yum install tcl
```

<!--more-->

# 安装单机版Reids

```bash
mkdir /usr/local/redis && cd /usr/local/redis
wget http://download.redis.io/releases/redis-4.0.10.tar.gz
tar -zxvf redis-4.0.10.tar.gz
cd redis-4.0.10
make && make test && make install
```

最后一步可能需要等的有点久，安装完成以后就开始进行生产环境配置。


# Redis生产环境启动方案

1. redis的`utils`目录下，有个`redis_init_script`脚本
2. 将`redis_init_script`脚本拷贝到linux的`/etc/init.d`目录中，将`redis_init_script`重命名为`redis_6370`，`6370`是我们希望这个redis实例监听的端口号
	
	```bash
	cp /usr/local/redis/redis-4.0.10/utils/redis_init_scrip /etc/init.d/redis_6370
	```
	
3. 修改`redis_6370`脚本的第6行的REDISPORT，设置为相同的端口号（默认是6379）
4. 创建两个目录：/etc/redis（存放redis的配置文件），/var/redis/6370（存放redis的持久化文件）
5. 修改redis配置文件（默认在根目录下，redis.conf），拷贝到/etc/redis目录中，修改名称为6370.conf

	```bash
	cp /usr/local/redis/redis-4.0.10/redis.conf /etc/redis/6370.conf
	```
	
6. 修改redis.conf中的部分配置为生产环境
	
	```bash
	# 让redis以daemon进程运行
	daemonize	yes							
	# 设置redis的pid文件位置
	pidfile		/var/run/redis_6370.pid 
	# 设置redis的监听端口号
	port		6370						
	# 设置持久化文件的存储位置
	dir 		/var/redis/6370				
	# 打开数据持久化
	appendonly  yes	 						
	# 设置密码
	requirepass yourpass	 	  			
	# 设置连接Redis的地址
	# 如果提供给其他机器访问，请在此处设置IP为机器IP
	bind  127.0.0.1					
	```
7. 启动redis

	```bash
	cd /etc/init.d/
	chmod 777 redis_6370
	./redis_6370 start
	```
8. 确认redis进程是否启动

	```bash
	ps -ef | grep redis
	```
9. 让redis跟随系统启动自动启动，在`/etc/init.d/redis_6370`脚本中，最上面，加入两行注释

	```text
	#!/bin/sh
	# chkconfig:   2345 90 10
	# description:  Redis is a persistent key-value database
	```
	然后执行命令:
	
	```bash
	chkconfig redis_6370 on
	```
	
# redis-cli测试

## PING

```bash
redis-cli -p 6370 -a yourpass PING
PONG
```

## 停机

```bash
redis-cli -h 127.0.0.1 -p 6370 SHUTDOWN
```

## 连接

```bash
redis-cli -p 6370 
127.0.0.1:6370> auth yourpass
OK
127.0.0.1:6370> PING
PONG
127.0.0.1:6370> set k1 v1
OK
127.0.0.1:6370> get k1
"v1"
```

是不是很简单明了？文章到此结束。。。