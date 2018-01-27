---
title: Netty-介绍和入门例子
date: 2017-05-07 16:32:17
tags: [Netty,java]
categories: Netty
---

# Netty

## 简介

http://netty.io


Netty is an asynchronous event-driven network application framework 
for rapid development of maintainable high performance protocol servers & clients.

本系列源码在
https://github.com/sail-y/netty

## Netty能做什么？

1. 可以像tomcat一样做一个http服务器。
2. socket开发。
3. 支持长连接开发，例如websocket。

<!--more-->

## 例子1: Http

先忘记以前学过的servlet框架，netty并没有实现servlet的规范。

不多说，我们用netty先来写第一个例子，先跑起来试试看，后面再细说。

```java
package com.sail.netty.firstexample;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;

/**
 * @author yangfan
 * @date 2017/05/20
 */
public class TestServer {
    public static void main(String[] args) throws Exception {


        // 分发任务
        EventLoopGroup bossGroup = new NioEventLoopGroup();
        // 实际处理的
        EventLoopGroup workerGroup = new NioEventLoopGroup();
        try {
            // 启动服务
            ServerBootstrap serverBootstrap = new ServerBootstrap();
            serverBootstrap.group(bossGroup, workerGroup).channel(NioServerSocketChannel.class)
                    .childHandler(new TestServerInitializer());

            ChannelFuture channelFuture = serverBootstrap.bind(8899).sync();
            channelFuture.channel().closeFuture().sync();

        } finally {
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }

    }
}

```


```java
package com.sail.netty.firstexample;

import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.codec.http.HttpServerCodec;


/**
 * @author yangfan
 * @date 2017/05/20
 */
public class TestServerInitializer extends ChannelInitializer<SocketChannel> {

    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        pipeline.addLast("httpServerCodec", new HttpServerCodec());
        pipeline.addLast("testHttpServerHandler", new TestHttpServerHandler());

    }
}
```

```java
package com.sail.netty.firstexample;

import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.*;
import io.netty.util.CharsetUtil;

/**
 * @author yangfan
 * @date 2017/05/20
 */
public class TestHttpServerHandler extends SimpleChannelInboundHandler<HttpObject>{


    @Override
    protected void channelRead0(ChannelHandlerContext ctx, HttpObject msg) throws Exception {
        ByteBuf content = Unpooled.copiedBuffer("Hello World", CharsetUtil.UTF_8);
        FullHttpResponse response = new DefaultFullHttpResponse(HttpVersion.HTTP_1_1, HttpResponseStatus.OK, content);
        response.headers().set(HttpHeaderNames.CONTENT_TYPE, "text/plain");
        response.headers().set(HttpHeaderNames.CONTENT_LENGTH, content.readableBytes());

        ctx.writeAndFlush(response);
    }
}
```

虽然看起来复杂，但是几乎所有的netty程序的代码流程都是这样的。
定义好boss和worker的group->在childHandler定义ServerInitializer->在initChannel中定义通道处理器->实现通道处理器相应的回调方法。


注意loop group是死循环，必须手动停止，接下来我们来测试。

运行TestServer.

命令行测试

```bash
curl localhost:8899
```

