---
title: Netty-编解码器&处理器
date: 2017-12-12 20:38:16
tags: [Netty,java]
categories: Netty
---

# Netty处理器

编解码器本质上也是ChannelHandler的特殊实现，Netty本身为我们提供了很多处理器。

Netty处理器重要概念：

1. Netty的处理器可以分为两类：入站处理器与出站处理器。
2. 入站处理器的顶层是ChannelInboundHandler，出站处理器的顶层是ChannelOutboundHandler。
3. 数据处理时常用的各种编解码器本质上都是处理器。
4. 编解码器：无论我们向网络中写入的数据是什么类型（int、char、String、二进制等），数据在网络中传递时，其都是以字节流的形式呈现的；将数据由原本的形式转换为字节流的操作称为编码（encode），将数据由字节转换为它原本的格式或是其他格式的操作称为解码（decode），编解码统一称为codec。
5. 编码：本质上是一种出站处理器，因此，编码是一种ChannelOutboundHandler。
6. 解码：本质上是一种入站处理器，因此，解码是一种ChannelInboundHandler。
7. 在Netty中，编码器通常以XXXEncoder命名；解码器通常以XXXDecoder命名。

<!--more-->

## 回顾

回顾一个之前写的[例子](https://github.com/sail-y/netty/blob/master/src/main/java/com/sail/netty/secondexample/MyServerInitializer.java)：

```java
protected void initChannel(SocketChannel ch) throws Exception {
    ChannelPipeline pipeline = ch.pipeline();
    pipeline.addLast(new LengthFieldBasedFrameDecoder(Integer.MAX_VALUE, 0,4,0,4));
    pipeline.addLast(new LengthFieldPrepender(4));
    pipeline.addLast(new StringDecoder(CharsetUtil.UTF_8));
    pipeline.addLast(new StringEncoder(CharsetUtil.UTF_8));
    // 最后添加我们自己的处理器
    pipeline.addLast(new MyServerHandler());
}
```

学习到现在，我们已经很清楚的知道ChannelInitializer的职责，他本身是一个特殊的ChannelHandler，是用来初始化添加处理器的，在添加完成后，它自己会被销毁。

在这个例子中，根据命名或者他的继承类可以看出来，这里一共有4个入站处理器，1个出站处理器，虽然添加的时候代码都写在一起，实际上数据的流向却是两条线，从上往下进行解码，最后我们自定义的处理器拿到的时候就已经是字符串了，写出数据的时候也一样，写出的是String，但是通过StringEncoder转换成了字节。

## 自定义实现

在io.netty.handler.codec包中，包含了Netty为我们提供的很多编解码器。

下面我们自己实现一个。

要实现的效果：当客户端的channelActive事件触发的时候，客户端向服务端发送一个Long类型的数据，服务端也返回一个Long类型的数据。

**MyServerInitializer.java**

```java
public class MyServerInitializer extends ChannelInitializer<SocketChannel> {

    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        // 需要将字节转换为Long
        pipeline.addLast(new MyServerHandler());
    }
}
```


我们需要一个解码器，来将字节转换Long类型的数据，然后MyServerHandler才能处理。

Netty为我们提供了一个抽象类**ByteToMessageDecoder**，它是一个ChannelInboundHandlerAdapter，它的作用是将ByteBuf转换成另外一种消息类型，这个消息类型是我们自己来定的。



## MessageToByteEncoder&ByteToMessageDecoder

Netty为我们提供了一个**MessageToByteEncoder**，基本大多数的解码器都直接或间接的实现了这个抽象类，我们也实现这个类，是需要实现它的encode方法。
相对应的，编码器是**ByteToMessageDecoder**，需要实现它的decode方法。

### 自定义解码器
将字节转换成一个Long类型的数据。

```java
public class MyByteToLongDecoder extends ByteToMessageDecoder {
    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) throws Exception {
        System.out.println("decode invoked");

        System.out.println(in.readableBytes());

        // Long是8个字节
        if (in.readableBytes() >=8 ) {
            out.add(in.readLong());
        }
    }
}
```

### 自定义编码器

将Long转换为字节写入，编码器是有泛型的。

```java
public class MyLongToByteEncoder extends MessageToByteEncoder<Long> {
    @Override
    protected void encode(ChannelHandlerContext ctx, Long msg, ByteBuf out) throws Exception {
        out.writeLong(msg);
    }
}
```

以上完整实例代码在：https://github.com/sail-y/netty/tree/master/src/main/java/com/sail/netty/handler

数据执行流程：

客户端先编码发送数据，然后服务端解码，收到数据后再编码写出一个数据，客户端最后再解码。

客户端MyLongToByteEncoder -> 服务端MyByteToLongDecoder -> 服务端MyServerHandler -> 服务端MyLongToByteEncoder -> 客户端MyByteToLongDecoder -> 客户端MyClientHandler

如果客户端再返回一个字符串，那么客户端的MyLongToByteEncoder就已经执行失败了，所以数据不会发送给服务端。

## ReplayingDecoder

ReplayingDecoder 是 byte-to-message 解码的一种特殊的抽象基类，读取缓冲区的数据之前需要检查缓冲区是否有足够的字节，使用ReplayingDecoder就无需自己检查；若ByteBuf中有足够的字节，则会正常读取；若没有足够的字节则会停止解码。


> The biggest difference between ReplayingDecoder and ByteToMessageDecoder is that ReplayingDecoder allows you to implement the decode() and decodeLast() methods just like all required bytes were received already, rather than checking the availability of the required bytes. 

意思是我们在使用ReplayingDecoder的时候，就像数据已经全部接受到了一样，不用再去检测数据是否已经接受足够可以解码了。如果数据够了，它就直接读取，如果数据不够，它就抛出一个Error，ReplayingDecoder会捕获这个错误，然后ReplayingDecoder继续处理，并重置buffer的readerIndex，直到处理成功为止。

ReplayingDecoder的限制：

1. 某些buffer操作是被禁止的
2. 如果网络很慢，消息也很复杂，可能性能比较差
3. 一个消息的decode方法可能会被调用很多次



### 自定义实现

继承**ReplayingDecoder**实现一个解码器，替换之前的实现。

```java
public class MyByteToLongDecoder2 extends ReplayingDecoder<Void> {
    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {
        System.out.println("decode invoked");
        out.add(in.readLong());
    }
}
```

## MessageToMessageDecoder

用于从一种消息解码为另外一种消息（例如，POJO 到 POJO）,将 Integer 转为 String，我们提供了 IntegerToStringDecoder，继承自 MessageToMessageDecoder。

![](https://waylau.gitbooks.io/essential-netty-in-action/images/Figure%207.2%20IntegerToStringDecoder.jpg)

```java
public class MyLongToStringDecoder extends MessageToMessageDecoder<Long> {

    @Override
    protected void decode(ChannelHandlerContext ctx, Long msg, List<Object> out) {
        out.add(msg.toString());
    }
}
```

## LengthFieldBasedFrameDecoder

LengthFieldBasedFrameDecoder是一个非常常用的解码器，它会将ByteBuf根据消息里长度的值进行分割，这对有消息头里有长度的二进制消息特别有用。

关于LengthFieldBasedFrameDecoder的具体使用，和它的应用场景在文章后面的[TCP粘包和拆包](#TCP粘包和拆包)有演示。

## 关于Netty编解码器的重要结论：

1. 无论是编码器还是解码器，其所接收的消息类型必须要与待处理的参数类型一致，否则该编码器或解码器并不会被执行。
2. 在解码器进行数据解码时，一定要记得判断缓冲（ByteBuf）中的数据是否足够，否则将会产生一些问题。



## TCP粘包和拆包

TCP是个“流”协议，所谓流，就是没有界限的一串数据。大家可以想想河里的流水，是连成一片的，其间并没有分界线。TCP底层并不了解上层业务数据的具体含义，它会根据TCP缓冲区的实际情况进行包的划分，所以在业务上认为，一个完整的包可能会被TCP拆分成多个包进行发送，也有可能把多个小的包封装成一个大的数据包发送，这就是所谓的TCP粘包和拆包问题。



### 粘包演示


```java
public class MyClientHandler extends SimpleChannelInboundHandler<ByteBuf> {

    private int count;

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, ByteBuf msg) throws Exception {
        byte[] buffer = new byte[msg.readableBytes()];
        msg.readBytes(buffer);

        String message = new String(buffer, CharsetUtil.UTF_8);

        System.out.println("客户端接收到的消息内容：" + message);
        System.out.println("客户端接收到的消息数量：" + ++count);
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
        for (int i = 0; i < 10; i++) {
            ByteBuf buffer = Unpooled.copiedBuffer("send from client", CharsetUtil.UTF_8);
            ctx.writeAndFlush(buffer);
        }
    }
}
```

控制台输出结果：

```text
客户端接收到的消息内容：496faaef-6ed7-4802-bdd7-d4e9
客户端接收到的消息数量：1
```


```java
public class MyServerHandler extends SimpleChannelInboundHandler<ByteBuf> {

    private int count;

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, ByteBuf msg) throws Exception {
        byte[] buffer = new byte[msg.readableBytes()];

        msg.readBytes(buffer);
        String message = new String(buffer, CharsetUtil.UTF_8);

        System.out.println("服务端接收到的消息内容：" + message);
        System.out.println("服务器接收到的消息数量：" + (++count));

        ByteBuf responseByteBuf = Unpooled.copiedBuffer(UUID.randomUUID().toString(), CharsetUtil.UTF_8);
        ctx.writeAndFlush(responseByteBuf);

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

控制条输出的内容：

```text
服务端接收到的消息内容：send from clientsend from clientsend from clientsend from clientsend from clientsend from clientsend from clientsend from clientsend from clientsend from client
服务器接收到的消息数量：1
```

如果再重启几次客户端，服务端的结果还会发生如下变化，这是没有什么规律的。


```
服务端接收到的消息内容：send from client
服务器接收到的消息数量：1
服务端接收到的消息内容：send from client
服务器接收到的消息数量：2
服务端接收到的消息内容：send from clientsend from clientsend from clientsend from clientsend from clientsend from clientsend from clientsend from client
服务器接收到的消息数量：3
服务端接收到的消息内容：send from client
服务器接收到的消息数量：1
服务端接收到的消息内容：send from client
服务器接收到的消息数量：2
服务端接收到的消息内容：send from clientsend from clientsend from clientsend from client
服务器接收到的消息数量：3
服务端接收到的消息内容：send from clientsend from clientsend from clientsend from client
服务器接收到的消息数量：4
服务端接收到的消息内容：send from client
服务器接收到的消息数量：1
服务端接收到的消息内容：send from client
服务器接收到的消息数量：2
服务端接收到的消息内容：send from clientsend from clientsend from client
服务器接收到的消息数量：3
服务端接收到的消息内容：send from clientsend from client
服务器接收到的消息数量：4
服务端接收到的消息内容：send from clientsend from clientsend from client
服务器接收到的消息数量：5
```

完整可运行的代码在这里：https://github.com/sail-y/netty/tree/master/src/main/java/com/sail/netty/handler2


### 解决粘包->拆包演示

自定义一个协议，它包含了长度和内容两个字段

```java
public class PersonProtocol {

    private int length;

    private byte[] content;

    public int getLength() {
        return length;
    }

    public void setLength(int length) {
        this.length = length;
    }

    public byte[] getContent() {
        return content;
    }

    public void setContent(byte[] content) {
        this.content = content;
    }
}
```

解码器继承自ReplayingDecoder，好处是不需要去判断消息长度是否已经足够。

```java
public class MyPersonDecoder extends ReplayingDecoder<Void> {
    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {
        System.out.println("MyPersonDecoder decode invoked!");

        int length = in.readInt();

        byte[] content = new byte[length];
        in.readBytes(content);

        PersonProtocol personProtocol = new PersonProtocol();
        personProtocol.setLength(length);
        personProtocol.setContent(content);

        out.add(personProtocol);
    }
}
```
编码器就要简单很多了，需要将PersonProtocol输出为bytes。

```java
public class MyPersonEncoder extends MessageToByteEncoder<PersonProtocol> {

    @Override
    protected void encode(ChannelHandlerContext ctx, PersonProtocol msg, ByteBuf out) {
        System.out.println("MyPersonEncoder encode invoked!");

        out.writeInt(msg.getLength());
        out.writeBytes(msg.getContent());
    }
}
```

以及ServerHandler：

```java
public class MyServerHandler extends SimpleChannelInboundHandler<PersonProtocol> {
    private int count;

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, PersonProtocol msg) throws UnsupportedEncodingException {
        int length = msg.getLength();
        byte[] content = msg.getContent();

        System.out.println("服务端接收到的数据：");
        System.out.println("长度；" + length);
        System.out.println("内容：" + new String(content, CharsetUtil.UTF_8));
        System.out.println("服务端接受到的消息数量：" + ++count);

        String responseMessage = UUID.randomUUID().toString();
        int responseLength = responseMessage.getBytes("utf-8").length;
        byte[] responseContent = responseMessage.getBytes("utf-8");

        PersonProtocol personProtocol = new PersonProtocol();
        personProtocol.setLength(responseLength);
        personProtocol.setContent(responseContent);

        ctx.writeAndFlush(personProtocol);
    }
}
```

篇幅有限，剩余的代码文章就不贴完了，代码都在：https://github.com/sail-y/netty/tree/master/src/main/java/com/sail/netty/handler3


客户端输出：

```text
MyPersonEncoder encode invoked!
MyPersonEncoder encode invoked!
MyPersonEncoder encode invoked!
MyPersonEncoder encode invoked!
MyPersonEncoder encode invoked!
MyPersonEncoder encode invoked!
MyPersonEncoder encode invoked!
MyPersonEncoder encode invoked!
MyPersonEncoder encode invoked!
MyPersonEncoder encode invoked!
MyPersonDecoder decode invoked!
客户端接收到的数据：
长度；36
内容：3726cb1a-163f-498c-82b2-9731aeff94e0
客户端接受到的消息数量：1
MyPersonDecoder decode invoked!
客户端接收到的数据：
长度；36
内容：7cbb68f4-bdfd-4cf8-8de6-e18f78d58770
客户端接受到的消息数量：2
MyPersonDecoder decode invoked!
客户端接收到的数据：
长度；36
内容：463d503d-873f-4a4e-8a62-f3c1ccedd6ce
客户端接受到的消息数量：3
MyPersonDecoder decode invoked!
客户端接收到的数据：
长度；36
内容：6d8b8361-18e5-402c-8977-3ba4316633f4
客户端接受到的消息数量：4
MyPersonDecoder decode invoked!
客户端接收到的数据：
长度；36
内容：eccdc204-d589-4e24-8585-36d4c07f8ce8
客户端接受到的消息数量：5
MyPersonDecoder decode invoked!
客户端接收到的数据：
长度；36
内容：3dd02117-3a8b-4d2e-8c9c-e0a356cb54e1
客户端接受到的消息数量：6
MyPersonDecoder decode invoked!
客户端接收到的数据：
长度；36
内容：5db00fcc-1e07-4ac1-bb61-f514049d1643
客户端接受到的消息数量：7
MyPersonDecoder decode invoked!
客户端接收到的数据：
长度；36
内容：b306c7f5-790e-45f8-8031-f7fd74a54b07
客户端接受到的消息数量：8
MyPersonDecoder decode invoked!
客户端接收到的数据：
长度；36
内容：386acc20-986a-441a-a265-849a45c28119
客户端接受到的消息数量：9
MyPersonDecoder decode invoked!
客户端接收到的数据：
长度；36
内容：24c13a50-60c4-4d34-9d8e-fde19beda657
客户端接受到的消息数量：10
```


先是发送了10条消息，然后再接收到了10条消息。

服务端也是收到了10条消息：

```text
MyPersonDecoder decode invoked!
服务端接收到的数据：
长度；17
内容：sent from client 
服务端接受到的消息数量：1
MyPersonEncoder encode invoked!
MyPersonDecoder decode invoked!
服务端接收到的数据：
长度；17
内容：sent from client 
服务端接受到的消息数量：2
MyPersonEncoder encode invoked!
MyPersonDecoder decode invoked!
服务端接收到的数据：
长度；17
内容：sent from client 
服务端接受到的消息数量：3
MyPersonEncoder encode invoked!
MyPersonDecoder decode invoked!
服务端接收到的数据：
长度；17
内容：sent from client 
服务端接受到的消息数量：4
MyPersonEncoder encode invoked!
MyPersonDecoder decode invoked!
服务端接收到的数据：
长度；17
内容：sent from client 
服务端接受到的消息数量：5
MyPersonEncoder encode invoked!
MyPersonDecoder decode invoked!
服务端接收到的数据：
长度；17
内容：sent from client 
服务端接受到的消息数量：6
MyPersonEncoder encode invoked!
MyPersonDecoder decode invoked!
服务端接收到的数据：
长度；17
内容：sent from client 
服务端接受到的消息数量：7
MyPersonEncoder encode invoked!
MyPersonDecoder decode invoked!
服务端接收到的数据：
长度；17
内容：sent from client 
服务端接受到的消息数量：8
MyPersonEncoder encode invoked!
MyPersonDecoder decode invoked!
服务端接收到的数据：
长度；17
内容：sent from client 
服务端接受到的消息数量：9
MyPersonEncoder encode invoked!
MyPersonDecoder decode invoked!
服务端接收到的数据：
长度；17
内容：sent from client 
服务端接受到的消息数量：10
MyPersonEncoder encode invoked!
```
