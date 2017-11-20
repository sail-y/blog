---
title: Netty-源码分析(二)
date: 2017-09-22 20:12:18
tags: [Netty,java]
categories: Netty
---

# 源码分析(二)

在理解了Reactor模式后，因为Netty框架本身就是基于Reactor模式的一种实现，所以回过头来再看源码，才能更好的理解代码中一些类的角色和意义。

ServerBootStrap在调用bind()方法后，通过**channelFactory**反射的方式创建了我们指定的Channel（***NioServerSocketChannel.class***）对象，然后调用了init(channel)方法对channel进行了初始化设置。

看一下**ServerBootStrap.init()**，初始化Channel的代码，`ChannelPipeline p = channel.pipeline();`这里面就出现了一个Netty中一个又一个非常核心的类**ChannelPipeline**，它是在**Channel**的父类**AbstractChannel**初始化的时候创建的。

## ChannelPipeline

**ChannelPipeline**里面是一个一个的ChannelHandler，当客户端的请求到来或者出去的的时候，会一个一个的通过这些处理器，就像一个过滤器一样。每一个**Channel**都拥有自己的**ChannelPipeline**，当一个**Channel**被创建的时候，**ChannelPipeline**也跟着被创建了。I/O事件只能被ChannelInboundHandler和ChannelOutboundHandler其中之一所处理，处理完成后再传递到别的处理器中（ChannelHandlerContext#fireChannelRead(Object)或者ChannelHandlerContext#write(Object)）。

<!--more-->

```text
 *                                                 I/O Request
 *                                            via {@link Channel} or
 *                                        {@link ChannelHandlerContext}
 *                                                      |
 *  +---------------------------------------------------+---------------+
 *  |                           ChannelPipeline         |               |
 *  |                                                  \|/              |
 *  |    +---------------------+            +-----------+----------+    |
 *  |    | Inbound Handler  N  |            | Outbound Handler  1  |    |
 *  |    +----------+----------+            +-----------+----------+    |
 *  |              /|\                                  |               |
 *  |               |                                  \|/              |
 *  |    +----------+----------+            +-----------+----------+    |
 *  |    | Inbound Handler N-1 |            | Outbound Handler  2  |    |
 *  |    +----------+----------+            +-----------+----------+    |
 *  |              /|\                                  .               |
 *  |               .                                   .               |
 *  | ChannelHandlerContext.fireIN_EVT() ChannelHandlerContext.OUT_EVT()|
 *  |        [ method call]                       [method call]         |
 *  |               .                                   .               |
 *  |               .                                  \|/              |
 *  |    +----------+----------+            +-----------+----------+    |
 *  |    | Inbound Handler  2  |            | Outbound Handler M-1 |    |
 *  |    +----------+----------+            +-----------+----------+    |
 *  |              /|\                                  |               |
 *  |               |                                  \|/              |
 *  |    +----------+----------+            +-----------+----------+    |
 *  |    | Inbound Handler  1  |            | Outbound Handler  M  |    |
 *  |    +----------+----------+            +-----------+----------+    |
 *  |              /|\                                  |               |
 *  +---------------+-----------------------------------+---------------+
 *                  |                                  \|/
 *  +---------------+-----------------------------------+---------------+
 *  |               |                                   |               |
 *  |       [ Socket.read() ]                    [ Socket.write() ]     |
 *  |                                                                   |
 *  |  Netty Internal I/O Threads (Transport Implementation)            |
 *  +-------------------------------------------------------------------+
```

上面的流程图很清楚的描述了一个请求进和出两个方向是如何被Netty处理的。


## ChannelOption

提供协议相关的配置，比如TCP的一些配置，它是类型安全的，实现了**Constant**接口，通过**ConstantPool**维护。ChannelOption本身就是Key的信息，真正的值是在ConstantPool中。

## AttributeMap