![](http://7xs4nh.com1.z0.glb.clouddn.com/%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202017-05-20%20%E4%B8%8B%E5%8D%889.35.25.png)

接着我们看一下netty处理器的生命周期，改一下`TestHttpServerHandler`的代码。

```java
package com.sail.netty.firstexample;

import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.*;
import io.netty.util.CharsetUtil;

import java.net.URI;

/**
 * @author yangfan
 * @date 2017/05/20
 */
public class TestHttpServerHandler extends SimpleChannelInboundHandler<HttpObject> {


    @Override
    protected void channelRead0(ChannelHandlerContext ctx, HttpObject msg) throws Exception {

        if (msg instanceof HttpRequest) {


            HttpRequest httpRequest = (HttpRequest) msg;

            System.out.println("请求方法名：" + httpRequest.method().name());
            URI uri = new URI(httpRequest.uri());
            if ("/favicon.ico".equals(uri.getPath())) {
                System.out.println("请求favicon.ico");
                return;
            }


            ByteBuf content = Unpooled.copiedBuffer("Hello World", CharsetUtil.UTF_8);
            FullHttpResponse response = new DefaultFullHttpResponse(HttpVersion.HTTP_1_1, HttpResponseStatus.OK, content);
            response.headers().set(HttpHeaderNames.CONTENT_TYPE, "text/plain");
            response.headers().set(HttpHeaderNames.CONTENT_LENGTH, content.readableBytes());

            ctx.writeAndFlush(response);
        }

    }

    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        System.out.println("channelActive");
        super.channelActive(ctx);
    }

    @Override
    public void channelRegistered(ChannelHandlerContext ctx) throws Exception {
        System.out.println("channelRegistered");
        super.channelRegistered(ctx);
    }

    @Override
    public void handlerAdded(ChannelHandlerContext ctx) throws Exception {
        System.out.println("handlerAdded");
        super.handlerAdded(ctx);
    }

    @Override
    public void channelInactive(ChannelHandlerContext ctx) throws Exception {
        System.out.println("channelInactive");
        super.channelInactive(ctx);
    }

    @Override
    public void channelUnregistered(ChannelHandlerContext ctx) throws Exception {
        System.out.println("channelUnregistered");
        super.channelUnregistered(ctx);
    }
}

```

这个代码用`curl`和浏览器访问得到的结果是不一样的，因为netty没有遵循servlet的规范，所以有些地方我们得自己处理。

这是`curl`工具的输出：
![](http://7xs4nh.com1.z0.glb.clouddn.com/%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202017-05-20%20%E4%B8%8B%E5%8D%8810.00.07.png)


这是浏览器第一次访问的输出：
![](http://7xs4nh.com1.z0.glb.clouddn.com/%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202017-05-20%20%E4%B8%8B%E5%8D%8810.04.29.png)

这是浏览器第二次访问的输出：
![](http://7xs4nh.com1.z0.glb.clouddn.com/%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202017-05-20%20%E4%B8%8B%E5%8D%8810.06.08.png)

那是因为`curl`每次请求完之后就断了。而在http1.1协议下，浏览器有一个keep-alive功能来决定服务端收到请求什么时候关闭这个连接。所以我在多等了一会后，服务器还是自动关闭了连接，控制台还是输出了`channelInactive`和`channelUnregistered`


## 例子2: Socket

代码演示

### server

先写server端代码

`MyServer.java`


```java
package com.sail.netty.secondexample;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;

/**
 * 和第一个例子并没有太大的区别
 * @author yangfan
 * @date 2017/05/22
 */
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

`MyServerHandler.java`

```java
package com.sail.netty.secondexample;

import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;

import java.util.UUID;

/**
 * @author yangfan
 * @date 2017/05/22
 */
public class MyServerHandler extends SimpleChannelInboundHandler<String>{

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, String msg) throws Exception {
        System.out.println(ctx.channel().remoteAddress() + ", " + msg);
        ctx.channel().writeAndFlush("from server: " + UUID.randomUUID());
    }

    /**
     * 如果出现异常，关闭连接
     */
    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        cause.printStackTrace();
        ctx.close();
    }

}

```

`MyServerInitializer .java`

```java
package com.sail.netty.secondexample;

import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.codec.LengthFieldBasedFrameDecoder;
import io.netty.handler.codec.LengthFieldPrepender;
import io.netty.handler.codec.string.StringDecoder;
import io.netty.handler.codec.string.StringEncoder;
import io.netty.util.CharsetUtil;


/**
 *
 * @author yangfan
 * @date 2017/05/22
 */
public class MyServerInitializer extends ChannelInitializer<SocketChannel> {

    /**
     * 针对socket开发，我们处理的方式发生了一些变化
     */
    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        pipeline.addLast(new LengthFieldBasedFrameDecoder(Integer.MAX_VALUE, 0,4,0,4));
        pipeline.addLast(new LengthFieldPrepender(4));
        pipeline.addLast(new StringDecoder(CharsetUtil.UTF_8));
        pipeline.addLast(new StringEncoder(CharsetUtil.UTF_8));
        // 最后添加我们自己的处理器
        pipeline.addLast(new MyServerHandler());
    }
}

```

## client

客户端代码

`MyClient.java`

```java
package com.sail.netty.secondexample;

import io.netty.bootstrap.Bootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioSocketChannel;

/**
 * @author yangfan
 * @date 2017/05/22
 */
public class MyClient {
    public static void main(String[] args) throws InterruptedException {
        // 客户端只需要一个EventLoopGroup
        EventLoopGroup eventLoopGroup = new NioEventLoopGroup();

        try {
            Bootstrap bootstrap = new Bootstrap();
            bootstrap.group(eventLoopGroup).channel(NioSocketChannel.class).handler(new MyClientInitializer());

            ChannelFuture channelFuture = bootstrap.connect("localhost", 8899).sync();
            channelFuture.channel().closeFuture().sync();
        }finally {
            eventLoopGroup.shutdownGracefully();
        }
    }
}

```

`MyClientHandler `

```java
package com.sail.netty.secondexample;

import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.util.concurrent.EventExecutorGroup;

import java.time.LocalDateTime;

/**
 * @author yangfan
 * @date 2017/05/22
 */
public class MyClientHandler extends SimpleChannelInboundHandler<String> {

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, String msg) throws Exception {
        System.out.println(ctx.channel().remoteAddress());
        System.out.println("client output: " + msg);
        ctx.writeAndFlush("from clinet: " + LocalDateTime.now());
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        cause.printStackTrace();
        ctx.close();
    }

    /**
     * 如果不重写这个方法，运行程序后并不会触发数据的传输，因为双方都在等待read，所以要先发送一次消息。
     */
    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        ctx.channel().writeAndFlush("1");
    }
}

