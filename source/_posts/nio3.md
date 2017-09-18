---
title: Java NIO Buffer详解2
date: 2017-08-17 20:31:12
tags: [java,io]
categories: io
---

# DirectBuffer

之前我们用ByteBuffer.allocate()看一下源码：

```java
public static ByteBuffer allocate(int capacity) {
    if (capacity < 0)
        throw new IllegalArgumentException();
    return new HeapByteBuffer(capacity, capacity);
}
```

`HeapByteBuffer`是从堆上分配的内存空间创建的Buffer，实际上JDK还提供了另外一种方式ByteBuffer.allocateDirect()：


```java
public static ByteBuffer allocateDirect(int capacity) {
    return new DirectByteBuffer(capacity);
}
```

<!--more-->

`DirectByteBuffer`创建的buffer是从直接内存中开辟的空间分配，我们叫做对外内存，不会被gc回收，里面用到了很多没有开源的sun的api。


new DirectByteBuffer()，这个对象本身是在堆上创建的，但是源码里的
`base = unsafe.allocateMemory(size);`则是在堆外内存中分配的，那么java堆上的数据是如何找到堆外的数据的呢，一定是保存了一个地址，找了一下发现如下变量：

`Buffer.java`

```java
// Used only by direct buffers
// NOTE: hoisted here for speed in JNI GetDirectBufferAddress
long address;
```

说放在Buffer这个类里是为了效率。

## 零拷贝

如果使用*HeapByteBuffer*在进行文件读写的时候，所有的数据都在Java堆上，然而操作系统不是直接处理堆上的数据，而是把堆上的数据拷贝到操作系统里（Java内存模型之外）某一块内存空间中，然后再把数据和IO设备进行交互。意思用*HeapByteBuffer*进行IO操作的时候中间多了一次数据拷贝的过程。

而使用*DirectByteBuffer*，因为数据本来就在堆外内存中，所以跟IO设备交互的时候没有拷贝的过程，提升了效率，这有一个专有名词，也就是**零拷贝**。


