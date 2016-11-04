title: JVM4-内存分配与回收策略
date: 2016-11-01 13:51:44
tags: [java,JVM]
categories: JVM
---

## 内存分配
之前讲了垃圾回收器体系以及运作原理，现在来看看对象内存分配那点事儿。对象的内存分配，往大方向讲就是在堆上分配，对象主要分配在新生代的Eden区上，也可能直接分配在老年代中，并不固定，取决于使用的哪一种垃圾收集器以及虚拟机参数设置。

### 对象优先在Eden分配
大多数情况下，对象在新生代Eden区中分配。当Eden区没有足够的空间进行分配时，虚拟机会发一起一次Minor GC。		
不同的垃圾收集器组合对于对象的分配是有影响的，我们这里都是测试在`Serial+SerialOld`的收集器组合下测试的代码。
下面的代码，`-Xms20M -Xmx20M -Xmn10M`三个参数限制了Java堆大小为20M，不可扩展，分给新生代10M，剩下10M分给老年代，`-XX:SurvivorRatio=8`定义了Eden区与一个Survivor区的空间比例是8:1,`-XX:+UseSerialGC`参数指定Serial垃圾收集器

```java
/**
 * Created by YangFan on 2016/11/1 下午3:34.
 * <p/>
 *  VM 参数: -verbose:gc -XX:+PrintGCDetails -Xms20M -Xmx20M -Xmn10M -XX:SurvivorRatio=8 -XX:UseSerialGC
 */
public class EdenGC {
    private static final int _1MB = 1024 * 1024;

    public static void main(String[] args) {
        byte[] allocation1 = new byte[2 * _1MB];
        byte[] allocation2 = new byte[2 * _1MB];
        byte[] allocation3 = new byte[2 * _1MB];
        // 发生一次MinorGC
        byte[] allocation4 = new byte[4 * _1MB];
    }
}

```
GC输出：

```plain
[GC (Allocation Failure) [DefNew: 7643K->517K(9216K), 0.0078067 secs] 7643K->6661K(19456K), 0.0078482 secs] [Times: user=0.00 sys=0.00, real=0.01 secs] 
Heap
 def new generation   total 9216K, used 4750K [0x00000007bec00000, 0x00000007bf600000, 0x00000007bf600000)
  eden space 8192K,  51% used [0x00000007bec00000, 0x00000007bf0223b8, 0x00000007bf400000)
  from space 1024K,  50% used [0x00000007bf500000, 0x00000007bf581668, 0x00000007bf600000)
  to   space 1024K,   0% used [0x00000007bf400000, 0x00000007bf400000, 0x00000007bf500000)
 tenured generation   total 10240K, used 6144K [0x00000007bf600000, 0x00000007c0000000, 0x00000007c0000000)
   the space 10240K,  60% used [0x00000007bf600000, 0x00000007bfc00030, 0x00000007bfc00200, 0x00000007c0000000)
 Metaspace       used 3062K, capacity 4494K, committed 4864K, reserved 1056768K
  class space    used 333K, capacity 386K, committed 512K, reserved 1048576K
```
我们可以看到`eden space`是8M，前面3个对象都分配到了eden区，在分配`allocation4`的时候，eden区已经不够了，于是发生了一次Minor GC，但是3个对象都是存活的，并且无法放进Survivor(from space)区，所以通过分配担保机制转移到了老年代去。然后4M的`allocation4`分配进了Eden区。

### 大对象直接进入老年代
虚拟机提供了一个-XX:PretenureSizeThreshold参数，大于这个设置值的对象直接在老年代分配。这样做的目的是避免在Eden区以及两个Survivor区之间发生大量的复制（新生代采用复制算法）。

	-XX:PretenureSizeThreshold只在Serial和ParNew两款收集器有效。

```java
/**
 * Created by YangFan on 2016/11/1 下午3:34.
 * <p/>
 *  VM 参数: -verbose:gc -XX:+PrintGCDetails -Xms20M -Xmx20M -Xmn10M -XX:SurvivorRatio=8
 */
public class EdenGC {
    private static final int _1MB = 1024 * 1024;

    public static void main(String[] args) {
        byte[] allocation1 = new byte[2 * _1MB];
        byte[] allocation2 = new byte[2 * _1MB];
        byte[] allocation3 = new byte[2 * _1MB];
        // 发生一次MinorGC
        byte[] allocation4 = new byte[4 * _1MB];
    }
}
```
运行结果：