```

`MyClientInitializer.java`


```java
package com.sail.netty.secondexample;

import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.codec.LengthFieldBasedFrameDecoder;
import io.netty.handler.codec.LengthFieldPrepender;
import io.netty.handler.codec.string.StringDecoder;
import io.netty.handler.codec.string.StringEncoder;
import io.netty.util.CharsetUtil;


/**
 * @author yangfan
 * @date 2017/05/22
 */
public class MyClientInitializer extends ChannelInitializer<SocketChannel> {

    /**
     * 除了最后一行，跟服务端代码是一样的
     * @param ch
     * @throws Exception
     */
    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        pipeline.addLast(new LengthFieldBasedFrameDecoder(Integer.MAX_VALUE, 0,4,0,4));
        pipeline.addLast(new LengthFieldPrepender(4));
        pipeline.addLast(new StringDecoder(CharsetUtil.UTF_8));
        pipeline.addLast(new StringEncoder(CharsetUtil.UTF_8));
        // 最后添加我们自己的处理器
        pipeline.addLast(new MyClientHandler());
    }
}

```

## 例子3：聊天

下面做一个简单的消息广播，服务端1个，客户端3个，每个客户端上线的时候，服务端就对每个客户端广播上线的消息，下线同理。客户端发送消息的时候，服务端也会对每一个客户端进行广播。

`MyChatServer.java`

```java
package com.sail.netty.thirdexample;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;