![](http://img.blog.csdn.net/20160526102928345?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQv/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/Center)

AttributeMap接口只有一个attr()方法，接收一个AttributeKey类型的key，返回一个Attribute类型的value。AttributeMap这是是绑定在Channel或者ChannelHandlerContext上的一个附件，相当于依附在这两个对象上的寄生虫一样，相当于附件一样。

AttributeKey相当于Map中的key，AttributeMap相当于Map, Attribute相当于Map中的value，它的实现方式和**ChannelOption**是类似的，都是继承了**AbstractConstant**，包含了一个**ConstantPool**的属性。

在Netty4.0中，每一个ChannelHandlerContext都是ChannelHandler和ChannelPipeline之间连接的桥梁，每一个ChannelHandlerContext都

有属于自己的上下文，也就说每一个ChannelHandlerContext上如果有AttributeMap都是绑定上下文的，也就说如果A的ChannelHandlerContext中的AttributeMap，B的ChannelHandlerContext是无法读取到的

但是Channel上的AttributeMap就是大家共享的，每一个ChannelHandler都能获取到。

**不过在Netty4.1中，这个情况发生了改变，只有在Channel中维护了一个Map，ChannelHanlderContext也是用的Channel中的Map。他们的attr()方法是等价的。**

## ServerBootstrapAcceptor

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
继续看init()代码，上一篇文章也提到了Netty在pipeline里添加了一个处理器，将`ocnfig.handler`也就是代码中的`LoggingHandler`添加到了channelPipeline中(注意这个是通过handler()方法注册的，也就是提供给BossGroup使用的)。然后紧接着添加了一个**ServerBootstrapAcceptor**，在看完Reactor模式后，这个类是不是觉得很眼熟，它的角色也就是Reactor模式当中的**Acceptor**。

## ChannelHandler

  接受连接或创建他们只是你的应用程序的一部分，虽然这些任务很重要，但是一个网络应用程序往往是更复杂的，需要更多的代码编写，如处理传入和传出的数据。Netty提供了一个强大的处理这些事情的功能，允许用户自定义ChannelHandler的实现来处理数据。使得ChannelHandler更强大的是可以连接每个ChannelHandler来实现任务，这有助于代码的整洁和重用。但是处理数据只是ChannelHandler所做的事情之一，也可以压制I/O操作，例如写请求。所有这些都可以动态实现。
ChannelHandler就是入站(InBound)和出站(OutBound)处理器。

## ChannelInitializer

ChannelInitializer本身也是一个特殊的Inbound处理器，用来初始化channel。

## ChannelHandlerContext

每创建一个ChannelHandler，随之也会闯进一个ChannelHandlerContext。

ChannelPipeline里面真实存放的对象实际上是**ChannelHandlerContext**，ChannelHandlerContext里又维护了ChannelHannlder。所以ChannelHandlerContext实际上是ChannelPipeline和ChannelHandler的桥梁，它提供了api可以获取Channel对象，和与之关联的ChannelHandler对象、ChannelPipeline对象。




## Reactor模式在Netty中的体现

![](/img/netty/netty7-1.png)

通过这个图我们可以看到，客户端向BossGroup发起连接请求，BossGroup本身监听的是一个`OP_ACCEPT`事件（NioServerSocketChannel的构造方法中可以找到注册事件的代码），一旦`OP_ACCEPT`事件产生之后，`select()`方法就会返回**SelectionKey**的集合，那么**SelectionKey**本身也是包装了**SocketChannel**对象，就是与客户端真正建立连接的**SocketChannel**对象。对于Netty来说，会将**SocketChannel**包装成**NIOSocketChannel**，接着又将**NIOSocketChannel**注册到了**WorkerGroup**的**selector**中。**WorkerGroup**的**Selector**监听的是`OP_READ`，所以当数据发送过来的时候，就不再跟**BossGroup**打交道了，转而和**WorkerGroup**进行数据的传递。

下面这一段就是**channelFactory**通过反射创建**NioServerSocketChannel**对象的时候，注册了***OP_ACCEPT***事件，并进行一个包装。

```java
public NioServerSocketChannel(ServerSocketChannel channel) {
    super(null, channel, SelectionKey.OP_ACCEPT);
    config = new NioServerSocketChannelConfig(this, javaChannel().socket());
}
```

**NioServerSocketChannelConfig**代码跟进去看，实际上是调用的父类的构造方法：

```java
public DefaultChannelConfig(Channel channel) {
    this(channel, new AdaptiveRecvByteBufAllocator());
}
```

**AdaptiveRecvByteBufAllocator**是干什么用的呢？它会根据反馈自动调整Channel所关联的buffer的大小。它的规则是如果上次读取的时候填满了Buffer，那么就会增加，反之连续2次没有填充满，就会减少。

```java
static final int DEFAULT_MINIMUM = 64;
static final int DEFAULT_INITIAL = 1024;
static final int DEFAULT_MAXIMUM = 65536;
```

这3个变量也定义了默认的Buffer的最小值，初始值和最大值。

其中有一个**SIZE_TABLE**在静态代码块中定义了初始化大小变化的一个数组，通过getSizeTableIndex来引用数组里面的值，动态调整Buffer大小就取数组里面的值来调整。内部类**HandleImpl**（记录每次读取的大小来猜测下一次的大小--动态调整）的父类**MaxMessageHandle**里有一个很重要的方法**allocate()**，通过平台来判断是使用**directBuffer**还是**heapBuffer**：

```java
public ByteBuf ioBuffer(int initialCapacity) {
    if (PlatformDependent.hasUnsafe()) {
        return directBuffer(initialCapacity);
    }
    return heapBuffer(initialCapacity);
}
```

其中堆内Buffer是Netty用数组自己实现的，而DirectBuffer最终可以跟踪到**UnpooledUnsafeDirectByteBuf.allocateDirect()**，又发现我们很熟悉的NIO代码：

```java
protected ByteBuffer allocateDirect(int initialCapacity) {
    return ByteBuffer.allocateDirect(initialCapacity);
}
```

## Channel

Channel是针对于网络套接字的一个连接点，也可以认为它是一个可以执行I/O操作的组件。

它提供以下功能：

* 获取Channel当前的状态（open,connected)
* channel配置参数(buffer size)
* IO操作（read,write,connect,bind)
* 提供一个**ChannelPipline**，可以处理所有当前Channel关联的所有的I/O事件和请求。


