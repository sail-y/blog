title: JVM6-虚拟机性能监控与故障处理工具
date: 2016-11-02 15:24:35
tags: [java,JVM]
categories: JVM
---

给一个系统定位问题的时候，知识、经验是关键基础，数据是依据，工具是运用知识处理数据的手段。这里说的数据包括：运行日志、异常堆栈、GC日志、线程快照(threaddump/javacore文件)、堆转储快照(heapdump/hprof文件)等。经常使用适当的虚拟机监控和分析的工具可以加快我们分析数据、定位问题的速度。

## JDK的命令行工具
JDK的安装目录bin下提供了很多工具，这些工具其实是jdk/lib/tools.jar的包装而已。
### jps：虚拟机进城状况工具
jps(JVM Process Status Tool):可以列出正在运行的虚拟机进城，并显示虚拟机执行主类以及这些进城的本地虚拟机唯一ID(Local Virtual Machine IIdentifier, LVMID)，这个LVMID跟系统里的PID是一致的。
<!--more-->
jps命令格式：

	jsp [ options ] [ hostid ]

jps执行样例：

```bash
~ jps -l
772 
15944 sun.tools.jps.Jps
15547 org.jetbrains.jps.cmdline.Launcher
```

|选项  |作用           |
|:---:| :-------------|
| -q  | 只输出LVMID，省略主类的名称|
| -m  | 输出虚拟机进程启动时传递给主类main()函数的参数|
| -l  | 输出主类的全名，如果进城执行的是Jar包，输出Jar包路径|
| -v  | 输出虚拟机进城启动时JVM参数|

### jstat：虚拟机统计信息监视工具
jstat(JVM Statistics Monitoring Tool)是用于监视虚拟机各种运行状态的命令行工具。它可以显示本地或者远程虚拟机进程中的类装载、内存、垃圾手机、JIT编译等运行数据。

jstat命令格式为：

	jstat [ option vmid [ interval [ s | ms ] [ count ] ] ]
	
对本机来说`vmid`就是`LVMID`。interval和count表示间隔和次数，省略表示只查询1次。

|选项           |作用           |
|:------------:| :-------------|
| -class  | 监视类装载、卸载数量、总空间以及类装载所耗费的时间|
| -gc  | 监视Java堆状况，包括Eden区、两个Survivor区、、老年代、永久带等的容量、已用空间、GC时间合计等信息|
| -gccapacity  | 监视内容基本与-gc相同，但输出主要关注Java堆各个区域使用到的最大、最小空间|
| -gccause  | 与-gcutil功能一样，但是会额外输出导致上一次GC产生的原因|
| -gcnew|监视新生代GC状况|
| -gcnewcapacity|监视内容基本与-gcnew相同，但输出主要关注使用到的最大、最小空间|
| -gcold|	监视老年代GC状况|
| -gcoldcapacity|监视内容基本与-gcold相同，但输出主要关注使用到的最大、最小空间|
| -gcpermcapacity|输出永久代使用到的最大、最小空间|
| -compiler|输出JIT编译器编译过的方法、耗时等信息|
| 	-printcompilation	|输出已经被JIT编译的方法|

jstat执行样例：

```bash
~ jstat -gcutil 15547 1000 3
  S0     S1     E      O      M     CCS    YGC     YGCT    FGC    FGCT     GCT   
 74.83   0.00   2.40   0.09  98.65  95.48      2    0.013     0    0.000    0.013
 74.83   0.00   2.40   0.09  98.65  95.48      2    0.013     0    0.000    0.013
 74.83   0.00   2.40   0.09  98.65  95.48      2    0.013     0    0.000    0.013
```
这里就是每隔1000毫秒，一共执行3次，查询LVMID为15547的gcutil信息。
显示空间占用总空间的百分比，S0和S1就是2个Survivor区，E是Eden，O是Old老年代，M表示MetaSpace(JDK8中的元数据区)。YGC(Young GC)和FGC(Full GC)显示的是GC的次数。FGCT和GCT是时间，

### jinfo：Java配置信息工具
jinfo(Configuration Info for Java)的作用是实时地查看和调整虚拟机各项参数。使用jps命令的-v可以查看虚拟机启动时显式指定的参数列表，但如果想知道未被显式指定的参数的系统默认值，可以使用jinfo的`-flag`选项进行查询，jinfo还可以使用`-sysprops`选项把虚拟机进程的`System.getProperties()`的内容打印出来，它还有在运行期修改虚拟机参数的能力。
jinfo命令格式：
	
	jinfo [ option ] pid

执行样例：

```bash
~ jinfo -flag CMSInitiatingOccupancyFraction 15547 
-XX:CMSInitiatingOccupancyFraction=-1
```
>注意jinfo对windows只提供了-flag选项