public class MyChatServer {
    public static void main(String[] args) throws InterruptedException {
        EventLoopGroup bossGroup = new NioEventLoopGroup();
        EventLoopGroup workerGroup = new NioEventLoopGroup();

        try {
            ServerBootstrap serverBootstrap = new ServerBootstrap();
            serverBootstrap.group(bossGroup, workerGroup).channel(NioServerSocketChannel.class)
                    .childHandler(new MyChatServerInitializer());

            ChannelFuture channelFuture = serverBootstrap.bind(8899).sync();
            channelFuture.channel().closeFuture().sync();
        } finally {
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
    }
}

```

`MyChatServerHandler.java`

```java
package com.sail.netty.thirdexample;

import io.netty.channel.Channel;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.channel.group.ChannelGroup;
import io.netty.channel.group.DefaultChannelGroup;
import io.netty.util.concurrent.GlobalEventExecutor;

public class MyChatServerHandler extends SimpleChannelInboundHandler<String> {

    private static ChannelGroup channelGroup = new DefaultChannelGroup(GlobalEventExecutor.INSTANCE);

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, String msg) throws Exception {
        Channel channel = ctx.channel();

        channelGroup.forEach(ch -> {
            if (channel != ch) {
                ch.writeAndFlush(channel.remoteAddress() + " 发送的消息：" + msg + "\n");
            } else {
                ch.writeAndFlush("【自己】 " + msg + "\n");
            }
        });
    }

    /**
     * 如果出现异常，关闭连接
     */
    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        cause.printStackTrace();
        ctx.close();
    }


    /**
     * 每一个客户端连接的时候，就保存它。
     */
    @Override
    public void handlerAdded(ChannelHandlerContext ctx) throws Exception {
        Channel channel = ctx.channel();

        // 在添加之前做一个广播
        channelGroup.writeAndFlush("【服务器】 - " + channel.remoteAddress() + " 加入\n");

        channelGroup.add(channel);
    }

    @Override
    public void handlerRemoved(ChannelHandlerContext ctx) throws Exception {
        Channel channel = ctx.channel();

        // 在移除之前做一个广播
        channelGroup.writeAndFlush("【服务器】 - " + channel.remoteAddress() + " 离开\n");


        // 这个代码在handlerRemoved的时候会自动的从group中移除，所以我们不用写。
        // channelGroup.remove(channel);

    }

    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        Channel channel = ctx.channel();
        System.out.println(channel.remoteAddress() + " 上线");
    }

    @Override
    public void channelInactive(ChannelHandlerContext ctx) throws Exception {
        Channel channel = ctx.channel();
        System.out.println(channel.remoteAddress() + " 下线");
    }
}

```

`MyChatServerInitializer.java`

```java
package com.sail.netty.thirdexample;

import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.codec.DelimiterBasedFrameDecoder;
import io.netty.handler.codec.Delimiters;
import io.netty.handler.codec.string.StringDecoder;
import io.netty.handler.codec.string.StringEncoder;
import io.netty.util.CharsetUtil;

public class MyChatServerInitializer extends ChannelInitializer<SocketChannel> {


    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        pipeline.addLast(new DelimiterBasedFrameDecoder(4096, Delimiters.lineDelimiter()));
        pipeline.addLast(new StringDecoder(CharsetUtil.UTF_8));
        pipeline.addLast(new StringEncoder(CharsetUtil.UTF_8));
        pipeline.addLast(new MyChatServerHandler());
    }
}

```

`MyChatClient.java`

```java
package com.sail.netty.thirdexample;

import com.sail.netty.secondexample.MyClientInitializer;
import io.netty.bootstrap.Bootstrap;
import io.netty.channel.Channel;
import io.netty.channel.ChannelFuture;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioSocketChannel;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

/**
 * @author yangfan
 * @date 2017/05/22
 */
public class MyChatClient {
    public static void main(String[] args) throws Exception {
        // 客户端只需要一个EventLoopGroup
        EventLoopGroup eventLoopGroup = new NioEventLoopGroup();

        try {
            Bootstrap bootstrap = new Bootstrap();
            bootstrap.group(eventLoopGroup).channel(NioSocketChannel.class).handler(new MyChatClientInitializer());

            Channel channel = bootstrap.connect("localhost", 8899).sync().channel();
            // channel.closeFuture().sync();

            // 写一个死循环不断的去读取用户在控制台的输入

            BufferedReader br = new BufferedReader(new InputStreamReader(System.in));

            for (;;) {
                channel.writeAndFlush(br.readLine() + "\r\n");
            }




        }finally {
            eventLoopGroup.shutdownGracefully();
        }
    }
}

