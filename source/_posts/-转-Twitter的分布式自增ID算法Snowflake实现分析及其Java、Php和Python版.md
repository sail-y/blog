title: "[转]Twitter的分布式自增ID算法Snowflake实现分析及其Java、Php和Python版"
date: 2015-04-22 09:47:54
tags: [分布式自增ID算法]
categories: Java
---
转载：http://www.dengchuanhua.com/132.html

在分布式系统中，需要生成全局UID的场合还是比较多的，twitter的snowflake解决了这种需求，实现也还是很简单的，除去配置信息，核心代码就是毫秒级时间41位+机器ID 10位+毫秒内序列12位。

该项目地址为：https://github.com/twitter/snowflake是用Scala实现的。

python版详见开源项目https://github.com/erans/pysnowflake。

核心代码为其IdWorker这个类实现，其原理结构如下，我分别用一个0表示一位，用—分割开部分的作用：

```
0---0000000000 0000000000 0000000000 0000000000 0 --- 00000 ---00000 ---0000000000 00
```
在上面的字符串中，第一位为未使用（实际上也可作为long的符号位），接下来的41位为毫秒级时间，然后5位datacenter标识位，5位机器ID（并不算标识符，实际是为线程标识），然后12位该毫秒内的当前毫秒内的计数，加起来刚好64位，为一个Long型。

这样的好处是，整体上按照时间自增排序，并且整个分布式系统内不会产生ID碰撞（由datacenter和机器ID作区分），并且效率较高，经测试，snowflake每秒能够产生26万ID左右，完全满足需要。
<!--more-->
且看其核心代码：

