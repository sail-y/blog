---
title: Netty-源码分析
date: 2017-09-13 09:55:11
tags: [Netty,java]
categories: Netty
---


# Netty源码分析

跟着代码的编写和运行流程来看看Netty的源码和原理，这里面包含了大量NIO的知识，所以我们要对NIO的基础知识要有掌握，不然看Netty的源码是很难受的。

```java
public class MyServer {
    public static void main(String[] args) throws InterruptedException {
        EventLoopGroup bossGroup = new NioEventLoopGroup();
        EventLoopGroup workerGroup = new NioEventLoopGroup();

        try {
            ServerBootstrap serverBootstrap = new ServerBootstrap();
            serverBootstrap.group(bossGroup, workerGroup).channel(NioServerSocketChannel.class)
                    .childHandler(new MyServerInitializer());

            ChannelFuture channelFuture = serverBootstrap.bind(8899).sync();
            channelFuture.channel().closeFuture().sync();
        } finally {
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
    }
}
```
<!--more-->
## NioEventLoopGroup

还记得我们编写Netty服务端的时候，第一行代码就是`EventLoopGroup bossGroup = new NioEventLoopGroup();`，bossGroup是作为转发、分发任务的，而workerGroup才是真正执行任务的。

EventLoopGroup底层是一个死循环，它会不停的去侦测输入输出的事件进行处理，处理完成后进行任务的执行。

EventLoopGroup有一个参数，表示线程数量，找到如果不传的话，在`MultithreadEventLoopGroup`里有设置它的默认值是`Math.max(1, SystemPropertyUtil.getInt(
                "io.netty.eventLoopThreads", NettyRuntime.availableProcessors() * 2));`的计算结果，像bossGroup一般都会设置成1，因为分配任务的group，只需要一个线程就足以。
                
最后创建线程的代码在`MultithreadEventExecutorGroup`的构造方法里面。
`children[i] = newChild(executor, args);`

所以NioEventLoopGroup在初始化的时候就只是赋值和初始化属性，什么操作也没有做。

## ServerBootstrap

Bootstrap sub-class which allows easy bootstrap of ServerChannel。
意思就是ServerBootstrap就是用来启动ServerChannel的一个类。

### group()

接下来看ServerBootstrap.group()方法，先把父类AbstractBootstrap的group属性设置了，然后再设置自己的childGroup属性。

```java
public ServerBootstrap group(EventLoopGroup parentGroup, EventLoopGroup childGroup) {
    super.group(parentGroup);
    if (childGroup == null) {
        throw new NullPointerException("childGroup");
    }
    if (this.childGroup != null) {
        throw new IllegalStateException("childGroup set already");
    }
    this.childGroup = childGroup;
    return this;
}
```

### channel()

用于通过Class对象创建一个channel对象，源码是通过**ReflectiveChannelFactory**的反射代码调用无参构造方法创建的对象。		
实际上是设置了一个channelFactory属性，只有在调用bind()方法的时候才会真正创建对象。


### NioServerSocketChannel

ServerSocketChannel implementation which uses NIO selector based implementation to accept new connections.

ServerSocketChannel的实现，使用了基于NIO selector的实现接受连接。

这个就是说NIO使用Selector基于事件的连接是一样的。

### childHandler()

服务于用channel的请求，实现为赋值到childHandler的属性中。

### bind()

创建了一个新的channel，并且绑定到上面。

最后调用到doBind方法，在netty中，do开头的基本都是私有方法。

`final ChannelFuture regFuture = initAndRegister();`

在initAndRegister()里就调用了`channelFactory.newChannel()`（*ReflectiveChannelFactory*）来创建Channel对象。

```java
@Override
public T newChannel() {
    try {
        return clazz.getConstructor().newInstance();
    } catch (Throwable t) {
        throw new ChannelException("Unable to create Channel from class " + clazz, t);
    }
}
```

那么我们传入的是**NioServerSocketChannel**,构造方法就调用到了`provider.openServerSocketChannel();`，这个就是Java NIO的代码了。

