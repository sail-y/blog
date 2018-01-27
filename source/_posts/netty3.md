---
title: Netty-Google Protobuf介绍和使用
date: 2017-06-15 21:15:18
tags: [Netty,java]
categories: Netty
---

# Google Protobuf

https://developers.google.com/protocol-buffers/

接下来看一下Google Protobuf的使用方式。Protobuf的主要作用是用来进行RPC的传输。它跟Apache Thrift属于同一个领域的框架，都可以用来序列化和反序列化数据进行传输。


## RMI介绍

目前Java中有一门比较成熟，同时也是EJB的标准的技术叫做RMI(remote method invocation)。RMI限制了只能基于Java调用。这种跨机器的调用，是客户端序列化后字节码再通过网络进行传输到服务端，服务端再反序列化数据进行代码调用。这就涉及到2个概念，
<!--more-->

1. client: stub(序列化生成代码)
2. server: skeleton(反序列化)



序列化与反序列化，也叫做编码与解码。

## RPC介绍
Remote Procedure Call, 远程过程调用，很多RPC框架是跨语言的。 

1. 定义一个接口说明文件(idl)：描述了对象（结构体）、对象成员、接口方法等一系列信息。
2. 通过RPC框架所提供的编译器，将接口说明文件编译成具体语言文件。
3. 在客户端与服务端分别引入RPC编译器所生产的文件，即可像调用本地方法一样调用远程方法。

## Protocol Buffers


>Protocol buffers are Google's language-neutral, platform-neutral, extensible mechanism for serializing structured data – think XML, but smaller, faster, and simpler. You define how you want your data to be structured once, then you can use special generated source code to easily write and read your structured data to and from a variety of data streams and using a variety of languages.


Protocol buffers是谷歌提供的语言中立、平台中立，用于序列化结构数据的可扩展的机制，就像XML一样，但是它的体积更小，它的速度更快、更简单。数据结构你只需要定义一次就可以了
，然后就可以使用生成的各种语言源代码去轻松的读写你的各种结构化数据。

## 下载

https://github.com/google/protobuf/releases

先下载环境，注意不要下错了，我这里下载`protoc-3.3.0-osx-x86_64.zip`，配置好环境后可执行protoc命令。

## Demo 

https://developers.google.com/protocol-buffers/docs/javatutorial

然后我们照着官方的demo来写一个。


首先需要编写一个`.proto`文件。

```
syntax = "proto2";

package com.sail.protobuf;

option optimize_for = SPEED;
option java_package = "com.sail.protobuf";
option java_outer_classname = "DataInfo";

message Student {
    required string name = 1;
    optional int32 age = 2;
    optional string address = 3;

}
```


然后执行命令生成代码，就得到一个`DataInfo.java`

	protoc --java_out=src/main/java src/main/protobuf/Student.proto


	
### 测试

现在测试一下这个类的使用

```java
public class ProtoBufTest {
    public static void main(String[] args) throws InvalidProtocolBufferException {
        DataInfo.Student student = DataInfo.Student.newBuilder()
                .setName("张三").setAge(20).setAddress("北京").build();

        byte[] student2ByteArray = student.toByteArray();

        DataInfo.Student student2 = DataInfo.Student.parseFrom(student2ByteArray);

        System.out.println(student2.getName());
        System.out.println(student2.getAge());
        System.out.println(student2.getAddress());

    }
}
```

## Netty Demo

在上述代码中，我们看到正确输出了结果。然后配合Netty使用。Netty代码跟之前的套路都是一样的，还是Handler不同。

### 服务端代码

`TestServer.java`