### jmap：Java内存映射工具
jmap(Memory Map for Java)命令用于声称堆转储快照（一般称为heapdump或dump文件）。不用命令要想获取Java堆转储快照，可以使用“-XX:+HeapDumpOnOutOfMemoryError”参数，可以让虚拟机在OOM异常出现之后自动生成dump文件，Linux命令下可以通过kill -3发送进程退出信号也能拿到dump文件。


jmap的作用并不仅仅是为了获取dump文件，它还可以查询finalize执行队列、Java堆和永久代的详细信息，如空间使用率、当前使用的是哪种收集器等。和jinfo一样，jmap有不少功能在Windows平台下也是受限制的，除了生成dump文件的-dump选项和用于查看每个类的实例、空间占用统计的-histo选项在所有操作系统都提供之外，其余选项都只能在Linux和Solaris系统下使用。

jmap命令格式：

	jmap [ option ] vmid

|选项           |作用           |
|:------------:| :-------------|
|-dump	        |生成Java堆转储快照。格式为-dump:[live, ]format=b,file=<filename>，其中live自参数说明是否只dump出存活的对象|
|-finalizerinfo	|显示在F-Queue中等待Finalizer线程执行finalize方法的对象。只在Linux和Solaris系统下有效|
|-heap	        |显示Java堆详细信息，如使用哪种收集器、参数配置、分代状况等。只在Linux和Solaris系统下有效|
|-histo	        |显示堆中对象统计信息，包括类、实例数量、合计容量|
|-permstat	    |以ClassLoader为统计口径显示永久代内存状态。只在Linux和Solaris系统下有效|
|-F	            |当虚拟机进行对-dump选项没有响应时，可使用这个选项强制生成dump快照。只在Linux和Solaris系统下有效||

jmap生成dump文件：

```bash
~ jmap -dump:format=b,file=idea.bin 15547
Dumping heap to /Users/xiaomai/idea.bin ...
Heap dump file created
```

### jhat：虚拟机堆转储快照分析工具
jhat(JVM Heap Analysis Tool)是与jmap搭配使用的。实际工作中很少用到，比较简陋。分析一下刚才生成的dump文件：

```bash
~ jhat idea.bin
Reading from idea.bin...
Dump file created Wed Nov 02 16:55:47 CST 2016
Snapshot read, resolving...
Resolving 63292 objects...
Chasing references, expect 12 dots............
Eliminating duplicate references............
Snapshot resolved.
Started HTTP server on port 7000
Server is ready.
```

![](http://7xs4nh.com1.z0.glb.clouddn.com/8E34846A-29FF-4342-A1DE-81817C327574.png)

### jstack：Java堆栈跟踪工具
jstack(Sstack Trace for Java)命令用于生成虚拟机当前时刻的线程快照(一般称为threaddump或者javacore文件)。『线程快照』就是当前虚拟机内每一条线程正在执行的方法堆栈的集合，生成线程快照的主要目的是定位线程出现长时间停顿的原因，如线程死锁、死循环、请求外部资源导致的长时间等待。

	jstack [ option ] vmid

|选项           |作用           |
|:------------:| :-------------|
|-F	|当正常输出的请求不被响应时，强制输出线程堆栈|
|-l	|除堆栈外，显示关于锁的附加信息|
|-m	|如果调用到本地方法的时候，可以显示C/C++的堆栈|

下面展示部分输出：

```bash
~ jstack -l 15547
2016-11-02 17:36:52
Full thread dump Java HotSpot(TM) 64-Bit Server VM (25.31-b07 mixed mode):

"Attach Listener" #13 daemon prio=9 os_prio=31 tid=0x00007f9492316000 nid=0x3f0b waiting on condition [0x0000000000000000]
   java.lang.Thread.State: RUNNABLE

   Locked ownable synchronizers:
	- None

"NettythreadDeathWatcher-2-1" #12 daemon prio=1 os_prio=31 tid=0x00007f9491346800 nid=0x5103 waiting on condition [0x00007000061e2000]
   java.lang.Thread.State: TIMED_WAITING (sleeping)
	at java.lang.Thread.sleep(Native Method)
	at io.netty.util.ThreadDeathWatcher$Watcher.run(ThreadDeathWatcher.java:147)
	at io.netty.util.concurrent.DefaultThreadFactory$DefaultRunnableDecorator.run(DefaultThreadFactory.java:145)
	at java.lang.Thread.run(Thread.java:745)

   Locked ownable synchronizers:
	- None
```

## JDK可视化工具
jdk/bin下还有两个可视化工具。
### JConsole：Java监视与管理平台

### VisualVM：多合一故障处理工具
是到目前为止随JDK发布的功能最为强大的运行监视和故障处理工具，除了最基本的运行监视、 故障处理外，还有性能分析的功能，且十分强大。Visual VM还有一个很大的优点，它对应用程序的实际性能影响很小，使得它可以直接应用在生产环境中。VisualVM需要安装一些插件，才能强大的使用，否则就跟没有安装软件的操作系统一样。