---
title: Netty-源码分析(三）
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


在ByteBuf中，Netty提供了一个readerIndex和writerIndex，这样避免了调用flip()方法，只有read开头的方法或和write方法开头的方法才会改变这2个变量的值。get和set方法是不会改变索引的，我们可以通过readerIndex()和writerIndex()来修改。

下面图中前面的部分表示已被读取过的数据，是可以丢弃的，中间是可读的数据，最后是可写的数据。

```java
+-------------------+------------------+------------------+
| discardable bytes |  readable bytes  |  writable bytes  |
|                   |     (CONTENT)    |                  |
+-------------------+------------------+------------------+
|                   |                  |                  |
0      <=      readerIndex   <=   writerIndex    <=    capacity
```



### 3种缓冲区类型

Netty ByteBuf所提供的3种缓冲区类型：

1. heap buffer (堆缓冲区)
2. direct buffer （直接缓冲区）
3. composite buffer（复合缓冲区）


堆上的ByteBuf，这是最常用的类型，ByteBuf将数据存储到JVM的堆空间中， 并且将实际的数据存放到byte array中来实现。		

优点：由于数据是存储在JVM的堆红，因此可以快速的创建与快速的释放，并且它提供了直接访问内部字节数组的方法。

缺点：每次读写数据时，都需要先将数据复制到直接缓冲区中再进行网络传输。

```java
public class ByteBufTest1 {
    public static void main(String[] args) {
        ByteBuf byteBuf = Unpooled.copiedBuffer("hello world", Charset.forName("utf-8"));

        // 表示是堆上的缓冲，是用字节数组存放的
        if (byteBuf.hasArray()) {
            byte[] content = byteBuf.array();

            System.out.println(new String(content, Charset.forName("utf-8")));

            System.out.println(byteBuf);

        }
    }
}
```

DirectBuffer（直接缓冲区）

在堆之外直接分配内存空间，直接缓冲区并不会占用堆的容量空间，因为它是由操作系统在本地内存进行的数据分配。

优点：在使用Socket进行数据传递时，性能非常好，因为数据直接位于操作系统的本地内存中，所以不需要从JVM将数据复制到直接缓冲区中，性能很好。

缺点：因为Direct Buffer是直接在操作系统内存中的，所以内存空间的分配与释放要比堆空间更加复杂，而且速度要慢一些。Netty通过提供内存池来解决这个问题。直接缓冲区并不支持通过字节数组方式来访问数据。

**重点：对于后端的业务消息的编解码来说，推荐使用HeapByteBuf；对于I/O通信线程在读写缓冲区时，推荐使用DirectByteBuf。**


Composite Buffer（复合缓冲区）

复合缓冲区为多个ByteBuf提供一个聚合视图。在这里你可以根据需要添加或者删除ByteBuf实例， 是一个JDK的ByteBuffer实全缺失的特性。

```java
public class ByteBufTest2 {

    public static void main(String[] args) {
        CompositeByteBuf compositeByteBuf = Unpooled.compositeBuffer();

        ByteBuf heapBuf = Unpooled.buffer(10);
        ByteBuf directBuf = Unpooled.directBuffer(8);

        compositeByteBuf.addComponents(heapBuf, directBuf);

//        compositeByteBuf.removeComponent(0);

        Iterator<ByteBuf> iterator = compositeByteBuf.iterator();
        while (iterator.hasNext()) {
            System.out.println(iterator.next());
        }

        compositeByteBuf.forEach(System.out::println);

    }
}
```
### JDK的ByteBuffer与Netty的ByteBuf之间的差异比对

1. Netty的ByteBuf采用了读写索引分离的策略（readerIndex与writerIndex），一个初始化（里面尚未有任何数据）的ByteBuf的readerIndex和writerIndex值都为0。
2. 当读索引与写索引处于同一个位置时，如果我们继续读取，那么就会抛出常见的IndexOutOfBoundsException。
3. 对于ByteBuf的任何读写操作都会分别单独维护读索引和写索引。maxCapacity最大容量默认的限制就是Integer.MAX_VALUE。

JDK的ByteBuffer的缺点：

1. `final byte[] hb;`这是JDK的ByteBuffer对中用于存储数据的对象声明；可以看到其数据是被声明为final的，也就是长度是固定不变的。一旦分配好就不能动态扩容与收缩；而且当待存储的数据字节很大时就很有可能出现IndexOutOfBoundsException。如果要预防这个异常，那就需要在存储之前完全确定好待存储的字节大小。如果ByteBuffer的空间不足，我们只有一种解决方案：创建一个全新的ByteBuffer对象，然后再将之前的ByteBuffer的数据复制过去，这一切的操作都需要由开发者自己来手动完成。
2. ByteBuffer只使用一个position指针来标识位置信息，在进行读写切换时就需要调用flip方法或是rewind方法，使用起来很不方便。

Netty的ByteBuf的优点：

1. 存储字节是动态的，其最大值默认是Integer.MAX_VALUE。这里的动态性是体现在write方法中的，write方法在执行时会判断buffer容量，如果不足则自动扩容。
2. ByteBuf的读写索引是完全分开的，使用起来就很方便。


在写入的时候，ensureWritable0()方法会检查容量大小来决定是否需要扩容。

```java
public ByteBuf writeByte(int value) {
    ensureWritable0(1);
    _setByte(writerIndex++, value);
    return this;
}
```


### clear()

clear()方法只会重置readerIndex和writerIndex()，不会产生数据的移动。

### discardReadBytes()

通过discardReadBytes()方法，可以丢弃已经读取过的字节，并回收它们的空间。


## 引用计数

引用计数是一种通过在某个对象所持有的资源不再被其他对象引用时释放该对象所持有的资源来优化内存使用和性能的技术。Netty在第4版为ByteBuf和ByteBufHolder引入了引用技术技术，它们都实现了`interface ReferenceCounted`。

ReferenceCounted包含了获取引用数量（refCnt），增加计数（retain），减少计数（realse)等API，用过OC的都应该比较熟悉。