```java
public class TestServer {
    public static void main(String[] args) throws InterruptedException {
        EventLoopGroup bossGroup = new NioEventLoopGroup();
        EventLoopGroup workerGroup = new NioEventLoopGroup();

        try {
            ServerBootstrap serverBootstrap = new ServerBootstrap();
            serverBootstrap.group(bossGroup, workerGroup).channel(NioServerSocketChannel.class)
                    // handler是针对于bossGroup的
                    .handler(new LoggingHandler(LogLevel.INFO))
                    // childHandler是针对于workerGroup的
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

`TestServerInitializer.java`

```java
public class TestServerInitializer extends ChannelInitializer<SocketChannel> {

    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();

        pipeline.addLast(new ProtobufVarint32FrameDecoder());
        pipeline.addLast(new ProtobufDecoder(MyDataInfo.Person.getDefaultInstance()));
        pipeline.addLast(new ProtobufVarint32LengthFieldPrepender());
        pipeline.addLast(new ProtobufEncoder());
        pipeline.addLast(new TestServerHandler());
    }
}
```

`TestServerHandler.java`

```java
public class TestServerHandler extends SimpleChannelInboundHandler<MyDataInfo.Person> {


    @Override
    protected void channelRead0(ChannelHandlerContext ctx, MyDataInfo.Person msg) throws Exception {
        System.out.println(msg.getName());
        System.out.println(msg.getAge());
        System.out.println(msg.getAddress());
    }
}
```

### 客户端代码

`TestClient.java`

```java
public class TestClient {

    public static void main(String[] args) throws InterruptedException {
        // 客户端只需要一个EventLoopGroup
        EventLoopGroup eventLoopGroup = new NioEventLoopGroup();

        try {
            Bootstrap bootstrap = new Bootstrap();
            bootstrap.group(eventLoopGroup).channel(NioSocketChannel.class).handler(new TestClientInitializer());

            ChannelFuture channelFuture = bootstrap.connect("localhost", 8899).sync();
            channelFuture.channel().closeFuture().sync();
        }finally {
            eventLoopGroup.shutdownGracefully();
        }
    }
}
```

`TestClientInitializer.java`

```java
public class TestClientInitializer extends ChannelInitializer<SocketChannel> {

    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();

        pipeline.addLast(new ProtobufVarint32FrameDecoder());
        pipeline.addLast(new ProtobufDecoder(MyDataInfo.Person.getDefaultInstance()));
        pipeline.addLast(new ProtobufVarint32LengthFieldPrepender());
        pipeline.addLast(new ProtobufEncoder());
        pipeline.addLast(new TestClientHandler());
    }
}
```

`TestClientHandler.java`

```java
public class TestClientHandler extends SimpleChannelInboundHandler<MyDataInfo.Person> {

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, MyDataInfo.Person msg) throws Exception {

    }

    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        MyDataInfo.Person person = MyDataInfo.Person.newBuilder().setName("张三").setAge(20).setAddress("成都").build();


        ctx.channel().writeAndFlush(person);
    }
}
```

### 测试

先启动服务端，再启动客户端。服务端直接输出了

```plain
张三
20
成都
```

## 另一种方法

但是发现我们这个代码非常有局限性，因为代码里写了`MyDataInfo.Person.getDefaultInstance`,如果要传输其他消息怎么办呢，或者不止一个消息，这个就非常不灵活，下面就介绍一种更灵活的方式。 

```java
pipeline.addLast(new ProtobufDecoder(MyDataInfo.Person.getDefaultInstance()));
```

### proto

重新定义一下proto文件

```java
syntax = "proto2";

package com.sail.protobuf;

option optimize_for = SPEED;
option java_package = "com.sail.netty.sixthexample";
option java_outer_classname = "MyDataInfo";

message MyMessage {

    enum DataType {
        PersonType = 1;
        DogType = 2;
        CatType = 3;
    }

    required DataType data_type = 1;

    oneof dataBody {
        Person person = 2;
        Dog dog = 3;
        Cat cat = 4;


    }

}

message Person {
    optional string name = 1;
    optional int32 age = 2;
    optional string address = 3;
}

message Dog {
    optional string name = 1;
    optional int32 age = 2;
}

