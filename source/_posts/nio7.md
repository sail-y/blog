---
title: NIO-零拷贝
date: 2017-09-12 16:03:31
tags: [java,io]
categories: io
---

# NIO 零拷贝

OIO在读取文件传输的时候，在操作系统中发生了多次上下文的切换和多次的数据拷贝。

BIO在读取文件的流程图

![](/img/nio/nio8-1.png)

<!--more-->

NIO零拷贝读取文件的流程图，实际上这个也有一次拷贝，就是从kernel内核空间拷贝到socket buffer中。

![](/img/nio/nio8-2.png)


下面再写个零拷贝的例子深刻理解一下，首先是OIO的方式。

## OldServer

```java
import java.io.DataInputStream;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * @author yangfan
 * @date 2017/09/12
 */
public class OldServer {
    public static void main(String[] args) throws IOException {
        ServerSocket serverSocket = new ServerSocket(8899);

        while (true) {
            Socket socket = serverSocket.accept();
            DataInputStream dataInputStream = new DataInputStream(socket.getInputStream());

            try {
                byte[] byteArry = new byte[4096];

                while (true) {
                    int readCount = dataInputStream.read(byteArry, 0, byteArry.length);

                    if (-1 == readCount) {
                        break;
                    }

                }
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }
}

```

## OldClient

```java
import java.io.DataOutputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.Socket;

/**
 * @author yangfan
 * @date 2017/09/12
 */
public class OldClient {
    public static void main(String[] args) throws IOException {
        Socket socket = new Socket("localhost", 8899);

        // 这里选择一个比较大一点的文件，否则看不出来效果
        String fileName = "/Users/xiaomai/software/工具/CleanMyMac 3.5.1.dmg";

        InputStream inputStream = new FileInputStream(fileName);

        DataOutputStream dataOutputStream = new DataOutputStream(socket.getOutputStream());

        byte[] buffer = new byte[4096];
        long readCount;

        long total = 0;

        long startTime = System.currentTimeMillis();

        while ((readCount = inputStream.read(buffer)) >=0) {
            total += readCount;
            dataOutputStream.write(buffer);

        }

        System.out.println("发送总字节数：" + total + "，耗时：" + (System.currentTimeMillis() - startTime));

        inputStream.close();
        dataOutputStream.close();
    }
}
```

下面是NIO的方式：


## NewIOServer

```java
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.ByteBuffer;
import java.nio.channels.ServerSocketChannel;
import java.nio.channels.SocketChannel;

/**
 * @author yangfan
 * @date 2017/09/12
 */
public class NewIOServer {
    public static void main(String[] args) throws IOException {
        InetSocketAddress address = new InetSocketAddress(8899);

        ServerSocketChannel serverSocketChannel = ServerSocketChannel.open();
        ServerSocket serverSocket = serverSocketChannel.socket();
        // 复用客户端连接的端口号，断开后保留一段时间
        serverSocket.setReuseAddress(true);
        serverSocket.bind(address);


        ByteBuffer byteBuffer = ByteBuffer.allocate(4096);

        while (true) {
            SocketChannel socketChannel = serverSocketChannel.accept();
            socketChannel.configureBlocking(true);

            int readCount = 0;

            while (-1 != readCount) {
                try {
                    readCount = socketChannel.read(byteBuffer);
                } catch (Exception ex) {
                    ex.printStackTrace();
                }

                // 循环读取后将position设置为0
                byteBuffer.rewind();
            }

        }

    }
}
```


## NewIOClient

```java
/**
 * @author yangfan
 * @date 2017/09/13
 */
public class NewIOClient {
    public static void main(String[] args) throws Exception {
        SocketChannel socketChannel = SocketChannel.open();
        socketChannel.connect(new InetSocketAddress("localhost", 8899));
        socketChannel.configureBlocking(true);

        // 这里选择一个比较大一点的文件，否则看不出来效果
        String fileName = "/Users/xiaomai/software/工具/CleanMyMac 3.5.1.dmg";

        FileChannel fileChannel = new FileInputStream(fileName).getChannel();

        long startTime = System.currentTimeMillis();

        // 一行代码解决传输
        // 这行代码是用的零拷贝的方式来进行的文件传输，交给操作系统直接将文件系统缓存传输给了目标Channel
        // 而没有拷贝进用户空间的过程
        long transferCount = fileChannel.transferTo(0, fileChannel.size(), socketChannel);

        System.out.println("发送总字节数：" + transferCount + ", 耗时：" + (System.currentTimeMillis() - startTime));

        fileChannel.close();
    }
}
```


通过简单的测试我们也可以发现，NIO方式的速度确实快了很多。


从Linux2.4开始，还提供了scatter/gather的方式使速度更上一层，实现了真正意义上的零拷贝。

![](/img/nio/nio8-3.png)

将文件拷贝到kernel缓冲区后，只将地址和长度等必要信息拷贝到socket buffer中，等到要发送文件的时候，从socket buffer中读取文件长度和地址，从kernel中读取真正的文件，这是一种gather操作，然后把数据直接发送到了服务器端，跟之前的对比，省去了从kernel内核空间拷贝到socket buffer的过程。

![](/img/nio/nio8-4.png)