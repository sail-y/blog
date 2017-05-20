---
title: Netty-介绍
date: 2017-05-07 16:32:17
tags: [Netty,java]
categories: Netty
---

http://netty.io

Netty is an asynchronous event-driven network application framework 
for rapid development of maintainable high performance protocol servers & clients.

本系列源码在
https://github.com/sail-y/netty


先忘记以前学过的servlet和spring等http服务框架。

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