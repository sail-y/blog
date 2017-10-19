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

## AttributeKey

AttributeKey相当于Map中的key，AttributeMap相当于Map, Attribute相当于Map中的value，它的实现方式和**ChannelOption**是类似的，都是继承了**AbstractConstant**，包含了一个**ConstantPool**的属性。

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

* 获取Channel当前的状态（open,coinnected)
* channel配置参数(buffer size)
* IO操作（read,write,connect,bind)
* 提供一个**ChannelPipline**，可以处理所有当前Channel关联的所有的I/O事件和请求。