```scala
</pre>
/** Copyright 2010-2012 Twitter, Inc.*/
package com.twitter.service.snowflake

import com.twitter.ostrich.stats.Stats
import com.twitter.service.snowflake.gen._
import java.util.Random
import com.twitter.logging.Logger

/**
 * An object that generates IDs.
 * This is broken into a separate class in case
 * we ever want to support multiple worker threads
 * per process
 */
class IdWorker(val workerId: Long, val datacenterId: Long, private val reporter: Reporter, var sequence: Long = 0L)
extends Snowflake.Iface {
  private[this] def genCounter(agent: String) = {
    Stats.incr("ids_generated")
    Stats.incr("ids_generated_%s".format(agent))
  }
  private[this] val exceptionCounter = Stats.getCounter("exceptions")
  private[this] val log = Logger.get
  private[this] val rand = new Random

  val twepoch = 1288834974657L

 //机器标识位数

  private[this] val workerIdBits = 5L

//数据中心标识位数
  private[this] val datacenterIdBits = 5L

//机器ID最大值
  private[this] val maxWorkerId = -1L ^ (-1L << workerIdBits)

//数据中心ID最大值
  private[this] val maxDatacenterId = -1L ^ (-1L << datacenterIdBits)

//毫秒内自增位
  private[this] val sequenceBits = 12L

//机器ID偏左移12位

  private[this] val workerIdShift = sequenceBits

//数据中心ID左移17位
  private[this] val datacenterIdShift = sequenceBits + workerIdBits

//时间毫秒左移22位
  private[this] val timestampLeftShift = sequenceBits + workerIdBits + datacenterIdBits
  private[this] val sequenceMask = -1L ^ (-1L << sequenceBits)

  private[this] var lastTimestamp = -1L

  // sanity check for workerId
  if (workerId > maxWorkerId || workerId < 0) {
    exceptionCounter.incr(1)
    throw new IllegalArgumentException("worker Id can't be greater than %d or less than 0".format(maxWorkerId))
  }

  if (datacenterId > maxDatacenterId || datacenterId < 0) {
    exceptionCounter.incr(1)
    throw new IllegalArgumentException("datacenter Id can't be greater than %d or less than 0".format(maxDatacenterId))
  }

  log.info("worker starting. timestamp left shift %d, datacenter id bits %d, worker id bits %d, sequence bits %d, workerid %d",
    timestampLeftShift, datacenterIdBits, workerIdBits, sequenceBits, workerId)

  def get_id(useragent: String): Long = {
    if (!validUseragent(useragent)) {
      exceptionCounter.incr(1)
      throw new InvalidUserAgentError
    }

    val id = nextId()
    genCounter(useragent)

    reporter.report(new AuditLogEntry(id, useragent, rand.nextLong))
    id
  }

  def get_worker_id(): Long = workerId
  def get_datacenter_id(): Long = datacenterId
  def get_timestamp() = System.currentTimeMillis

  protected[snowflake] def nextId(): Long = synchronized {
    var timestamp = timeGen()

 //时间错误

    if (timestamp < lastTimestamp) {
      exceptionCounter.incr(1)
      log.error("clock is moving backwards.  Rejecting requests until %d.", lastTimestamp);
      throw new InvalidSystemClock("Clock moved backwards.  Refusing to generate id for %d milliseconds".format(
        lastTimestamp - timestamp))
    }

    if (lastTimestamp == timestamp) {
//当前毫秒内，则+1
      sequence = (sequence + 1) & sequenceMask
      if (sequence == 0) {
//当前毫秒内计数满了，则等待下一秒
        timestamp = tilNextMillis(lastTimestamp)
      }
    } else {
      sequence = 0
    }

    lastTimestamp = timestamp
//ID偏移组合生成最终的ID，并返回ID   

((timestamp - twepoch) << timestampLeftShift) |
      (datacenterId << datacenterIdShift) |
      (workerId << workerIdShift) |
      sequence
  }

//等待下一个毫秒的到来 

protected def tilNextMillis(lastTimestamp: Long): Long = {
    var timestamp = timeGen()
    while (timestamp <= lastTimestamp) {
      timestamp = timeGen()
    }
    timestamp
  }

  protected def timeGen(): Long = System.currentTimeMillis()

  val AgentParser = """([a-zA-Z][a-zA-Z\-0-9]*)""".r

  def validUseragent(useragent: String): Boolean = useragent match {
    case AgentParser(_) => true
    case _ => false
  }
}
<pre>
```
上述为twitter的实现，下面且看一个Java实现，貌似为淘宝的朋友写的。
```java
public class IdWorker {
 private final long workerId;
 private final static long twepoch = 1361753741828L;
 private long sequence = 0L;
 private final static long workerIdBits = 4L;
 public final static long maxWorkerId = -1L ^ -1L << workerIdBits;
 private final static long sequenceBits = 10L;

 private final static long workerIdShift = sequenceBits;
 private final static long timestampLeftShift = sequenceBits + workerIdBits;
 public final static long sequenceMask = -1L ^ -1L << sequenceBits;

 private long lastTimestamp = -1L;

 public IdWorker(final long workerId) {
  super();
  if (workerId > this.maxWorkerId || workerId < 0) {
   throw new IllegalArgumentException(String.format(
     "worker Id can't be greater than %d or less than 0",
     this.maxWorkerId));
  }
  this.workerId = workerId;
 }

 public synchronized long nextId() {
  long timestamp = this.timeGen();
  if (this.lastTimestamp == timestamp) {
   this.sequence = (this.sequence + 1) & this.sequenceMask;
   if (this.sequence == 0) {
    System.out.println("###########" + sequenceMask);
    timestamp = this.tilNextMillis(this.lastTimestamp);
   }
  } else {
   this.sequence = 0;
  }
  if (timestamp < this.lastTimestamp) {
   try {
    throw new Exception(
      String.format(
        "Clock moved backwards.  Refusing to generate id for %d milliseconds",
        this.lastTimestamp - timestamp));
   } catch (Exception e) {
    e.printStackTrace();
   }
  }

  this.lastTimestamp = timestamp;
  long nextId = ((timestamp - twepoch << timestampLeftShift))
    | (this.workerId << this.workerIdShift) | (this.sequence);
//  System.out.println("timestamp:" + timestamp + ",timestampLeftShift:"
//    + timestampLeftShift + ",nextId:" + nextId + ",workerId:"
//    + workerId + ",sequence:" + sequence);
  return nextId;
 }

 private long tilNextMillis(final long lastTimestamp) {
  long timestamp = this.timeGen();
  while (timestamp <= lastTimestamp) {
   timestamp = this.timeGen();
  }
  return timestamp;
 }

 private long timeGen() {
  return System.currentTimeMillis();
 }
 
 
 public static void main(String[] args){
  IdWorker worker2 = new IdWorker(2);
  System.out.println(worker2.nextId());

  
 }

}
```
再来看一个php的实现	
```php
<?php
class Idwork
{
const debug = 1;
static $workerId;
static $twepoch = 1361775855078;
static $sequence = 0;
const workerIdBits = 4;
static $maxWorkerId = 15;
const sequenceBits = 10;
static $workerIdShift = 10;
static $timestampLeftShift = 14;
static $sequenceMask = 1023;
private  static $lastTimestamp = -1;

function __construct($workId){
if($workId > self::$maxWorkerId || $workId< 0 )
{
throw new Exception("worker Id can't be greater than 15 or less than 0");
}
self::$workerId=$workId;

echo 'logdebug->__construct()->self::$workerId:'.self::$workerId;
echo '</br>';

}

function timeGen(){
//获得当前时间戳
$time = explode(' ', microtime());
$time2= substr($time[0], 2, 3);
$timestramp = $time[1].$time2;
echo 'logdebug->timeGen()->$timestramp:'.$time[1].$time2;
echo '</br>';
return  $time[1].$time2;
}
function  tilNextMillis($lastTimestamp) {
$timestamp = $this->timeGen();
while ($timestamp <= $lastTimestamp) {
$timestamp = $this->timeGen();
}

echo 'logdebug->tilNextMillis()->$timestamp:'.$timestamp;
echo '</br>';
return $timestamp;
}

function  nextId()
{
$timestamp=$this->timeGen();
echo 'logdebug->nextId()->self::$lastTimestamp1:'.self::$lastTimestamp;
echo '</br>';
if(self::$lastTimestamp == $timestamp) {
self::$sequence = (self::$sequence + 1) & self::$sequenceMask;
if (self::$sequence == 0) {
    echo "###########".self::$sequenceMask;
    $timestamp = $this->tilNextMillis(self::$lastTimestamp);
    echo 'logdebug->nextId()->self::$lastTimestamp2:'.self::$lastTimestamp;
    echo '</br>';
  }
} else {
self::$sequence  = 0;
    echo 'logdebug->nextId()->self::$sequence:'.self::$sequence;
    echo '</br>';
}
if ($timestamp < self::$lastTimestamp) {
   throw new Excwption("Clock moved backwards.  Refusing to generate id for ".(self::$lastTimestamp-$timestamp)." milliseconds");
   }
self::$lastTimestamp  = $timestamp;
echo 'logdebug->nextId()->self::$lastTimestamp3:'.self::$lastTimestamp;
echo '</br>';

echo 'logdebug->nextId()->(($timestamp - self::$twepoch << self::$timestampLeftShift )):'.((sprintf('%.0f', $timestamp) - sprintf('%.0f', self::$twepoch) ));
echo '</br>';
$nextId = ((sprintf('%.0f', $timestamp) - sprintf('%.0f', self::$twepoch)  )) | ( self::$workerId << self::$workerIdShift ) | self::$sequence;
echo 'timestamp:'.$timestamp.'-----';
echo 'twepoch:'.sprintf('%.0f', self::$twepoch).'-----';
echo 'timestampLeftShift ='.self::$timestampLeftShift.'-----';
echo 'nextId:'.$nextId.'----';
echo 'workId:'.self::$workerId.'-----';
echo 'workerIdShift:'.self::$workerIdShift.'-----';
return $nextId;
}

}
$Idwork = new Idwork(1);
$a= $Idwork->nextId();
$Idwork = new Idwork(2);
$a= $Idwork->nextId();
?>
```