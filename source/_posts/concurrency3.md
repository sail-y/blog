---
title: 并发编程3-对象的共享
date: 2016-12-05 10:19:32
tags: [java, 并发]
categories: 并发
---

# 对象的共享

要编写正确的并发程序，管关键问题在于：在访问共享的可变状态时需要进行正确的管理。本章介绍如何共享和发布对象，从而使它们能够安全地由多个线程同时访问。

## 可见性
「可见性」是指当一条线程修改了这个变量的值，新值对于其他线程来说是可以立即得知的。而普通变量做不到这一点，普通变量的值在线程间传递均需要通过主内存来完成，例如线程A修改一个普通变量的值，然后向主内存进行回写，另外一条线程B在线程A回写完成了之后再从主内存进行读取操作，新变量值才会对线程B可见。
<!--more-->
Java内存模型的有序性可以总结为一句话，如果在本线程内观察，所有的操作都是有序的；如果在一个线程中观察另一个线程，所有的操作都是无序的。前半句是指「线程内表现为串行的语义」，后半句是指「指令重排序」现象和「工作内存与主内存同步延迟」现象。		
Java语言提供了volatile和synchronized两个关键字来保证线程之间操作的有序性，volatile关键字本身就包含了禁止指令重排序的语义，而synchronized则是由”一个变量在同一时刻只允许一条线程对其进行lock操作”这条规则获得的，这条规则规定了持有同一个锁的两个同步块只能串行地进入。

```java
public class NoVisibility {
	private static boolean ready;
	private static int number;
	
	private static class ReaderThread extends Thread {
		public void run() {
			while (!ready) 
				Thread.yield();
			System.out.println(number);
		}
	}
	
	public static void main(String[] args) {
		new ReaderThread().start();
		number = 42;
		ready = true;
	}
}
```

上面这个例子可能是一个死循环，因为ReaderThread线程可能永远看不到ready的值变化（可见性问题）。还有另外一种情况就是输出了0，因为指令重排序优化的原因，`ready = true`可能会先于`number=42`执行。
>指令重排序优化是指为了使得处理内部的运算单元能尽量被充分利用，处理器可能会对输入代码进行乱序执行优化，处理器会再计算之后将乱序执行的结果重组，保证该结果与顺序执行的结果是一致的，因此如果存在一个计算任务依赖另外一个计算任务的中间结果，那么其顺序性并不能靠代码的先后顺序来保证。

### 失效数据
`NoVisibility`展示了在缺乏同步的程序中可能产生错误结果中的一种情况：失效数据。除非在每次访问变量的时候使用同步。
### 非原子的64位操作
因为double和long是64位数据，内存模型允许虚拟机将没有被volatile修饰的64位数据的读写操作划分为两次32为的操作来进行。
如果有多个线程共享一个并未声明为volatile的long或double类型的变量，并且同时对它们进行读取和修改操作，那么某些线程可能会读取到一个既非原值，也不是其他线程修改的值代表了「半个变量」的数值。不过这很罕见，因为目前的商用虚拟机几乎都还是选择把64位数据的读写作为原子操作来对待，所以我们写代码一般也不需要对long和double变量专门声明为volatile。
### 加锁与可见性
**synchronized和final**关键字能实现可见性，synchronized的可见性是由「对一个变量执行unlock操作之前，必须先把此变量同步回主内存中」这条规则获得的。另外，final关键字也可以实现可见性，因为被final修饰的字段在构造器中一旦初始化完成，并且构造器没有把this传递出去，那在其他线程中就能看见final字段的值。
>加锁的含义不仅仅局限于互斥行为，还包括内存可见性。为了确保所有线程都能看到共享变量的最新值，所有执行读操作或者写操作的线程都必须在同一个锁上同步。

### Volatile变量
Java内存模型是通过在变量修改后将新值同步回主内存，在变量读取前从主内存刷新变量值这种依赖主内存作为传递媒介来实现可见性的，无论是普通变量还是volatile变量都是如此，普通变量与volatile变量的区别是，volatile的特殊规则保证了新值能立即同步到主内存，以及每次使用前立即从主内存刷新。因此，可以说volatile保证了多线程时操作变量的可见性，而普通变量则不能保证这一点。
volatile变量通常用做某个操作完成、发生中断或者状态的标志。
>注意：加锁机制即可以确保可见性又可以确保原子性，而volatile变量只能确保可见性。

当且仅当满足以下所有条件时，才应该使用volatile变量：