```

`MyChatClientHandler.java`

```java
package com.sail.netty.thirdexample;

import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.util.concurrent.EventExecutorGroup;

/**
 * @author yangfan
 * @date 2017/05/22
 */
public class MyChatClientHandler extends SimpleChannelInboundHandler<String> {

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, String msg) throws Exception {
        System.out.println(msg);
    }
}

```

`MyChatClientInitializer.java `

```java
package com.sail.netty.thirdexample;

import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.codec.DelimiterBasedFrameDecoder;
import io.netty.handler.codec.Delimiters;
import io.netty.handler.codec.string.StringDecoder;
import io.netty.handler.codec.string.StringEncoder;
import io.netty.util.CharsetUtil;


/**
 * @author yangfan
 * @date 2017/05/22
 */
public class MyChatClientInitializer extends ChannelInitializer<SocketChannel> {
    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        pipeline.addLast(new DelimiterBasedFrameDecoder(4096, Delimiters.lineDelimiter()));
        pipeline.addLast(new StringDecoder(CharsetUtil.UTF_8));
        pipeline.addLast(new StringEncoder(CharsetUtil.UTF_8));
        pipeline.addLast(new MyChatClientHandler());
    }
}

```

## 例子4：heartbeat（心跳）

下面演示一个集群中常见的心跳用netty的实现方式。

`MyServer.java`

```java
package com.sail.netty.forthexample;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.logging.LogLevel;
import io.netty.handler.logging.LoggingHandler;

/**
 * 心跳检测的Netty实现
 * @author yangfan
 * @date 2017/05/22
 */
public class MyServer {
    public static void main(String[] args) throws Exception {
        EventLoopGroup bossGroup = new NioEventLoopGroup();
        EventLoopGroup workerGroup = new NioEventLoopGroup();

        try {
            ServerBootstrap serverBootstrap = new ServerBootstrap();
            serverBootstrap.group(bossGroup, workerGroup).channel(NioServerSocketChannel.class)
                    // handler是针对于bossGroup的
                    .handler(new LoggingHandler(LogLevel.INFO))
                    // childHandler是针对于workerGroup的
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

`MyServerHandler.java`

```java
package com.sail.netty.forthexample;

import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.handler.timeout.IdleStateEvent;

/**
 * @author yangfan
 * @date 2017/05/22
 */
public class MyServerHandler extends ChannelInboundHandlerAdapter {

    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
        if (evt instanceof IdleStateEvent) {
            IdleStateEvent event = (IdleStateEvent) evt;
            String eventType = null;

            switch (event.state()) {

                case READER_IDLE:
                    eventType = "读空闲";
                    break;
                case WRITER_IDLE:
                    eventType = "写空闲";
                    break;
                case ALL_IDLE:
                    eventType = "读写空闲";
                    break;
            }

            System.out.println(ctx.channel().remoteAddress() + " 超时事件： " + eventType);

            ctx.channel().close();
        }
    }
}

```

`MyServerInitializer.java`


```java
package com.sail.netty.forthexample;

import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.timeout.IdleStateHandler;

import java.util.concurrent.TimeUnit;

/**
 * @author yangfan
 * @date 2017/05/22
 */
public class MyServerInitializer extends ChannelInitializer<SocketChannel> {

    /**
     * IdleStateHandler可以检测连接的3种状态
     */
    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();

        pipeline.addLast(new IdleStateHandler(5, 7, 3, TimeUnit.SECONDS));
        pipeline.addLast(new MyServerHandler());

    }
}

```