message Cat {
    optional string name = 1;
    optional string city = 2;
}
```

上面出现了`oneof`
>If you have a message with many optional fields and where at most one field will be set at the same time, you can enforce this behavior and save memory by using the oneof feature.

这是官方的解释，意思就是说如果有很多个optional但是同一时间内只有一个有值，那么就可以用oneof的方式来提升性能节约内存。我们也正是利用这种方式来用同一个消息进行不同的值传递。

对之前的代码进行一些改动

### 服务端

`TestServerHandler.java`

```java
public class TestServerHandler extends SimpleChannelInboundHandler<MyDataInfo.MyMessage> {


    @Override
    protected void channelRead0(ChannelHandlerContext ctx, MyDataInfo.MyMessage msg) throws Exception {

        MyDataInfo.MyMessage.DataType dataType = msg.getDataType();

        switch (dataType) {

            case PersonType:
                MyDataInfo.Person person = msg.getPerson();

                System.out.println(person.getName());
                System.out.println(person.getAge());
                System.out.println(person.getAddress());
                break;
            case DogType:
                MyDataInfo.Dog dog = msg.getDog();
                System.out.println(dog.getName());
                System.out.println(dog.getAge());
                break;
            case CatType:
                MyDataInfo.Cat cat = msg.getCat();
                System.out.println(cat.getName());
                System.out.println(cat.getCity());
                break;
        }
    }
}
```

`TestServerInitializer.java`主要修改了ProtobufDecoder的类型。

```java
public class TestServerInitializer extends ChannelInitializer<SocketChannel> {

    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();

        pipeline.addLast(new ProtobufVarint32FrameDecoder());
        pipeline.addLast(new ProtobufDecoder(MyDataInfo.MyMessage.getDefaultInstance()));
        pipeline.addLast(new ProtobufVarint32LengthFieldPrepender());
        pipeline.addLast(new ProtobufEncoder());
        pipeline.addLast(new TestServerHandler());
    }
}
```

### 客户端

`TestClientHandler.java`

```java
public class TestClientHandler extends SimpleChannelInboundHandler<MyDataInfo.MyMessage> {

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, MyDataInfo.MyMessage msg) throws Exception {

    }

    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        int randomInt = new Random().nextInt(3);

        MyDataInfo.MyMessage myMessage;

        if (0 == randomInt) {
            myMessage = MyDataInfo.MyMessage.newBuilder()
                    .setDataType(MyDataInfo.MyMessage.DataType.PersonType)
                    .setPerson(MyDataInfo.Person.newBuilder().setName("张三").setAge(20).setAddress("成都").build()).build();

        } else if (1 == randomInt) {
            myMessage = MyDataInfo.MyMessage.newBuilder()
                    .setDataType(MyDataInfo.MyMessage.DataType.DogType)
                    .setDog(MyDataInfo.Dog.newBuilder().setName("一只狗").setAge(2).build()).build();
        } else {
            myMessage = MyDataInfo.MyMessage.newBuilder()
                    .setDataType(MyDataInfo.MyMessage.DataType.CatType)
                    .setCat(MyDataInfo.Cat.newBuilder().setName("七七").setCity("成都").build()).build();
        }


        ctx.channel().writeAndFlush(myMessage);
    }
}
```

`TestClientInitializer.java`

```java
public class TestClientInitializer extends ChannelInitializer<SocketChannel> {

    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();

        pipeline.addLast(new ProtobufVarint32FrameDecoder());
        pipeline.addLast(new ProtobufDecoder(MyDataInfo.MyMessage.getDefaultInstance()));
        pipeline.addLast(new ProtobufVarint32LengthFieldPrepender());
        pipeline.addLast(new ProtobufEncoder());
        pipeline.addLast(new TestClientHandler());
    }
}
```

### 测试

然后启动服务端，再多启动几次客户端，得到如下输出:

```plain
七七
成都
一只狗
2
一只狗
2
张三
20
成都
```