* 对变量的写入操作不依赖变量的当前值，或者你能确保只有单个线程更新变量的值。
* 该变量不会与其他状态变量一起纳入不变性条件中
* 这种访问变量时不需要加锁

```java
/**
 * Created by YangFan on 2016/10/25 上午10:37.
 * <p/>
 */
class VThread_0 implements Runnable {


    @Override
    public void run() {
        while (VolatileTest.isRunning) {
        }
    }
}


class VThread_1 implements Runnable {


    @Override
    public void run() {
        VolatileTest.isRunning = false;
        System.out.println("stop running");
    }
}

public class VolatileTest {
    public static boolean isRunning = true;

    /*
       这个不是必现，得多试几次
       stop running 后死循环
       在第二个线程更改后，第一个线程并没有马上停止，原因从Java内存模型（JMM）说起。
       根据JMM，Java中有一块主内存，不同的线程有自己的工作内存，同一个变量值在主内存中有一份，如果线程用到了这个变量的话，自己的工作内存中有一份一模一样的拷贝。
       每次进入线程从主内存中拿到变量值，每次执行完线程将变量从工作内存同步回主内存中。
       出现打印结果现象的原因就是主内存和工作内存中数据的不同步造成的。
     */

    // 线程安全围绕的是可见性和原子性这两个特性展开的，volatile解决的是变量在多个线程之间的可见性，但是无法保证原子性。
    public static void main(String[] args) throws InterruptedException {
        VThread_0 vThread_0 = new VThread_0();
        VThread_1 vThread_1 = new VThread_1();
        ExecutorService executorService = Executors.newCachedThreadPool();
        executorService.execute(vThread_0);
        executorService.execute(vThread_1);

        executorService.shutdown();
    }
}
```

## 发布与逸出
「发布」的意思是使对象能够在当前作用于之外的代码中使用，当某个不应该发布的对象被发布时，这种情况就被称为「逸出」。		

```java
private Set<Secret> knownSecrets;

public void initialize() {
	knownSecrets = new HashSet<>();
}

public Set<Secret> getKnownSecrets() {
	return knownSecrets;
}
```

上面的代码发布了HashSet对象，但是却导致knownSecrets里的Secret逸出了，因为任何调用者都能修改knownSecrets里的值。

## 线程封闭
当访问共享的可变数据时，通常需要使用同步，一种避免使用同步的方式就是不共享数据，如果仅在单线程内访问数据时，就不需要同步，这种技术被称为线程封闭。Java提供了ThreadLocal类来帮助维持线程封闭性。


## 不变性
不可变对象一定是线程安全的，当满足以下条件时，对象才是不可变的：

* 对象创建以后其状态就不能修改。
* 对象的所有域都是final类型。
* 对象是正确创建的（在对象的创建期间，this对象没有逸出）

## 安全发布的常用模式

要安全的地发布一个对象，对象的引用以及对象的状态必须同时对其他线程可见。一个正确构造的对象可以通过一下方式来安全地发布：

* 在静态初始化函数中初始化一个对象引用。
* 将对象的引用保存到volatile类型的域或者AtomicReferance对象中。
* 将对象的引用保存到某个正确构造对象的final类型域中。
* 将对象的引用保存到一个由锁保护的域中。

如果对象从技术上来看是可变的，但其状态在发布后不会在再改变，那么把这种对象称为「**事实不可变对象**」，在没有额外的同步情况下，任何线程都可以安全地使用被安全发布的事实不可变对象。

对象的发布需求取决于它的可变性：

* 不可变对象可以通过任意机制来发布。
* 事实不可变对象必须通过安全方式来发布。
* 可变对象必须通过安全方式来发布，并且必须是线程安全的或者由某个锁保护起来。

在并发程序中使用和共享对象时，可以使用一些实用的策略，包括：

* **线程封闭**：线程封闭的对象只能由一个线程拥有，对象被封闭在该线程中，并且只能由这个线程修改。
* **只读共享**：在没有额外同步的情况下，共享的只读对象可以由多个线程并发访问，但任何线程都不能修改它。共享的只读对象包括不可变对象和事实不可变对象。
* **线程安全共享**：线程安全的对象在其内部实现同步，因此多个线程可以通过对象的公有接口来进行访问而不需要进一步的同步。
* **保护对象**：被保护的对象只能通过持有特定的锁来访问。保护对象包括封装在其他线程安全对象中的对象，以及已发布的并且由某个特定锁保护的对象。