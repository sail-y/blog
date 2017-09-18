---
title: Netty-gRPC
date: 2017-07-23 19:44:56
tags: [Netty,java]
categories: Netty
---


# gRPC

Define your service using Protocol Buffers, a powerful binary serialization toolset and language


gRPC是基于Protobuf开发的RPC框架，简化了protobuf的开发，提供了服务端和客户端网络交互这一块的代码。
 


## Demo

照着https://grpc.io/docs/quickstart/java.html测试一下官方的Demo。

记得要把`Update a gRPC service`部分做了。

<!--more-->

## gRPC整合Gradle与代码生成

https://github.com/grpc/grpc-java
这个是gRPC-java项目，先引入gRPC的依赖。


```code
compile 'io.grpc:grpc-netty:1.4.0'
compile 'io.grpc:grpc-protobuf:1.4.0'
compile 'io.grpc:grpc-stub:1.4.0'
```

然后配置gradle的grpc插件

```code
apply plugin: 'java'
apply plugin: 'com.google.protobuf'

buildscript {
  repositories {
    mavenCentral()
  }
  dependencies {
    // ASSUMES GRADLE 2.12 OR HIGHER. Use plugin version 0.7.5 with earlier
    // gradle versions
    classpath 'com.google.protobuf:protobuf-gradle-plugin:0.8.1'
  }
}

protobuf {
  protoc {
    artifact = "com.google.protobuf:protoc:3.2.0"
  }
  plugins {
    grpc {
      artifact = 'io.grpc:protoc-gen-grpc-java:1.4.0'
    }
  }
  generateProtoTasks {
    all()*.plugins {
      grpc {}
    }
  }
}
```

后面直接用gradle的任务就可以生成代码了。

gRPC提供了3种传输层的实现

* gRPC comes with three Transport implementations:

	1. The Netty-based transport is the main transport implementation based on Netty. It is for both the client and the server.
	2. The OkHttp-based transport is a lightweight transport based on OkHttp. It is mainly for use on Android and is for client only.
	3. The inProcess transport is for when a server is in the same process as the client. It is useful for testing.


https://github.com/google/protobuf-gradle-plugin

The Gradle plugin that compiles Protocol Buffer (aka. Protobuf) definition files (*.proto) in your project. There are two pieces of its job:

1. It assembles the Protobuf Compiler (protoc) command line and use it to generate Java source files out of your proto files.
2. It adds the generated Java source files to the input of the corresponding Java compilation unit (sourceSet in a Java project; variant in an Android project), so that they can be compiled along with your Java sources.

### 实战

配置好后，进行一个演示

在`src/main/proto`新建一个文件`Student.proto`