```java
 public NioServerSocketChannel() {
    this(newSocket(DEFAULT_SELECTOR_PROVIDER));
}
```

newSocket方法还提到了在github上的一个问题https://github.com/netty/netty/issues/2308。这里就出现了Netty调用了NIO的方法，像SelectionKey注册了OP_ACCEPT事件，表示可以接受连接了。并且在父类中调用了`ch.configureBlocking(false);`设置为非阻塞。**AbstractNioChannel**也包含了一个**SelectableChannel**的引用，这个其实就是对NIO的Channel的一个包装就提现出来了。


```java
public NioServerSocketChannel(ServerSocketChannel channel) {
    super(null, channel, SelectionKey.OP_ACCEPT);
    config = new NioServerSocketChannelConfig(this, javaChannel().socket());
}
```


在获得Channel对象后，马上调用了init方法进行初始化。

```java
channel = channelFactory.newChannel();
init(channel);
```

init方法本身也是做了很多事情，其中有一些option和attr的设置，还有就是他自己本身也加了一个

```java
p.addLast(new ChannelInitializer<Channel>() {
    @Override
    public void initChannel(final Channel ch) throws Exception {
        final ChannelPipeline pipeline = ch.pipeline();
        ChannelHandler handler = config.handler();
        if (handler != null) {
            pipeline.addLast(handler);
        }

        ch.eventLoop().execute(new Runnable() {
            @Override
            public void run() {
                pipeline.addLast(new ServerBootstrapAcceptor(
                        ch, currentChildGroup, currentChildHandler, currentChildOptions, currentChildAttrs));
            }
        });
    }
});
```

这个有没有眼熟，我们自己写的childHanlder()注册的不就是**ChannelInitializer**的子类吗。还有`ChannelHandler handler = config.handler();`实际上就是serverBootstrap.handler()注册的类，是提供给bossGroup使用的，在这里被添加到ChannelPipeline的末端。



bind(8899)返回了一个ChannelFuture，ChannelFuture最终是继承了`java.util.concurrent.Future`，返回Future的都是异步方法，结果只能通过get()方法获取，get()方法是阻塞的，会阻塞直到异步方法运行完成返回结果。

netty自己写了一个Future，并加了几个方法来区别JDK只有isDone的不足，在JDK中，异步任务完成、取消、异常，isDone方法都会返回true，而netty为了更加细化这个状态，做了如下处理。

```
 *                                      +---------------------------+
 *                                      | Completed successfully    |
 *                                      +---------------------------+
 *                                 +---->      isDone() = true      |
 * +--------------------------+    |    |   isSuccess() = true      |
 * |        Uncompleted       |    |    +===========================+
 * +--------------------------+    |    | Completed with failure    |
 * |      isDone() = false    |    |    +---------------------------+
 * |   isSuccess() = false    |----+---->      isDone() = true      |
 * | isCancelled() = false    |    |    |       cause() = non-null  |
 * |       cause() = null     |    |    +===========================+
 * +--------------------------+    |    | Completed by cancellation |
 *                                 |    +---------------------------+
 *                                 +---->      isDone() = true      |
 *                                      | isCancelled() = true      |
 *                                      +---------------------------+
```
 
 
除了状态的处理，还添加了`addListener`方法，这个方法会在任务运行完成的时候通知并回调，所以用户能更加准确的判断何时调用get()方法。
 
 
Netty建议我们使用addListener，而不要使用await()，因为addListener是非阻塞的，await()会阻塞直到I/O完成。不要在**ChannelHanlder**中调用await()方法，因为**ChannelHanlder**的方法通常是被事件处理器调用的，如果await()被I/O操作线程的事件处理器调用，那么I/O操作就会一直阻塞造成死锁。比如在channelRead()中调用await()方法，等待I/O操作完成，而I/O操作又在等待channelRead()完成，就成了死锁，这种情况应该调用:

```java
future.addListener(new  ChannelFutureListener() {
  public void operationComplete(ChannelFuture future) {
      // Perform post-closure operation
      // ...
  }
});
```

## Reactor模式

反应器模式，Netty整体架构是Reactor模式的完整体现。

