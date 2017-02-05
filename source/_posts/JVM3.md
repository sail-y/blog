title: JVM3-内存溢出异常实战
date: 2016-10-31 12:25:33
tags: [JVM,java]
categories: JVM
---

在Java虚拟机规范的描述中，除了程序计数器，其他几个运行时区域都有发生OutOfMemoryError异常的可能。本文有两个目的：

1. 通过代码验证Java虚拟机规范中描述的各个运行时区域存储的内容。
2. 希望我们在工作中遇到问题的时候能迅速判断是哪个区域的内存溢出，知道什么样的代码会导致这些区域溢出，以及出现这些异常后该如何处理。

这个图展示了如何在Idea中设置VM参数。
<!--more-->
![](http://7xs4nh.com1.z0.glb.clouddn.com/jvm2-2-1.png)

### Java堆异常
Java堆用于储存对象实例，只要不断地创建对象且对象不被回收，那么在对象数量到达最大堆的容量限制后就会产生OOM。


```java
/**
 * Created by YangFan on 2016/10/31 下午1:34.
 * <p/>
 *  设置堆大小为20m，不可扩展(堆的最小值-Xms参数和最大值-Xmx参数设置为一样可避免堆自动扩展)
 *  VM参数：-Xms20m -Xmx20m -XX:+HeapDumpOnOutOfMemoryError
 */
public class HeapOOM {

    static class OOMObject {

    }

    public static void main(String[] args) {
        List<OOMObject> list = new ArrayList<>();
        while (true) {
            list.add(new OOMObject());
        }

    }
}

```

结果如下

```
java.lang.OutOfMemoryError: Java heap space
Dumping heap to java_pid56046.hprof ...
Heap dump file created [27956110 bytes in 0.186 secs]
Exception in thread "main" java.lang.OutOfMemoryError: Java heap space
```

这个问题很常见，根据错误提示可以定位到代码，分清楚是内存泄露还是内存溢出。如果是内存泄露，找出GC无法回收的对象代码位置。如果不存在泄露，就是说内存中的对象确实都还必须存活着，应当检查一下虚拟机的堆参数(-Xms和-Xmx)，代码上检查是否存在某些对象生命周期过长、持有状态时间过长的情况，尝试减少程序运行期的内存消耗。

### 虚拟机栈和本地方法栈溢出

由于HotSpot虚拟机中并不区分虚拟机栈和本地方法栈，因此对于HotSpot来说`-Xoss`(设置本地方法栈大小)是无效的，栈容量只由`-Xss`参数设置。关于虚拟机栈和本地方法栈，在虚拟机规范中描述了两种异常：

* 如果线程请求的栈深度大于虚拟机所允许的最大深度，将抛出StackOverflowError异常。
* 如果虚拟机在扩展栈时无法申请到足够的内存空间，则抛出OutOfMemoryError异常。

```java
/**
 * Created by YangFan on 2016/10/31 下午2:06.
 * <p/>
 *  不断地递归调用导致栈深度增加
 *  VM参数：-Xss128k
 *
 */
public class JavaVMStackSOF {
    private int stackLength = 1;

    public void stackLength() {
        stackLength++;
        stackLength();
    }

    public static void main(String[] args) {

        JavaVMStackSOF javaVMStackSOF = new JavaVMStackSOF();
        try {
            javaVMStackSOF.stackLength();
        } catch (Throwable e) {
            System.out.println("stack length:" + javaVMStackSOF.stackLength);
            throw e;
        }

    }
}

```

运行结果

```
stack length:29460
Exception in thread "main" java.lang.StackOverflowError
	at oom.JavaVMStackSOF.stackLength(JavaVMStackSOF.java:19)
```
在单线程下，无论是栈帧太大，还是虚拟机栈容量太小，当内存无法分配的时候，虚拟机抛出的都是*StackOverFlow*异常。		
可以通过不断创建线程的方式产生内存溢出异常，不过这个异常与栈容量大小没有什么关系，因为不断创建线程，每个线程分配的容量越大，那么总共可产生线程数量就越小，就越容易出现OOM。这个只能通过减少最大堆内存(留给栈分配的内存变大)和减少栈容量来换取更多的线程。

```java

/**
 * Created by YangFan on 2016/10/31 下午2:18.
 * <p/>
 * 不断创建线程导致内存溢出
 * VM参数：-Xss2M
 */
public class JavaVMStackOOM {

    private int count = 0;

    public void stackLeakByThread() {

        while (true) {
            Thread thread = new Thread() {
                @Override
                public void run() {
                    try {
                        count++;
                        TimeUnit.SECONDS.sleep(10);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
            };

            thread.start();
        }

    }

    // 不要在Windows下运行这段代码，可能会假死
    public static void main(String[] args) {
        JavaVMStackOOM javaVMStackOOM = new JavaVMStackOOM();
        try {
            javaVMStackOOM.stackLeakByThread();
        } catch (Throwable e) {
            System.out.println("thread count: " + javaVMStackOOM.count);
            throw e;
        }
    }
}

```

运行结果

```
thread count: 2028
Exception in thread "main" java.lang.OutOfMemoryError: unable to create new native thread
	at java.lang.Thread.start0(Native Method)
```

### 方法区和运行时常量池溢出

前面提到过，运行时常量池也是方法区的一部分，并且在JDK8 HotSpot中去掉了永久代。`String.intern()`是一个Native方法，它的作用是：如果常量池中有一个String对象的字符串就返回池中的这个字符串的String对象；否则，将此String对象包含的字符串添加到常量池中去，并且返回此String对象的引用。

```java
/**
 * Created by YangFan on 2016/10/31 下午3:01.
 * <p/>
 * 
 * VM参数-XX:PermSize=10M -XX:MaxPermSize=10M
 *
 * 对于JDK 1.6 HotSpot而言，方法区=永久代，这里看到OutOfMemoryError的区域是“PermGen space”，即永久代，那其实也就是方法区溢出了
 *
 * JDK7这个例子会一直循环，因为JDK 7里String.intern生成的String不再是在perm gen分配,而是在Java Heap中分配
 * JDK8移除了永久代（Permanent Generation ），替换成了元空间（Metaspace）内存分配模型
 * 设置虚拟机参数-XX:MaxMetaspaceSize=1m，可出现OutOfMemoryError: Metaspace 溢出
 */
public class RuntimeConstantPoolOOM {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>();

        int i = 0;

        while (true)
            list.add(String.valueOf(i++).intern());
    }
}

```

### 本机直接内存溢出

这个地方的溢出，特征是发现OOM后Dump文件很小，而程序中间接或直接使用了NIO，那就考虑检查一下是不是这个原因。
