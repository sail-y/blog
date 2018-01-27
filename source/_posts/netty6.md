---
title: Netty-源码分析(一)
date: 2017-09-13 09:55:11
tags: [Netty,java]
categories: Netty
---


# Netty源码分析

跟着代码的编写和运行流程来看看Netty的源码和原理，这里面包含了大量NIO的知识，所以我们要对NIO的基础知识要有掌握，不然看Netty的源码是很难受的。那么我们从哪里开始阅读源码呢，既然不知道从何下手，就从运行的例子一个一个往下看吧。


```java
public class MyServer {
    public static void main(String[] args) throws InterruptedException {
        EventLoopGroup bossGroup = new NioEventLoopGroup();
        EventLoopGroup workerGroup = new NioEventLoopGroup();

        try {
            ServerBootstrap serverBootstrap = new ServerBootstrap();
            serverBootstrap.group(bossGroup, workerGroup).channel(NioServerSocketChannel.class)
		            .handler(new LoggingHandler(LogLevel.WARN))
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

EventLoopGroup有一个参数，表示线程数量，如果不传的话，在`MultithreadEventLoopGroup`里有设置它的默认值是`Math.max(1, SystemPropertyUtil.getInt(
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

在这个方法里才真正创建了一个新的channel，并且绑定到上面。

![](/img/netty/netty6-7.png)

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

init方法本身也是做了很多事情，其中有一些option和attr的设置，还有就是Netty在这里也加了一个Handler。

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

这个有没有眼熟，我们自己写的childHanlder()注册的不就是**ChannelInitializer**的子类吗。还有`ChannelHandler handler = config.handler();`实际上就是serverBootstrap.handler()注册的自定义的Handler，是提供给bossGroup使用的，在这里被添加到ChannelPipeline的末端。



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


### Doug Lea

反应器模式，Netty整体架构是Reactor模式的完整体现。提到Reactor模式，就不得不拿出大神Doug Lea(Java并发包的作者)的文档：[《Scalable IO in Java》](http://gee.cs.oswego.edu/dl/cpjslides/nio.pdf)，内容不多，里面涉及到传统IO的写法，NIO的设计思想。这个文档非常重要，一定要熟读。

![](/img/netty/netty6-1.png)

大多数的网络服务都是下面的流程：

1. 读取请求
2. 对请求进行解码
3. 处理服务（业务逻辑）
4. 编码相应
5. 发送响应

![](/img/netty/netty6-2.png)

传统的网络服务设计方式如上图所示：客户端有多个，服务端每接受到一个请求就创建一个线程进行一系列的处理....

```java
class Server implements Runnable {
    public void run() {
        try {
            ServerSocket ss = new ServerSocket(PORT);
            while (!Thread.interrupted())
                new Thread(new Handler(ss.accept())).start();
            // or, single-threaded, or a thread pool
        } catch (IOException ex) { /* ... */ }
    }

    static class Handler implements Runnable {
        final Socket socket;

        Handler(Socket s) {
            socket = s;
        }

        public void run() {
            try {
                byte[] input = new byte[MAX_INPUT];
                socket.getInputStream().read(input);
                byte[] output = process(input);
                socket.getOutputStream().write(output);
            } catch (IOException ex) { /* ... */ }
        }

        private byte[] process(byte[] cmd) { /* ... */ }
    }
}
```

这种方式最大的问题就是线程太多了，如果线程持续上升，线程之间的切换非常耗费资源，服务器就支撑不了。



* Reactor通过分发恰当的处理器来响应IO事件（类似于AWT）
* handler是非阻塞的
* 通过将handler绑定到事件上来管理（类似于AWT的addActionListener）

![单线程版Reactor模式](/img/netty/netty6-3.png)

客户端保持不变，这里多了一个Reactor角色，它去检测客户端发起的请求和连接，将客户端的请求派发给特定的handler。

```java
class Reactor implements Runnable {
    final Selector selector;
    final ServerSocketChannel serverSocket;

    Reactor(int port) throws IOException {
        selector = Selector.open();
        serverSocket = ServerSocketChannel.open();
        serverSocket.socket().bind(
                new InetSocketAddress(port));
        serverSocket.configureBlocking(false);
        SelectionKey sk =
                serverSocket.register(selector,
                        SelectionKey.OP_ACCEPT);
        sk.attach(new Acceptor());
    }

    /*
    Alternatively, use explicit SPI provider: 
    SelectorProvider p = SelectorProvider.provider(); 
    selector = p.openSelector();
    serverSocket = p.openServerSocketChannel();
     */
    public void run() {  // normally in a new
        Thread
        try {
            while (!Thread.interrupted()) {
                selector.select();
                Set selected = selector.selectedKeys();
                Iterator it = selected.iterator();
                while (it.hasNext())
                    dispatch((SelectionKey) (it.next()); selected.clear();
            }
        } catch (IOException ex) { /* ... */ }
    }

    void dispatch(SelectionKey k) {
        Runnable r = (Runnable) (k.attachment());
        if (r != null)
        	r.run();
    }
    
    class Acceptor implements Runnable { // inner
        public void run() {
            try {
                SocketChannel c = serverSocket.accept();
                if (c != null)
                    new Handler(selector, c);
      catch(IOException ex){ /* ... */ }
            }
        }
    }
}
```

sk.attach(obj)可以放一个对象进去，在后面可以用attachment()取出来，这里放进去的是**Acceptor**。

Reactor本身是不做任何处理的，run()方法里事件发生的时候，调用了dispatch()方法，交由**Acceptor**来分发，Handler实现：

```java
final class Handler implements Runnable {
    final SocketChannel socket;
    final SelectionKey sk;
    ByteBuffer input = ByteBuffer.allocate(MAXIN);
    ByteBuffer output = ByteBuffer.allocate(MAXOUT);
    static final int READING = 0, SENDING = 1;
    int state = READING;

    Handler(Selector sel, SocketChannel c) throws IOException {
        socket = c;
        c.configureBlocking(false);
        // Optionally try first read now
        sk = socket.register(sel, 0);
        sk.attach(this);
        sk.interestOps(SelectionKey.OP_READ);
        sel.wakeup();
    }

    boolean inputIsComplete() { /* ... */ }

    boolean outputIsComplete() { /* ... */ }

    void process() { /* ... */ }

    public void run() {
        try {
            if (state == READING) read();
            else if (state == SENDING) send();
        } catch (IOException ex) { /* ... */ }
    }

    void read() throws IOException {
        socket.read(input);
        if (inputIsComplete()) {
            process();
            state = SENDING;
			  // Normally also do first write now 
			  sk.interestOps(SelectionKey.OP_WRITE);
        }
    }

    void send() throws IOException {
        socket.write(output);
        if (outputIsComplete()) sk.cancel();
    }
}
```

这个handler可以对应到Netty中Netty提供的handler或者我们自己写的handler。因为最早注册的是OP_ACCEPT，所以这个handler要注册OP_READ。其中`sel.wakeup();`的意思是如果之前有select()方法阻塞了，那么让select()方法立即返回，如果当前没有select()方法阻塞的话，那么下一次调用select()会立即返回。然后执行run()方法，是通过判断状态的方式来决定是写还是读 ，这个在Netty3中就是需要这样实现handler代码的，需要自己判断状态来决定业务逻辑。Netty4已经改成各种回调了，比如channelRead，channelActive等。


文档接着又描述了多线程版本的设计，增加多个Reactor线程，提高Reactor分发的速度，以及使用线程池来处理请求

![多线程版Reactor模式](/img/netty/netty6-4.png)

下图是多个Reactor的图示，这个图对应到Netty我们可以理解为mainReactor对应bossGroup，subReactor对应workerGroup。

![多个Reactor](/img/netty/netty6-5.png)

### reactor-siemens

**《reactor-siemens》**是发布于1995年的论文，。这个理论也现在也没有过时。

![Reactor](/img/netty/netty6-6.png)

这是论文里面的一张图，跟Doug Lea的图实际上是一个意思，虽然名字不一样，下面解释一下这个图里面的元素的意思。

Reactor模式一共有5种角色构成：

1. **Handle**（句柄或是描述符）：本质上表示一种资源，是由操作系统提供的；该资源用于表示一个个的事件，比如说文件描述符，针对网络编程中的Socket描述符。事件既可以来自于外部，也可以来自于内部；外部事件比如说客户端的连接请求，客户端发送过来的数据等；内部事件比如说操作系统产生的定时器事件等。它本质上就是一个文件描述符。Handle是事件产生的发源地。
2. **Synchronous Event Demultiplexer（**同步事件分离器）：它本身是一个系统调用，用于等待事件的发生（事件可能是一个，也可能是多个）。调用方在调用它的时候以后会被阻塞，一直阻塞到同步事件分离器上有事件产生为止。对于Linux来说，同步事件分离器指的就是常用的I/O多路复用的机制，比如说select，poll，epoll等。在Java NIO领域中，同步事件分离器对应的组件就是**Selector**；对应的阻塞方法就是select方法。
3. **Event Hanlder**（事件处理器）：本身由多个回调方法构成，这些回调方法构成了与应用相关的对于某个事件的反馈机制。Netty相比于Java NIO来说，在事件处理器这个角色上进行了一个升级，它为我们开发者提供了大量的回调方法，供我们在特定事件产生的时候实现相应的业务方法进行业务逻辑的处理。
4. **Contrete Event Handler**（具体事件处理器）：是事件处理器的实现。它本身实现了事件处理器所提供的各个回调方法，从而实现了特定于业务的逻辑。它本质上就是我们所编写的一个个的处理器实现。
5. **Initiation Dispatcher**（初始分发器）：它实际上就是Reactor角色。它本身定义了一些规范，这些规范用于控制事件的调度方式，同时又提供了应用进行事件处理器的注册、删除、等设施。它本身是整个时间处理器的核心所在，Initiation Dispatcher会通过同步事件分离器来等待时间的发生。一旦事件发生，Initiation Dispatcher首先会分离出每一个事件，然后调用事件处理器，最后调用相关的回调方法来处理这些事件。

-----

Reactor模式的流程：

1. 当应用向**Initiation Dispatcher**注册具体的事件处理器时，应用会标识出该事件处理器希望**Initiation Dispatcher**在某个事件发生时向其通知的该事件，该事件与Handle关联。
2. **Initiation Dispatcher**会要求每个事件处理器向其传递内部的Handle。该Handle向操作系统标识了事件处理器。
3. 当所有的事件处理器注册完毕后，应用汇调用handle_events方法来启动**Initiation Dispatcher**的事件循环。这时，**Initiation Dispatcher**会将每个注册的事件管理器的Handle合并起来，并使用同步事件分离器等待这些事件的发生。比如说，TCP协议层会使用select同步事件分离器操作来等待客户端发送的数据到达已经连接的socket handle上。
4. 当与某个事件源对应的Handle变为ready状态时（比如说，TCP socket变为等待读状态时），同步事件分离器就会通知**Initiation Dispatcher**。
5. **Initiation Dispatcher**会触发事件处理器的回调方法，从而相应这个处于ready状态的Handle。当事件发生时，**Initiation Dispatcher**会将事件源激活的Handle作为[key]来寻找并分发恰当的事件处理器回调方法。
6. **Initiation Dispatcher**会回调事件处理器的handle_events回调方法来执行特定于应用的功能（开发者自己所编写的功能），从而响应这个事件。所发生的事件类型可以作为该方法参数并被该方法内部使用来执行额外的特定于服务的分离与分发。