**AbstractReferenceCountedByteBuf**的**retain0()**方法是一个死循环，这段代码确保了ByteBuf的引用计数变为0的时候不会再次被使用。里面用了CAS来确保refCnt是原子的修改，没有并发问题。

### AtomicIntegerFieldUpdater VS AtomicInteger

**AbstractReferenceCountedByteBuf**维护了一个**AtomicIntegerFieldUpdater**来修改volatile修饰的refCnt，那么我们都知道JDK5提供了一个**AtomicInteger**来对int进行原子修改，为什么Netty不用我们更熟悉的**AtomicInteger**呢？

AtomicIntegerFieldUpdater要点总结：

1. 更新器更新的必须是int类型变量，不能是其包装类型。
2. 更新器更新的必须是volatile类型变量，确保线程之间共享变量值的立即**[可见性](http://www.saily.top/2016/12/05/concurrency3/#可见性)**。
3. 变量不能是static的，必须是实例变量。因为Unsafe.objectFieldOffset()方法不支持静态变量（CAS操作本质上是通过对象实例的偏移量来直接进行赋值）。
4. 更新器只能修改它课件范围内的变量，因为更新器是通过反射来得到这个变量，如果变量不可见就会报错。

如果要更新的变量是包装类型，我们可以使用AtomicReferenceFieldUpdater来进行更新。

```bash
if (fieldt != int.class)
    throw new IllegalArgumentException("Must be integer type");

if (!Modifier.isVolatile(modifiers))
    throw new IllegalArgumentException("Must be volatile type");
```

### 为什么不用AtomicInteger

这是Netty为了性能上的考虑，因为使用AtomicInteger，创建多个ByteBuf也会随之创建多个AtomicInteger对象，但是**AtomicIntegerFieldUpdater**是static修饰的，只有一个对象，由此可见Netty对性能的优化也是考虑到了极致。

## 数据 -> ByteBuf

Netty是在AbstractNioChannel的NioByteUnsafe内部类的read()方法将入站数据转换成ByteBuf对象的。