gradle插件默认从`src/main/proto`找proto源文件进行代码生成，[这里](https://github.com/google/protobuf-gradle-plugin#cutomizing-source-directories)有提到，而且这个路径的配置是可以修改的。

```proto
syntax = "proto3";

package com.sail.proto;

option java_package = "com.sail.proto";
option java_outer_classname = "StudentProto";
option java_multiple_files = true;

service StudentService {
    rpc GetRealNameByUsername(MyRequest) returns (MyResponse) {}

    rpc GetStudentsByAge(StudentRequest) returns (stream StudentResponse) {}

    rpc GetStudentsWrapperByAges(stream StudentRequest) returns (StudentResponseList) {}

    rpc BiTalk(stream StreamRequest) returns (stream StreamResponse) {}
}

message MyRequest {
    string username = 1;
}

message MyResponse {
    string realname = 2;
}

message StudentRequest {
    int32 age = 1;
}

message StudentResponse {
    string name = 1;
    int32 age = 2;
    string city = 3;
}

message StudentResponseList {
    repeated StudentResponse studentResponse = 1;
}

message StreamRequest {
    string request_info = 1;
}

message StreamResponse {
    string response_info = 1;
}

```

然后执行`gradle generateProto`，生成的代码默认是放在`/build`目录下，我们手动拷贝到`src/main/java`。

#### 实现代码

```java
package com.sail.grpc;

import com.sail.proto.*;
import io.grpc.stub.StreamObserver;

import java.util.UUID;

/**
 * @author yangfan
 * @date 2017/08/01
 */
public class StudentServiceImpl extends StudentServiceGrpc.StudentServiceImplBase {

    @Override
    public void getRealNameByUsername(MyRequest request, StreamObserver<MyResponse> responseObserver) {
        System.out.println("接收到客户端信息： " + request.getUsername());
        responseObserver.onNext(MyResponse.newBuilder().setRealname("张三").build());
        responseObserver.onCompleted();
    }


    /**
     * 接收StudentRequest参数
     * 返回stream的StudentResponse
     */
    @Override
    public void getStudentsByAge(StudentRequest request, StreamObserver<StudentResponse> responseObserver) {
        System.out.println("接收到客户端信息：" + request.getAge());

        responseObserver.onNext(StudentResponse.newBuilder().setName("张三").setAge(20).setCity("北京").build());
        responseObserver.onNext(StudentResponse.newBuilder().setName("李四").setAge(30).setCity("天津").build());
        responseObserver.onNext(StudentResponse.newBuilder().setName("王五").setAge(40).setCity("成都").build());
        responseObserver.onNext(StudentResponse.newBuilder().setName("赵六").setAge(50).setCity("深圳").build());

        responseObserver.onCompleted();
    }


    /**
     * 接收stream的StudentRequest参数
     * 返回StudentResponseList
     */
    @Override
    public StreamObserver<StudentRequest> getStudentsWrapperByAges(StreamObserver<StudentResponseList> responseObserver) {
        return new StreamObserver<StudentRequest>() {

            @Override
            public void onNext(StudentRequest value) {
                System.out.println("onNext: " + value.getAge());
            }


            @Override
            public void onError(Throwable t) {
                System.out.println(t.getMessage());
            }


            @Override
            public void onCompleted() {
                StudentResponse studentResponse = StudentResponse.newBuilder().setName("张三").setAge(20).setCity("西安").build();
                StudentResponse studentResponse2 = StudentResponse.newBuilder().setName("李四").setAge(30).setCity("成都").build();

                StudentResponseList studentResponseList = StudentResponseList.newBuilder()
                        .addStudentResponse(studentResponse).addStudentResponse(studentResponse2).build();

                responseObserver.onNext(studentResponseList);
                responseObserver.onCompleted();
            }
        };
    }

    /**
     * 双向流式数据传递
     */
    @Override
    public StreamObserver<StreamRequest> biTalk(StreamObserver<StreamResponse> responseObserver) {
        return new StreamObserver<StreamRequest>() {
            @Override
            public void onNext(StreamRequest value) {
                System.out.println(value.getRequestInfo());

                responseObserver.onNext(StreamResponse.newBuilder().setResponseInfo(UUID.randomUUID().toString()).build());
            }

            @Override
            public void onError(Throwable t) {
                System.out.println(t.getMessage());
            }

            @Override
            public void onCompleted() {
                responseObserver.onCompleted();
            }
        };
    }
}

```

#### 服务器端

```java
package com.sail.grpc;

import io.grpc.Server;
import io.grpc.ServerBuilder;

import java.io.IOException;

/**
 * @author yangfan
 * @date 2017/08/01
 */
public class GrpcServer {

    private Server server;

    private void start() throws IOException {
        this.server = ServerBuilder.forPort(8899).addService(new StudentServiceImpl()).build().start();
        System.out.println("server started！");

        // 这里在关闭JVM的时候会执行JVM回调钩子
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("关闭jvm");
            GrpcServer.this.stop();
        }));

        System.out.println("执行到这里");
    }


    private void stop() {
        if (server != null) {
            this.server.shutdown();
        }
    }

    private void awaitTermination() throws InterruptedException {
        if (server != null) {
            this.server.awaitTermination();
        }
    }

    public static void main(String[] args) throws InterruptedException, IOException {

        GrpcServer grpcServer = new GrpcServer();
        grpcServer.start();
        grpcServer.awaitTermination();

    }
}

```

#### 客户端


```java
package com.sail.grpc;

import com.sail.proto.*;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.stub.StreamObserver;

import java.time.LocalDateTime;
import java.util.Iterator;

/**
 * @author yangfan
 * @date 2017/08/01
 */
public class GrpcClient {
    public static void main(String[] args) {
        ManagedChannel managedChannel = ManagedChannelBuilder.forAddress("localhost", 8899)
                .usePlaintext(true).build();

        StudentServiceGrpc.StudentServiceBlockingStub blockingStub = StudentServiceGrpc.newBlockingStub(managedChannel);
        StudentServiceGrpc.StudentServiceStub  stub = StudentServiceGrpc.newStub(managedChannel);
        MyResponse myResponse = blockingStub.getRealNameByUsername(MyRequest.newBuilder().setUsername("zhangsan").build());

        System.out.println(myResponse.getRealname());


        System.out.println("----------------");

        Iterator<StudentResponse> iter = blockingStub.getStudentsByAge(StudentRequest.newBuilder().setAge(20).build());

        while (iter.hasNext()) {
            StudentResponse studentResponse = iter.next();

            System.out.println(studentResponse.getName() + ", " + studentResponse.getAge() + ", " + studentResponse.getCity());

        }

        System.out.println("----------------");


        // getStudentsWrapperByAges的调用代码

        StreamObserver<StudentResponseList> studentResponseListStreamObserver = new StreamObserver<StudentResponseList>() {
            @Override
            public void onNext(StudentResponseList value) {
                value.getStudentResponseList().forEach(studentResponse -> {
                    System.out.println(studentResponse.getName() + ", " + studentResponse.getAge() + ", " + studentResponse.getCity());
                    System.out.println("*******");
                });
            }

            @Override
            public void onError(Throwable t) {
                System.out.println(t.getMessage());
            }

            @Override
            public void onCompleted() {
                System.out.println("completed!");
            }
        };


        // 只要客户端是以流式发送请求，那么一定是异步的
        StreamObserver<StudentRequest> studentRequestStreamObserver = stub.getStudentsWrapperByAges(studentResponseListStreamObserver);
        // 发送多条数据
        studentRequestStreamObserver.onNext(StudentRequest.newBuilder().setAge(20).build());
        studentRequestStreamObserver.onNext(StudentRequest.newBuilder().setAge(30).build());
        studentRequestStreamObserver.onNext(StudentRequest.newBuilder().setAge(40).build());
        studentRequestStreamObserver.onNext(StudentRequest.newBuilder().setAge(50).build());
        studentRequestStreamObserver.onCompleted();

        // 以上代码是没有输出结果的，因为stub是异步的，所以当执行完onCompleted的时候程序就已经结束了，还没有来得及发送请求
        // 现在加入以下代码，让程序多运行一会
	    try {
            Thread.sleep(50000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }



        // 双向数据流的调用

        StreamObserver<StreamRequest> requestStreamObserver = stub.biTalk(new StreamObserver<StreamResponse>() {
            @Override
            public void onNext(StreamResponse value) {
                System.out.println(value.getResponseInfo());
            }

            @Override
            public void onError(Throwable t) {
                System.out.println(t.getMessage());
            }

            @Override
            public void onCompleted() {
                System.out.println("onCompleted!");
            }
        });

        for (int i = 0; i < 10; i++) {
            requestStreamObserver.onNext(StreamRequest.newBuilder().setRequestInfo(LocalDateTime.now().toString()).build());
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }

        }
    }


}

```