以下内容转自[知乎](https://www.zhihu.com/question/57374068?utm_source=wechat_session&utm_medium=social&utm_campaign=ge13_1&utm_division=ge13_2)：

>DirectByteBuffer 自身是一个Java对象，在Java堆中；而这个对象中有个long类型字段address，记录着一块调用 malloc() 申请到的native memory。

>HotSpot VM里的GC除了CMS之外都是要移动对象的，是所谓“compacting GC”。
>
>如果要把一个Java里的 byte[] 对象的引用传给native代码，让native代码直接访问数组的内容的话，就必须要保证native代码在访问的时候这个 byte[] 对象不能被移动，也就是要被“pin”（钉）住。

>可惜HotSpot VM出于一些取舍而决定不实现单个对象层面的object pinning，要pin的话就得暂时禁用GC——也就等于把整个Java堆都给pin住。HotSpot VM对JNI的Critical系API就是这样实现的。这用起来就不那么顺手。
>
>所以 Oracle/Sun JDK / OpenJDK 的这个地方就用了点绕弯的做法。它假设把 HeapByteBuffer 背后的 byte[] 里的内容拷贝一次是一个时间开销可以接受的操作，同时假设真正的I/O可能是一个很慢的操作。
>
>于是它就先把 HeapByteBuffer 背后的 byte[] 的内容拷贝到一个 DirectByteBuffer 背后的native memory去，这个拷贝会涉及 sun.misc.Unsafe.copyMemory() 的调用，背后是类似 memcpy() 的实现。这个操作本质上是会在整个拷贝过程中暂时不允许发生GC的，虽然实现方式跟JNI的Critical系API不太一样。（具体来说是 Unsafe.copyMemory() 是HotSpot VM的一个intrinsic方法，中间没有safepoint所以GC无法发生）。
>
>然后数据被拷贝到native memory之后就好办了，就去做真正的I/O，把 DirectByteBuffer 背后的native memory地址传给真正做I/O的函数。这边就不需要再去访问Java对象去读写要做I/O的数据了。



## MappedByteBuffer

*DirectBuffer*是继承于*MappedByteBuffer*的，内存映射文件是一种允许Java直接从内存访问的特殊文件，操作系统再负责将内存的改动写入的IO设备中。


```java
/**
 * MappedByteBuffer
 * @author yangfan
 * @date 2017/08/17
 */
public class NioTest9 {
    public static void main(String[] args) throws IOException {
        RandomAccessFile randomAccessFile = new RandomAccessFile("NioTest9.txt", "rw");
        FileChannel fileChannel = randomAccessFile.getChannel();

        // 将文件映射到内存中，就可以在内存中直接修改文件了
        MappedByteBuffer mappedByteBuffer = fileChannel.map(FileChannel.MapMode.READ_WRITE, 0, 5);

        mappedByteBuffer.put(0, (byte)'a');
        mappedByteBuffer.put(3, (byte)'b');

        randomAccessFile.close();
    }
}
```

上面的代码执行完成会直接修改*NioTest9.txt*中的内容。


## FileLock文件锁

这个用的不多，共享锁是只读，都只能读，排他是只能自己读写，别人不能读也不能写。

```java
/**
 * 文件锁
 * @author yangfan
 * @date 2017/08/17
 */
public class NioTest10 {
    public static void main(String[] args) throws IOException {
        RandomAccessFile randomAccessFile = new RandomAccessFile("NioTest10.txt", "rw");
        FileChannel fileChannel = randomAccessFile.getChannel();

        // 从索引3锁6个长度
        // true表示共享锁，false表示排他锁
        FileLock fileLock = fileChannel.lock(3, 6, true);

        System.out.println("valid: " + fileLock.isValid());
        System.out.println("lock type: " + fileLock.isShared());

        fileLock.release();

        randomAccessFile.close();
    }
}
```


## Scattering & Gathering

之前的例子中在进行读写的时候，都是用的一个Buffer对象来完成的，Buffer的Scattering(散开)，可以接受传递一个Buffer的数组。比如我要把Channel中的信息读到Buffer中，那么channel里面有20个字节，传递一个Buffer数组，往里面读信息，第一个数组长度是10，第二个数组长度是5，第三个长度也是5，它会按顺序将第一个Buffer读满，再接着往第二个读，再读第三个。就是将一个Channel中的数据读取到多个Buffer中。而Gathering则是相反的，他是写操作，先将第一个Buffer写到Channel中，然后也是顺序写入后面的channel。

下面用一个网络IO的例子来说明：

```java
/**
 * 关于Buffer的Scattering与Gathering
 *
 * @author yangfan
 * @date 2017/08/17
 */
public class NioTest11 {
    public static void main(String[] args) throws IOException {
        ServerSocketChannel serverSocketChannel = ServerSocketChannel.open();
        InetSocketAddress address = new InetSocketAddress(8899);
        serverSocketChannel.socket().bind(address);

        int messageLength = 2 + 3 + 4;

        ByteBuffer[] buffers = new ByteBuffer[3];

        buffers[0] = ByteBuffer.allocate(2);
        buffers[1] = ByteBuffer.allocate(3);
        buffers[2] = ByteBuffer.allocate(4);

        SocketChannel socketChannel = serverSocketChannel.accept();

        while (true) {
            int bytesRead = 0;
            while (bytesRead < messageLength) {
                // 数组类型的读
                long r = socketChannel.read(buffers);

                bytesRead += r;

                System.out.println("bytesRead: " + bytesRead);

                Stream.of(buffers)
                        .map(buffer -> "position: " + buffer.position() + ", limit: " + buffer.limit())
                        .forEach(System.out::println);

            }

            Stream.of(buffers).forEach(Buffer::flip);

            long bytesWritten = 0;

            while (bytesWritten < messageLength) {
                long r = socketChannel.write(buffers);
                bytesWritten += r;
            }

            Stream.of(buffers).forEach(Buffer::clear);

            System.out.println("bytesRead:  " + bytesRead + "， byteWritten: " + bytesWritten + ", messageLength: " + messageLength);
        }
    }
}
```

`nc localhost 8899`


`telnet localhost 8899`

这2个命令都可以进行刚才的程序测试。

```bash
nc localhost 8899
hellowor
hellowor
```

回车也算一个字节，所以输入*hellowor*后，程序马上回写了数据。控制台输出：

```bash
bytesRead: 9
position: 2, limit: 2
position: 3, limit: 3
position: 4, limit: 4
bytesRead:  9， byteWritten: 9, messageLength: 9
```

现在程序依旧在等待输入，我们继续输入
```java
hello
a

hello
a
```
这里先输入一个*hello*+回车，再输入*a*+回车，再回车，进行了3次操作，也一共是9个字节，数据进行了回写，接下来看控制台的输出。

```bash
bytesRead: 6
position: 2, limit: 2
position: 3, limit: 3
position: 1, limit: 4
bytesRead: 8
position: 2, limit: 2
position: 3, limit: 3
position: 3, limit: 4
bytesRead: 9
position: 2, limit: 2
position: 3, limit: 3
position: 4, limit: 4
bytesRead:  9， byteWritten: 9, messageLength: 9
```

第一次输入*hello*+回车的时候，输入了6个字节，0、1索引的buffer读满了，2索引的buffer读取了一个位置，再敲入*a*+回车，2索引的Buffer还剩一个位置，此时再敲入回车，Buffer全部读满，Buffer开始进行写入操作。




