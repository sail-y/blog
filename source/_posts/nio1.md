---
title: Java NIO
date: 2017-08-12 16:18:08
tags: [java,io]
categories: io
---

# Java NIO 


>“对语言设计人员来说，创建好的输入／输出系统是一项特别困难的任务。”
――《Think in Java》


下面一起来研究一下NIO的用法，先来一段示例代码：


```java
public class NioTest1 {
    public static void main(String[] args) {
        IntBuffer buffer = IntBuffer.allocate(10);
        for (int i = 0; i < buffer.capacity(); i++) {
            int randomNumber = new SecureRandom().nextInt(20);
            buffer.put(randomNumber);
        }

        buffer.flip();

        while (buffer.hasRemaining()) {
            System.out.println(buffer.get());
        }
    }
}
```
<!--more-->
以上代码会输出10个随机数，输出很简单，但是包含的逻辑却很丰富。


java的io现在分为2种:

1. java.io
2. java.nio

java.io中最为核心的一个概念是流(Stream)，面向流的编程，里面也大量运用了装饰模式，在java.io中。**Java中一个流要么是输入流，要么是输出流，不可能同时既是输入流又是输出流。**java.nio中拥有3个核心概念：Selector，Channel与Buffer。在java.nio中，我们是面向块（block）或是缓冲区（buffer）编程的。Buffer本身就是块内存，底层实现上，它实际上是个数组。**数据的读、写都是通过Buffer来实现的。**

除了数组之外，Buffer还提供了对于数据的结构化访问方式，并且可以追踪到系统的读写过程。Java中的7种原生数据类型都有各自对应的Buffer类型，如IntBuffer，LongBuffer，ByteBuffer及CharBuffer等等，并没有BooleanBuffer类型。

`Channel`指的是可以向其写入数据或是从中读取数据的对象，它类似于java.io中的Stream。所有数据的读写都是通过Buffer来进行的，永远不会出现直接向Channel写入数据的情况，或是直接从Channel读取数据的情况。与Stream不同的是，Channel是双向的，一个流只可能是InputStream或是OutputStream，Channel打开后则可以进行读取、写入或是读写。由于Channel是双向的，因此它能更好的反映出底层操作系统的真实情况；在linux系统中，底层操作系统的通道就是双向的。


## 实例1


读取文件

**NioTest2.txt**

```text
hello world welcome
```

```java
public class NioTest2 {
    public static void main(String[] args) throws IOException {
        FileInputStream fileInputStream = new FileInputStream("NioTest2.txt");
        // 通过文件输入流可以获取到通道对象
        FileChannel fileChannel = fileInputStream.getChannel();

        // 无论读写都必须通过Buffer来操作
        ByteBuffer byteBuffer = ByteBuffer.allocate(512);
        fileChannel.read(byteBuffer);

        // 之前是往Buffer里面写，现在进行Buffer的读，所以要调用flip()方法
        byteBuffer.flip();

        while (byteBuffer.hasRemaining()) {
            byte b = byteBuffer.get();
            System.out.println("Character: " + (char) b);
        }

        fileInputStream.close();

    }
}
```

## 实例2

写入文件

```java
public class NioTest3 {
    public static void main(String[] args) throws Exception {

        FileOutputStream fileOutputStream = new FileOutputStream("NioTest3.txt");

        FileChannel fileChannel = fileOutputStream.getChannel();

        ByteBuffer byteBuffer = ByteBuffer.allocate(512);

        byte[] messages = "hello world welcome, nihao".getBytes();

        for (byte message : messages) {
            byteBuffer.put(message);
        }

        byteBuffer.flip();

        fileChannel.write(byteBuffer);
        
    }
}
```

上面2个例子，能看出一定的模式，就是数据一定是跟Buffer打交道的，然后再读或写到Channel中。

读： file->channel->buffer->filp()->打印内容
写： 数据->buffer->flip()->channel->输出到文件

## Buffer中的3个重要属性

看实例中都调用了一句关键代码`filp()`，这个方法的源码如下：

```java
public final Buffer flip() {
    limit = position;
    position = 0;
    mark = -1;
    return this;
}
```


关于NIO Buffer中的3个重要状态属性的含义：position，limit与capacity。

* Buffer的capacity是指它所包含的元素的数量，capacity不可能为负数，也不会变化。
* Buffer的limit是指第一个不能被读或者写的元素的索引，并且永远不会超过capacity。
* Buffer的position是说下一个将要被读或者写的索引，不能为负数，并且不会超过limit。

假设执行Buffer.allocate(6),下面看内存划分情况。

|   0  |   1  |  2 |     3   |4|  5 | 6 |
| :---: |---| ---| --- |---| ---| :---: |
| ↑|  |  | || | ↑ |
| position|  |  | || | capacity |
| |  |  | || | limit |

最后一个是虚拟的位置。


现在往Buffer中放入2个元素,记住position是下一个可以被读或者写的位置，所以应该是在索引为2的地方。


|   0  |   1  |  2 |     3   |4|  5 | 6 |
| :---: |:---:| :---:| --- |---| ---| :---: |
| |  | ↑ | || | ↑ |
| |  | position | || | capacity |
| |  |  | || | limit |

再放2个元素。

|   0  |   1  |  2 |     3   |4|  5 | 6 |
| :---: |:---:| :---:| :---: |:---:| :---:| :---: |
| |  | | | ↑ | | ↑ |
| |  | | | position | | capacity |
| |  |  | || | limit |

现在调用`flip()`，看看会发生什么事。

先把position归位,然后limit变为之前position的位置。


|   0  |   1  |  2 |     3   |4|  5 | 6 |
| :---: |:---:| :---:| :---: |:---:| :---:| :---: |
| ↑|  | | | ↑ | | ↑ |
| position |  | | | limit | | capacity |


而且position是不会大于limit的，所以`hasRemaining()`的实现其实也很简单，当
position和limit相等的时候，表示Buffer的东西已经被读取完毕。

```
public final boolean hasRemaining() {
    return position < limit;
}
```
    


## 实例3

```java

public class NioTest4 {
    public static void main(String[] args) throws IOException {
        FileInputStream inputStream = new FileInputStream("input.txt");
        FileOutputStream outputStream = new FileOutputStream("output.txt");

        FileChannel inputChannel = inputStream.getChannel();
        FileChannel outputChannel = outputStream.getChannel();

        ByteBuffer buffer = ByteBuffer.allocate(512);

        while (true) {
            // 如果删除这行代码，第一次运行后position和limit是相等的，那么这个时候是不能再写入数据的了，所以read会返回0，导致死循环不停的重复写入数据到文件中
            buffer.clear();

            // 先读取数据,返回值是每次读取的字节
            int read = inputChannel.read(buffer);
            System.out.println("read: " + read);

            // 第一次读取完成后，调用clear()将position设置为0，limit归位。
            // 那么这个时候返回的read应该是-1，因为Channel里面已经没有数据了
            if (-1 == read) {
                break;
            }

            // 翻转
            // position为0，limit为之前的position
            buffer.flip();

            // 写入数据
            outputChannel.write(buffer);
        }
        inputChannel.close();
        outputChannel.close();

    }
}
```


通过NIO读取文件涉及到3个步骤：

1. 从FileInputStream获取到FileChannel对象。
2. 创建Buffer。
3. 将数据从Channel读取到Buffer中。


## 绝对方法与相对方法

绝对方法与相对方法的含义：

1. 相对方法：limit值与position值会在操作时被考虑到。
2. 绝对方法：完全忽略掉limit值和position值。

