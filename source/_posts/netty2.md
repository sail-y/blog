---
title: Netty-WebSocket介绍和使用
date: 2017-06-12 22:00:27
tags: [Netty,java]
categories: Netty
---

随着互联网的发展，传统的HTTP协议已经很难满足Web应用日益复杂的需求了。近年来，随着HTML5的诞生，WebSocket协议被提出，它实现了浏览器与服务器的全双工通信，扩展了浏览器与服务端的通信功能，使服务端也能主动向客户端发送数据。

　　我们知道，传统的HTTP协议是无状态的，每次请求（request）都要由客户端（如 浏览器）主动发起，服务端进行处理后返回response结果，而服务端很难主动向客户端发送数据；这种客户端是主动方，服务端是被动方的传统Web模式 对于信息变化不频繁的Web应用来说造成的麻烦较小，而对于涉及实时信息的Web应用却带来了很大的不便，如带有即时通信、实时数据、订阅推送等功能的应用。在WebSocket规范提出之前，开发人员若要实现这些实时性较强的功能，经常会使用折衷的解决方法：轮询（polling）和Comet技术。其实后者本质上也是一种轮询，只不过有所改进。
　　
<!--more-->
　　轮询是最原始的实现实时Web应用的解决方案。轮询技术要求客户端以设定的时间间隔周期性地向服务端发送请求，频繁地查询是否有新的数据改动。明显地，这种方法会导致过多不必要的请求，浪费流量和服务器资源。

　　Comet技术又可以分为长轮询和流技术。长轮询改进了上述的轮询技术，减小了无用的请求。它会为某些数据设定过期时间，当数据过期后才会向服务端发送请求；这种机制适合数据的改动不是特别频繁的情况。流技术通常是指客户端使用一个隐藏的窗口与服务端建立一个HTTP长连接，服务端会不断更新连接状态以保持HTTP长连接存活；这样的话，服务端就可以通过这条长连接主动将数据发送给客户端；流技术在大并发环境下，可能会考验到服务端的性能。

　　这两种技术都是基于请求-应答模式，都不算是真正意义上的实时技术；它们的每一次请求、应答，都浪费了一定流量在相同的头部信息上，并且开发复杂度也较大。

　　伴随着HTML5推出的WebSocket，真正实现了Web的实时通信，使B/S模式具备了C/S模式的实时通信能力。WebSocket的工作流程是这样的：浏览器通过JavaScript向服务端发出建立WebSocket连接的请求，在WebSocket连接建立成功后，客户端和服务端就可以通过 TCP连接传输数据。因为WebSocket连接本质上是TCP连接，不需要每次传输都带上重复的头部数据，所以它的数据传输量比轮询和Comet技术小了很多。　　
　　
　　
## 示例

下面来看一下示例代码，套路还是和之前是一样的，只不过Initializer注册的Handler发生了变化。

`MyServer.java`

```java
public class MyServer {
    public static void main(String[] args) throws InterruptedException {
        EventLoopGroup bossGroup = new NioEventLoopGroup();
        EventLoopGroup workerGroup = new NioEventLoopGroup();

        try {
            ServerBootstrap serverBootstrap = new ServerBootstrap();
            serverBootstrap.group(bossGroup, workerGroup).channel(NioServerSocketChannel.class)
                    // handler是针对于bossGroup的
                    .handler(new LoggingHandler(LogLevel.INFO))
                    // childHandler是针对于workerGroup的
                    .childHandler(new WebSocketChannelInitializer());

            ChannelFuture channelFuture = serverBootstrap.bind(8899).sync();
            channelFuture.channel().closeFuture().sync();
        } finally {
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
    }
}
```


`WebSocketChannelInitializer.java`

```java
public class WebSocketChannelInitializer extends ChannelInitializer<SocketChannel> {


    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();

        pipeline.addLast(new HttpServerCodec());
        pipeline.addLast(new ChunkedWriteHandler());
        // 把各段HTTP的请求合并为一个FullHttpRequest
        pipeline.addLast(new HttpObjectAggregator(8192));
        pipeline.addLast(new WebSocketServerProtocolHandler("/ws"));
        pipeline.addLast(new TextWebSocketFrameHandler());

    }
}
```

`TextWebSocketFrameHandler.java`

注意这里SimpleChannelInboundHandler的泛型用`TextWebSocketFrame`

```java
public class TextWebSocketFrameHandler extends SimpleChannelInboundHandler<TextWebSocketFrame> {

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, TextWebSocketFrame msg) throws Exception {
        System.out.println("收到消息：" + msg.text());

        ctx.channel().writeAndFlush(new TextWebSocketFrame("服务器时间：" + LocalDateTime.now()));

    }


    @Override
    public void handlerAdded(ChannelHandlerContext ctx) throws Exception {
        System.out.println("handlerAdded: " + ctx.channel().id().asLongText());
    }

    @Override
    public void handlerRemoved(ChannelHandlerContext ctx) throws Exception {
        System.out.println("handlerRemoved: " + ctx.channel().id().asLongText());
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        System.out.println("异常发生");
        ctx.close();
    }
}

```

最后再来看一下客户端代码，我们来进行一下测试。

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>WebSocket客户端</title>
</head>
<body>
<form onsubmit="return false;">

    <textarea name="message" style="width:400px;height:200px"></textarea>
    <button onclick="send(this.form.message.value)">发送数据</button>
    <h3>服务端输出：</h3>
    <textarea id="responseText" style="width:400px;height:300px"></textarea>
    <button onclick="document.getElementById('responseText').value=''">清空内容</button>

</form>

<script type="text/javascript">
    var socket;

    if (window.WebSocket) {
        socket = new WebSocket("ws://localhost:8899/ws");
        socket.onmessage = function (event) {
            var ta = document.getElementById("responseText");
            ta.value = ta.value + "\n" + event.data;
        }

        socket.onopen = function (event) {
            var ta = document.getElementById("responseText");
            ta.value = "连接开启！";

        }

        socket.onclose = function (event) {
            var ta = document.getElementById("responseText");
            ta.value = ta.value + "连接关闭!";
        }

    }
    else {
        alert('浏览器不支持WebSocket!');
    }


    function send(message) {
        if (!window.WebSocket) {
            return;
        }

        if (socket.readyState == WebSocket.OPEN) {
            socket.send(message);
        }else {
            alert("连接尚未开启！")
        }
    }
</script>
</body>
</html>
```

运行起来观察一下。

![](http://7xs4nh.com1.z0.glb.clouddn.com/QQ20170613-211845.png)

提示连接开启，说明我们的websocket已经连接到了服务端，然后服务端也打印出来handlerAdded的通道ID。

![](http://7xs4nh.com1.z0.glb.clouddn.com/%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202017-06-13%20%E4%B8%8B%E5%8D%889.21.24.png)

发送一条消息给服务端试试。

![](http://7xs4nh.com1.z0.glb.clouddn.com/QQ20170613-212539.png)

![](http://7xs4nh.com1.z0.glb.clouddn.com/QQ20170613-212926@2x.png)

从浏览器的界面和开发工具看，我们收到了服务发送给客户端的消息，而且谷歌的开发工具在websocket协议下，还多了一个`FRAME`来显示浏览器与服务器WebSocket交互的所有数据。
服务端的控制台也打印出了浏览器发送给服务端的消息。

通过例子我们了解到Netty通过什么样的方式提供了对WebSocket的支持，为我们简化了大量的代码。希望通过这个例子，我们能更好的理解WebSocket的使用。

其实除了浏览器，现在IOS和Android也有第三方的工具可以来使用WebSocket连接。