## EventLoopGroup

1. 一个EventLoopGroup中会包含一个或多个EventLoop。
2. 一个EventLoop在它的整个生命周期当中都只会与唯一一个Thread进行绑定。
3. 所有由EventLoop所处理的各种I/O事件都将在它所关联的那个Thread上进行处理。
4. 一个Channel在它的整个生命周期中只会注册在一个EventLoop上。
5. 一个EventLoop在运行过程当中，会被分配给一个或者多个Channel。

重要结论：**在Netty中，Channel的实现一定是线程安全的；基于此，我们可以存储一个Channel的引用，并且在需要向远程端点发送数据时，通过这个引用来调用Channel相应的方法；即便当时有很多线程都在使用她也不会出现多线程问题；而且，消息一定会按照顺序发送出去。**

**我们在业务开发中，不要将长时间执行的耗时任务放入到EventLoop的执行队列中，因为它将会一直阻塞该线程所对应的所有Channel上的其他执行任务，如果我们需要进行阻塞调用或是耗时的操作（实际开发中很常见），那么我们就需要使用一个专门的EventExecutor（业务线程池）。**

通常会有两种实现方式：

1. 在ChannelHandler的回调方法中，使用自己定义的业务线程池，这样就可以实现异步调用。
2. 借助于Netty提供的向ChannelPipeline添加ChannelHandler时调用的addLast方法来传递EventExecutor。

说明：默认情况下（调用addLast(handler))，ChannelHandler中的回调方法都是由I/O线程所执行，如果调用了`ChannelPipeline addLast(EventExecutorGroup group, ChannelHandler... handlers)`方法，那么ChannelHandler中的回调方法就是由参数中的group线程组来执行的。

## JDK的Futuer和Netty的Futuer

JDK所提供的Future只能通过手工方式检查执行结果，而这个操作是会阻塞的；Netty则对ChannelFuture进行了增强，通过ChannelFutureListener以回调的方式来获取执行结果，去除了手工检查阻塞的操作；值得注意的是：ChannelFutureListener的operationComplete方法是由I/O线程执行的，因此要注意的是不要在这里执行耗时的操作，否则需要通过另外的线程或线程池来执行。


## ctx.write()和ctx.channel().write()的区别

在Netty中有两种发送消息的方式，可以直接写到Channel中，也可以写到与ChannelHandler所关联的那个ChannelHandlerContext中。对于前一种方式来说，消息会从ChannelPipeline的末尾开始流动；对于后一种方式来说，消息将从ChannelPipeline中的下一个ChannelHandler开始流动。

结论：

1. ChannelHandlerContext与ChannelHandler之间是关联绑定关系是永远都不会发生改变的，因此对其进行缓存是没有任何问题的。
2. 对于与Channel的同名方法来说，ChannelHandlerContext方法将会产生更短的事件流，所以我们应该在可能的情况下利用这个特性来提升应用性能。

