---
title: Netty-元澳门分析(三）
date: 2017-11-19 17:41:07
tags: [Netty,java]
categories: Netty
---

# 源码分析(三）

前面我们已经了解了Netty的启动流程，以及各个组件之间的关系，接下来要看看Netty的数据容器（ByteBuf)。


## 回顾Java NIO

先回顾一下Java NIO的Buffer使用方式。

使用NIO进行文件读取所涉及的步骤：

1. 从FileInputStream对象获取到Channel对象。
2. 创建Buffer.
3. 将数据从Channel中读取到Buffer对象中。

0 <= mark <= postion <= limit <= capacity

### flip()方法切换读和写的状态：

1. 将limit值设为当前的position。
2. 将position设为0.

<!--more-->

### clear()方法，改变属性值，并没有删除数组里面的数据 ：

1. 将limit值设置成capacity。
2. 将position值设为0。

### compact()方法：

1. 将所有未读的数据复制到buffer起始位置处。
2. 将position设为最后一个未读元素的后面。
3. 将limit设为capacity。
4. 现在buffer准备好了，但是不会覆盖未读的数据。

## ByteBuf


ByteBuf的使用很简单，一般不建议使用构造方法创建，用非池化的Buffer即可。

```java
public static void main(String[] args) {
    ByteBuf buffer = Unpooled.buffer(10);

    for (int i = 0; i < 10; i++) {
        buffer.writeByte(i);
    }

    for (int i = 0; i < buffer.capacity(); i++) {
        System.out.println(buffer.getByte(i));
    }
}
```

上面的代码就包含了创建ByteBuf，写入数据和读取数据。


在ByteBuf中，Netty提供了一个readerIndex和writerIndex，这样避免了调用flip()方法，只有read开头的方法或和write方法开头的方法才会改变这2个变量的值。get和set方法是不会改变索引的。

下面图中前面的部分表示已被读取过的数据，是可以丢弃的，中间是可读的数据，最后是可写的数据。

```java
+-------------------+------------------+------------------+
| discardable bytes |  readable bytes  |  writable bytes  |
|                   |     (CONTENT)    |                  |
+-------------------+------------------+------------------+
|                   |                  |                  |
0      <=      readerIndex   <=   writerIndex    <=    capacity
```