```plain
Heap
 def new generation   total 9216K, used 1655K [0x00000007bec00000, 0x00000007bf600000, 0x00000007bf600000)
  eden space 8192K,  20% used [0x00000007bec00000, 0x00000007bed9de40, 0x00000007bf400000)
  from space 1024K,   0% used [0x00000007bf400000, 0x00000007bf400000, 0x00000007bf500000)
  to   space 1024K,   0% used [0x00000007bf500000, 0x00000007bf500000, 0x00000007bf600000)
 tenured generation   total 10240K, used 4096K [0x00000007bf600000, 0x00000007c0000000, 0x00000007c0000000)
   the space 10240K,  40% used [0x00000007bf600000, 0x00000007bfa00010, 0x00000007bfa00200, 0x00000007c0000000)
 Metaspace       used 2994K, capacity 4494K, committed 4864K, reserved 1056768K
  class space    used 324K, capacity 386K, committed 512K, reserved 1048576K
```
看到对象超过了3M，直接进入了tenured generation(老年代)。

### 长期存活的对象将进入老年代

对象在Eden区每gc留下来一次(大小可复制到Survivor区中)，年龄+1，默认是15岁后移到老年代。这个阀值可以通过-XX:MaxTenuringThreshold设置。

```java
/**
 * Created by YangFan on 2016/11/2 下午13:58.
 * <p/>
 * 1岁后直接进入老年代
 *
 * VM参数：-verbose:gc -XX:+PrintGCDetails -Xms20M -Xmx20M -Xmn10M -XX:SurvivorRatio=8 -XX:+UseSerialGC -XX:MaxTenuringThreshold=1
 */
public class TenuringThresholdTest {
    private static final int _1MB = 1024 * 1024;

    public static void main(String[] args) {
        byte[] allocation1 = new byte[_1MB / 4];
        byte[] allocation2 = new byte[4 * _1MB];
        // Eden区放不下了，发起第一次GC，allocation1年龄+1，allocation2因为无法放入Survivor区通过分配担保机制提前进入老年代，allocation3进入新生代Eden区
        byte[] allocation3 = new byte[4 * _1MB];
        allocation3 = null;
        // 发起第二次GC，allocation3被回收，allocation1年龄过大进入老年代，allocation4进入Eden区
        byte[] allocation4 = new byte[4 * _1MB];

    }
}
```
运行结果：

```plain
[GC (Allocation Failure) [DefNew: 5843K->783K(9216K), 0.0062294 secs] 5843K->4879K(19456K), 0.0062786 secs] [Times: user=0.01 sys=0.00, real=0.01 secs] 
[GC (Allocation Failure) [DefNew: 4961K->0K(9216K), 0.0018562 secs] 9057K->4867K(19456K), 0.0018840 secs] [Times: user=0.00 sys=0.00, real=0.00 secs] 
Heap
 def new generation   total 9216K, used 4178K [0x00000007bec00000, 0x00000007bf600000, 0x00000007bf600000)
  eden space 8192K,  51% used [0x00000007bec00000, 0x00000007bf014930, 0x00000007bf400000)
  from space 1024K,   0% used [0x00000007bf400000, 0x00000007bf400228, 0x00000007bf500000)
  to   space 1024K,   0% used [0x00000007bf500000, 0x00000007bf500000, 0x00000007bf600000)
 tenured generation   total 10240K, used 4866K [0x00000007bf600000, 0x00000007c0000000, 0x00000007c0000000)
   the space 10240K,  47% used [0x00000007bf600000, 0x00000007bfac0ae8, 0x00000007bfac0c00, 0x00000007c0000000)
 Metaspace       used 3103K, capacity 4494K, committed 4864K, reserved 1056768K
  class space    used 338K, capacity 386K, committed 512K, reserved 1048576K
```

为了适应不同程序的内存状况，Survivor空间中相同年龄的所有对象大小总和大于Survivor空间的一半，年龄大于或等于该年龄的对象就可以直接进入老年代，无须等到“-XX:MaxTenuringThreshold”设置要求的年龄。