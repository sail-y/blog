---
title: Java NIO Selector
date: 2017-08-23 20:33:17
tags: [java,io]
categories: io
---


参考：http://blog.csdn.net/lianjiww/article/details/53540145


# Selector

NIO的三大组件Channel、Buffer、Selector已经讲了2个了，接着我们一起探索一下Selector。

Selector（选择器）是Java NIO的一个组件，能够检测一到多个NIO通道，并能够知晓通道是否为诸如读写事件做好准备。这样，一个单独的线程可以管理多个channel，从而管理多个网络连接。仅用单个线程来处理多个Channels的好处是，只需要更少的线程来处理通道。对于操作系统来说，线程之间上下文切换的开销很大，而且每个线程都要占用系统的一些资源。因此，使用的线程越少越好。


## Selector的创建

通过调用Selector.open()方法创建一个Selector，例如：

```java
Selector selector = Selector.open();
```
<!--more-->
Selector里持有3个集合:

1. key set 注册在Selector的所有通道。
2. selected-key set 准备好进行操作的通道。
3. cancelled-key set 准备取消的通道。


## 注册通道

通过SelectableChannel.register()方法来注册，例如：

```java
channel.configureBlocking(false);
SelectionKey key = channel.register(selector, Selectionkey.OP_READ);
```

register()方法会返回一个SelectionKey 对象，这个对象代表了注册到该Selector的通道。 
与Selector一起使用时，Channel必须处于非阻塞模式下。这意味着不能将FileChannel与Selector一起使用，因为FileChannel不能切换到非阻塞模式。而套接字通道都可以。 
register()方法的第二个参数是一个“interest集合”，意思是在通过Selector监听Channel时对什么事件感兴趣。可以监听四种不同类型的事件，这四种事件用SelectionKey的四个常量来表示： 

1. Connect事件-SelectionKey.OP_CONNECT 
2. Accept事件-SelectionKey.OP_ACCEPT 
3. Read事件-SelectionKey.OP_READ 
4. Write事件-SelectionKey.OP_WRITE 

## SelectionKey

register()方法返回的是一个SelectionKey对象，它包含了以下属性：


### interest集合

interest集合是你所选择的感兴趣的事件集合。用“位与”操作interest 集合和给定的SelectionKey常量，可以确定某个给定的事件是否在interest 集合中，例如：

```java
int interestSet = selectionKey.interestOps();
boolean isInterestedInAccept  = (interestSet & SelectionKey.OP_ACCEPT) == SelectionKey.OP_ACCEPT;
```


### ready集合

ready集合是通道已经准备就绪的操作的集合。从SelectionKey访问ready集合：

```java
int readySet = selectionKey.readyOps();
```

可以用“位与”，来检测channel中什么事件或操作已经就绪，也可以使用以下四个方法，它们都会返回一个布尔类型：

```java
selectionKey.isAcceptable();
selectionKey.isConnectable();
selectionKey.isReadable();
selectionKey.isWritable();
```

### Channel

从SelectionKey访问Channel：

```java
Channel channel = selectionKey.channel();
```

### Selector

从SelectionKey访问Selector：

```json
Selector selector = selectionKey.selector();
```

### 附加的对象

可以将一个对象或者更多信息附加到SelectionKey上，这样就能方便的识别某个给定的通道。例如：

```java
selectionKey.attach(theObject);
Object attachedObj = selectionKey.attachment();
```

还可以在向Selector注册Channel的时候附加对象，例如：

```java
SelectionKey key = channel.register(selector, SelectionKey.OP_READ, theObject);
```

## 选择通道

向Selector注册了通道以后，可以用select()方法返回你所感兴趣的事件（如连接、接受、读或写）已经准备就绪的那些通道。select()方法有几个重载：

**int select()** 		
阻塞到至少有一个通道在你注册的事件上就绪了。 
	
**int select(long timeout)** 		
和select()一样，除了最长会阻塞timeout毫秒。 

**int selectNow()** 		
不会阻塞，不管什么通道就绪都立刻返回。如果自从前一次选择操作后，没有通道变成可选择的，则返回零。 

select()方法返回的int值表示自上次调用select()方法后有多少通道已经就绪。 
调用了select()方法，并且返回值表明有一个或更多个通道就绪了，然后可以调用selectedKeys()方法，访问就绪通道，例如：

```java
Set selectedKeys = selector.selectedKeys();
```

## 实战

```java
/**
 * @author yangfan
 * @date 2017/08/23
 */
public class NioTest12 {
    public static void main(String[] args) throws IOException {
        int[] ports = new int[5];

        ports[0] = 5000;
        ports[1] = 5001;
        ports[2] = 5002;
        ports[3] = 5003;
        ports[4] = 5004;

        Selector selector = Selector.open();

        for (int i = 0; i < ports.length; i++) {
            ServerSocketChannel serverSocketChannel = ServerSocketChannel.open();
            // 配置成非阻塞
            serverSocketChannel.configureBlocking(false);
            ServerSocket serverSocket = serverSocketChannel.socket();
            InetSocketAddress address = new InetSocketAddress(ports[i]);
            serverSocket.bind(address);

            // register()会触发一个SelectionKey被添加到Selector的keys中，可以用selector.keys()查看。
            serverSocketChannel.register(selector, SelectionKey.OP_ACCEPT);

            // System.out.println(selector.keys().size());


            System.out.println("监听端口： " + ports[i]);
        }


        while (true) {
            int numbers = selector.select();
            System.out.println("numbers: " + numbers);


            // 准备好的通道（有客户端连接了）
            Set<SelectionKey> selectionKeys = selector.selectedKeys();

            Iterator<SelectionKey> iter = selectionKeys.iterator();
            // 准备建立连接
            while (iter.hasNext()) {
                SelectionKey selectionKey = iter.next();
                if (selectionKey.isAcceptable()) {
                    ServerSocketChannel serverSocketChannel = (ServerSocketChannel) selectionKey.channel();
                    SocketChannel socketChannel = serverSocketChannel.accept();
                    socketChannel.configureBlocking(false);

                    socketChannel.register(selector, SelectionKey.OP_READ);

                    iter.remove();
                    System.out.println("获得客户端连接： " + socketChannel);
                } else if (selectionKey.isReadable()) {
                    // 接收数据
                    SocketChannel socketChannel = (SocketChannel) selectionKey.channel();

                    int bytesRead = 0;

                    while (true) {
                        ByteBuffer byteBuffer = ByteBuffer.allocate(512);
                        byteBuffer.clear();

                        int read = socketChannel.read(byteBuffer);

                        if (read <= 0) {
                            break;
                        }

                        byteBuffer.flip();

                        socketChannel.write(byteBuffer);

                        bytesRead += read;

                    }

                    System.out.println("读取： " + bytesRead + ", 来自于: " + socketChannel);
                    iter.remove();
                }

            }

        }
    }
}
```

上面的例子可以看出来，所有的操作都是主动或者被动的对SelectionKey的OP状态改变进行的操作，所以异步编程里面事件无处不在。
