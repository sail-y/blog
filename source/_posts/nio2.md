---
title: Java NIO Buffer详解
date: 2017-08-15 21:36:49
tags: [java,io]
categories: io
---

# Buffer 

java NIO中的Buffer用于和NIO通道进行交互。数据从通道读入到缓冲区，从缓冲区写入到通道中。 
缓冲区本质上是一块可以写入数据，然后可以从中读取数据的内存。这块内存被包装成NIO Buffer对象，并提供了一组方法，用来方便的访问该块内存。



之前代码里面用到了`ByteBuffer`，实际上`ByteBuffer`不只是可以放byte在里面，也可以放别的类型数据，但是取出来的时候必须跟放进去的类型顺序也保持一致，否则会报错。(`BufferUnderflowException`)

## put & get

```java
public class NioTest5 {
    public static void main(String[] args) {
        ByteBuffer buffer = ByteBuffer.allocate(64);

        buffer.putInt(15);
        buffer.putLong(50000000L);
        buffer.putDouble(14.123123);
        buffer.putChar('好');
        buffer.putShort((short) 2);
        buffer.putChar('的');

        buffer.flip();

        System.out.println(buffer.getInt());
        System.out.println(buffer.getLong());
        System.out.println(buffer.getDouble());
        System.out.println(buffer.getChar());
        System.out.println(buffer.getShort());
        System.out.println(buffer.getChar());

    }
}
```

<!--more-->

## Slice Buffer 

```java
/**
 * Buffer的分片--slice()
 * Slice Buffer与原有Buffer共享相同的底层数组
 * @author yangfan
 * @date 2017/08/15
 */
public class NioTest6 {
    public static void main(String[] args) {
        ByteBuffer buffer = ByteBuffer.allocate(10);

        for (int i = 0; i < buffer.capacity(); i++) {
            buffer.put((byte)i);
        }

        buffer.position(2);
        buffer.limit(6);

        // 会返回一个包含[2,6)原始数据的Buffer，任意修改2个Buffer的数据，对应都会发生变化
        ByteBuffer sliceBuffer = buffer.slice();

        for (int i = 0; i < sliceBuffer.capacity(); i++) {
            byte b = sliceBuffer.get(i);
            b *= 2;
            sliceBuffer.put(i , b);
        }

        buffer.clear();

        while (buffer.hasRemaining()) {
            System.out.println(buffer.get());
        }

        // 输出下面结果
//        0
//        1
//        4
//        6
//        8
//        10
//        6
//        7
//        8
//        9
    }
}
```



## 只读Buffer

```java
/**
 * 只读Buffer,我们可以随时将一个普通Buffer调用asReadOnlyBuffer方法返回一个只读Buffer
 * 但不能将一个只读Buffer转换为读写Buffer
 * @author yangfan
 * @date 2017/08/15
 */
public class NioTest7 {
    public static void main(String[] args) {
        ByteBuffer buffer = ByteBuffer.allocate(10);

        //class java.nio.HeapByteBuffer
        System.out.println(buffer.getClass());

        for (int i = 0; i < buffer.capacity(); i++) {
            buffer.put((byte) i);
        }

        ByteBuffer readOnlyBuffer = buffer.asReadOnlyBuffer();

        //class java.nio.HeapByteBufferR
        System.out.println(readOnlyBuffer.getClass());

        readOnlyBuffer.position(0);
        // ReadOnlyBufferException
        readOnlyBuffer.put((byte) 2);

    }
}
```