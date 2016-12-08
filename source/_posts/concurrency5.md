---
title: 并发编程5-基础构建模块
date: 2016-12-08 09:45:43
tags: [java, 并发]
categories: 并发
---

# 基础构建模块

第4章介绍了构造线程安全类时采用的一些技术，例如将线程安全性委托给现有的线程安全类。委托是创建线程安全类的一个最有效的策略：只需让现有的线程安全类管理所有的状态即可。
下面将介绍一些JDK提供的工具类。

## 同步容器类
同步容器类包括Vector和Hashtable。这些类实现线程安全的方式是：将它们的状态封装起来，并对每个共有方法都进行同步，使得每次只有一个线程能访问容器的状态。

### 同步容器类的问题
同步容器类都是线程安全的，但在某些情况下需要加锁来保护复合操作。例如2个线程都在进行「若没有，则添加」的运算，如果没有对这个复合操作加锁，就可能会出问题。
<!--more-->
### 迭代器与ConcurrentModificationException
无论是迭代还是foreach循环，当它们发现容器在迭代过程中被修改时，就会抛出ConcurrentModificationException异常。		
如果不希望在迭代期间对容器加锁，有一种替代方法就是「克隆」容器，并在副本中进行迭代。

### 隐藏迭代器
虽然加锁可以防止迭代器抛出ConcurrentModificationException，但是必须在所有对共享容器进行迭代的地方都需要加锁。还有一个很隐蔽的迭代器，就是没有显式的迭代器，但是实际上也执行了迭代操作，那就是编译器会将字符串的连接操作转化为StringBuilder.append，而这个方法会调用容器的toString方法，标准容器的toString方法会迭代容器。
```java
Set<Integer> set = new HashSet<>();
System.out.println(set);
```
如果在输出期间对容器进行了修改，就会抛出异常。

## 并发容器
JDK5提供了多种并发容器类来改进同步容器的性能。因为同步容器对所有容器状态的访问都串行化，降低了并发性，性能不太好。
通过并发容器来代替同步容器，可以极大的提高伸缩性并降低防线。例如ConcurentHashMap和CopyOnWriteArrayList。		
BlockingQueue提供可阻塞的插入和获取操作。如果队列为空，那么获取元素的操作将一直阻塞，直到队列中出现一个可用的元素。如果队列已满，那么插入元素的操作将一直阻塞，直到队列中出现可用的空间。

### ConcurrentHashMap
同步容器类在执行每个操作期间都持有一个锁，HashMap的键值对是通过单向链表来实现的，当遍历很长的链表并且在某些或者全部元素上调用equals方法时，会耗费很长时间，而其他线程在这段时间内都不能访问该容器。		
ConcurrentHashMap与HashMap一样也是一个基于散列的Map，它使用了一种**分段锁**的机制来实现更大程度的共享，而不是将每个方法都进行同步。这样执行写入操作的线程可以并发地访问Map。它提供的迭代器也不会抛出ConcurrentModificationException，因此不需要在迭代的时候加锁。

ConcurrentHashMap将一些常见的复合操作实现为了原子操作，例如putIfAbsent,remove,replace等。

### CopyOnWriteArrayList
CopyOnWriteArrayList用于替代同步List，在某些情况下它提供了更好的并发性能，并且在迭代期间不需要对容器进行加锁或复制。
CopyOnWriteArrayList底层用基础数组实现，不会被修改，可以随意并发的访问。不过显然每当修改容器的时候会复制底层数组，这会造成一定的开销。仅当迭代操作远远多余修改操作时，才应该使用这个容器。		
这个容器适用于许多事件通知系统：分发通知时迭代监听器，并调用。而注册或者注销监听器的操作则较少。

## 阻塞队列和生产者-消费者模式
刚才提到BlockingQueue提供可阻塞的put和take操作。阻塞队列支持生产者-消费者这种设计模式。该模式将「找出需要完成的工作」与「执行工作」这两个过程分离开来，并把工作放入一个「待完成」的列表以便在随后处理。在基于阻塞队列构建的生产者-消费者设计中，当数据生成时，生产者把数据放入队列，而当消费者准备处理数据时，将从队列中获取数据。

```java
public class BlockingQueueTest {
    public static void main(String[] args) {
        final BlockingQueue<String> bq = new ArrayBlockingQueue<String>(10);
        ExecutorService executorService = Executors.newCachedThreadPool();
        executorService.execute(() -> {
            int i = 0;
            while (true) {
                System.out.println("produce " + i++);
                try {
                    bq.put(i + "");
                    TimeUnit.SECONDS.sleep(1);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }

            }
        });

        executorService.execute(() -> {
            while (true) {

                try {
                    String take = bq.take();
                    System.out.println("take " + take);
                    TimeUnit.SECONDS.sleep(3);

                } catch (InterruptedException e) {
                    e.printStackTrace();
                }

            }
        });

        executorService.shutdown();

    }
}
```

但需要注意的是我们应该用有界队列，因此如果消费者处理速度较慢，队列可能会将耗尽内存。在构建高可靠的应用程序时，有界队列是一种强大的资源管理工具：它们能抑制并防止产生过多的工作项，使应用程序在负荷过载的情况秀爱变得更加健壮。

### 串行线程封闭
对于可变对象，生产者-消费者这种设计与阻塞队列一起，促进了串行线程封闭，从而将对象所有权从生产者缴费给消费者。线程封闭对象只能由单个线程拥有，但可以通过安全地发布该对象来「转移」所有权。

### 双端队列
JDK6还增加了两种容器类型，Deque和BlockingDeque。Deque是一个双端队列，实现了在队列头和队列尾的高效插入和移除。具体实现包括ArrayDeque和LinkedBlockingDeque。

## 阻塞方法与中断方法
线程可能会阻塞或者暂停执行，等待I/O操作，等待锁等。简单举例就是Thread.sleep()。
当某方法会抛出InterruptedException时，表示该方法是一个阻塞方法，如果这个方法被中断，那么它将努力提前结束阻塞状态。		
Thread提供了interrupt方法，用于中断线程或者查询线程是否已经被中断。每个线程都有一个布尔类型的属性，表示线程的中断状态，当中断线程时将设置这个值。		
我们看源码就知道，interrupt()只是将interrupt的标记设置一下而已，interrupt0()是一个native方法。具体什么时候中断，JDK并不保证。

```java
public void interrupt() {
        if (this != Thread.currentThread())
            checkAccess();

        synchronized (blockerLock) {
            Interruptible b = blocker;
            if (b != null) {
                interrupt0();           // Just to set the interrupt flag
                b.interrupt(this);
                return;
            }
        }
        interrupt0();
    }
```

看个例子：

```java
/**
 * Created by YangFan on 2016/10/26 下午4:17.
 * <p/>
 * 中断机制是一种协作机制，也就是说通过中断并不能直接终止另一个线程，而需要被中断的线程自己处理。
 */
public class InterruptTest {
    public static void main(String[] args) {
        ExecutorService executorService = Executors.newCachedThreadPool();
        executorService.execute(() -> {
            while (!Thread.currentThread().isInterrupted()) {
                System.out.println("running");
            }
        });

        executorService.shutdownNow();
    }
}

```

## 同步工具类
下面介绍一些并发包的同步工具类，它们封装了一些状态，这些状态将决定执行同步工具类的线程是继续执行还是等待，此外还提供了一些方法对状态进行操作，以及另一些方法用于高效地等待同步工具类进入到预期状态，这些类有CountDownLatch、Semaphore和Barrier等。

### CountDownLatch
Latch可以延迟线程的进度直到其到达终止状态。它的作用相当于一扇门：在条件达到之前，这扇门是关闭着的，并没有任何线程能通过，直到条件到达结束状态时，这扇门打开并允许所有线程通过。

```java

/**
 * Created by YangFan on 2016/10/26 下午5:10.
 * <p/>
 * CountDownLatch主要提供的机制是当多个（具体数量等于初始化CountDownLatch时count参数的值）线程都达到了预期状态或完成预期工作时触发事件，
 * 其他线程可以等待这个事件来触发自己的后续工作。值得注意的是，CountDownLatch是可以唤醒多个等待的线程的。
 */
public class CountDownLatchTest {
    private static class WorkThread extends Thread {
        private CountDownLatch countDownLatch;
        private int sleepSecond;

        public WorkThread(String name, CountDownLatch countDownLatch, int sleepSecond) {
            super(name);
            this.countDownLatch = countDownLatch;
            this.sleepSecond = sleepSecond;
        }

        @Override
        public void run() {
            try {
                System.out.println(this.getName() + " start: " + LocalDateTime.now());
                TimeUnit.SECONDS.sleep(sleepSecond);
                countDownLatch.countDown();
                System.out.println(this.getName() + " end: " + LocalDateTime.now());
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }

    private static class DoneThread extends Thread {
        private CountDownLatch countDownLatch;

        public DoneThread(String name, CountDownLatch countDownLatch) {
            super(name);
            this.countDownLatch = countDownLatch;
        }

        @Override
        public void run() {
            try {
                System.out.println(this.getName() + " await start:" + LocalDateTime.now());
                countDownLatch.await();
                System.out.println(this.getName() + " await end:" + LocalDateTime.now());
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }


    // CountDownLatch指定3次调用，无论前面有多少线程await，都需要等待CountDownLatch调用3次countDown()统一唤醒
    public static void main(String[] args) {
        CountDownLatch countDownLatch = new CountDownLatch(3);
        DoneThread d0 = new DoneThread("DoneThread1", countDownLatch);
        DoneThread d1 = new DoneThread("DoneThread2", countDownLatch);
        d0.start();
        d1.start();

        WorkThread w0 = new WorkThread("WorkThread0", countDownLatch, 2);
        WorkThread w1 = new WorkThread("WorkThread1", countDownLatch, 3);
        WorkThread w2 = new WorkThread("WorkThread2", countDownLatch, 4);
        w0.start();
        w1.start();
        w2.start();
    }
}
```

### FutureTask
FutureTask可以获得线程返回的结果，get方法取决于线程的状态，如果已经完成会直接返回，否则会一直阻塞直到任务执行完成。

```java
/**
 * Created by YangFan on 2016/10/26 下午5:54.
 * <p/>
 */
class CallableThread implements Callable {

    @Override
    public Object call() throws Exception {
        System.out.println("call()");
        TimeUnit.MILLISECONDS.sleep(1500);
        return "123";
    }
}
public class CallableTest {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
        ExecutorService executorService = Executors.newCachedThreadPool();
        Future future = executorService.submit(new CallableThread());
        executorService.shutdown();

        System.out.println(future.get());
//        while (!future.isDone()) {
//            System.out.println(future.get());
//        }
    }
}
```

### Semaphore
Semaphore用来控制同时访问某个特定资源的操作数量，或者同事执行某个指定操作的数量。Semaphore还可以用来实现某种资源池，或者对容器施加边界。		
Semaphore管理着一组虚拟的许可，许可的初始数量可通过构造函数来指定，在执行操作时可以先获得许可，并在使用后释放许可。如果没有许可，那么acquire()将阻塞直到有许可。

```java
/**
 * Created by YangFan on 2016/10/26 下午5:23.
 * <p/>
 * 
 */
public class SemaphoreTest {
    public static void main(String[] args) {
        final Semaphore semaphore = new Semaphore(5);

        ExecutorService executorService = Executors.newCachedThreadPool();
        for (int i = 0; i < 10; i++) {
            executorService.execute(() -> {
                try {
                    semaphore.acquire();
                    System.out.println(Thread.currentThread().getName() + " acquire: " + LocalDateTime.now());
                    TimeUnit.SECONDS.sleep(2);

                } catch (InterruptedException e) {
                    e.printStackTrace();
                }finally {
                    semaphore.release();
                    System.out.println(Thread.currentThread().getName() + " release: " + LocalDateTime.now());
                }
            });
        }
    }
}

```

### CyclicBarrier
CountDownLatch是一次性对象，一旦结束进入终止状态，就不能被重置。CyclicBarrier能阻塞一组线程直到某个事件发生。CyclicBarrier和CountDownLatch的关键区别在于，所有线程必须同时达到CyclicBarrier的条件，才能继续执行。CountDownLatch是等待某个条件或者事件，CyclicBarrier是等待其他线程。例如CountDownLatch是指6点一到大家就可以下班了，而CyclicBarrier是要等大家到齐了才能开会。

```java

/**
 * Created by YangFan on 2016/10/26 下午5:43.
 * <p/>
 * CyclicBarrier从字面理解是指循环屏障，它可以协同多个线程，让多个线程在这个屏障前等待，直到所有线程都达到了这个屏障时，再一起继续执行后面的动作。
 *
 */
class CyclicBarrierThread implements Runnable {
    private CyclicBarrier cyclicBarrier;
    private int sleepSecond;

    public CyclicBarrierThread(CyclicBarrier cyclicBarrier, int sleepSecond) {
        this.cyclicBarrier = cyclicBarrier;
        this.sleepSecond = sleepSecond;
    }

    @Override
    public void run() {
        try {
            System.out.println(Thread.currentThread().getName() + " running");
            TimeUnit.SECONDS.sleep(sleepSecond);
            System.out.println(Thread.currentThread().getName() + " waiting " + LocalDateTime.now());
            cyclicBarrier.await();
            System.out.println(Thread.currentThread().getName() + " end wait " + LocalDateTime.now());
        } catch (InterruptedException e) {
            e.printStackTrace();
        } catch (BrokenBarrierException e) {
            e.printStackTrace();
        }
    }
}

/*
CountDownLatch和CyclicBarrier都是用于多个线程间的协调的，它们二者的几个差别是：

1、CountDownLatch是在多个线程都进行了latch.countDown()后才会触发事件，唤醒await()在latch上的线程，而执行countDown()的线程，
执行完countDown()后会继续自己线程的工作；CyclicBarrier是一个栅栏，用于同步所有调用await()方法的线程，并且等所有线程都到了await()方法时，这些线程才一起返回继续各自的工作

2、另外CountDownLatch和CyclicBarrier的一个差别是，CountDownLatch不能循环使用，计数器减为0就减为0了，不能被重置，CyclicBarrier可以循环使用

3、CountDownLatch可以唤起多条线程的任务，CyclicBarrier只能唤起一条线程的任务

注意，因为使用CyclicBarrier的线程都会阻塞在await方法上，所以在线程池中使用CyclicBarrier时要特别小心，如果线程池的线程过少，那么就会发生死锁了
 */
public class CyclicBarrierTest {


    public static void main(String[] args) {

        Runnable command = () -> System.out.println("I'm coming");
        CyclicBarrier cyclicBarrier = new CyclicBarrier(3, command);
        CyclicBarrierThread t1 = new CyclicBarrierThread(cyclicBarrier, 2);
        CyclicBarrierThread t0 = new CyclicBarrierThread(cyclicBarrier, 2);
        CyclicBarrierThread t2 = new CyclicBarrierThread(cyclicBarrier, 1);
        ExecutorService executorService = Executors.newCachedThreadPool();

        executorService.execute(t1);
        executorService.execute(t0);
        executorService.execute(t2);
        executorService.shutdown();

    }
}

```

## 总结

* 可变状态是至关重要的		
	所有的并发问题都可以归结为如何协调对并发状态的访问。可变状态越少，就越容易保证线程安全性
* 尽量将域声明为final类型，除非需要它们是可变的。
* 不可变对象一定是线程安全的		
	不可变对象能极大地降低并发编程的复杂性。它们更简单而且安全，可以任意共享而无须使用加锁或保护性复制等机制。
* 封装有助于管理复杂性。
	在编写线程安全的程序时，虽然可以将所有数据都保存在全局变量中，但为什么要这样做？将数据封装在对象中，更易于维持不变性条件：将同步机制封装在对象中，更易于遵循同步策略。
* 用锁来保护每个可变变量。
* 当保护同一个不变性中的所有变量时，要使用同一个锁。
* 在执行复合操作期间，要持有锁。
* 如果从多个线程中访问同一个可变变量时没有同步机制，那么程序就会出现问题。
* 不要故作聪明地推断出不需要使用同步。
* 在设计过程中考虑线程安全，或者在文档中明确地指出它不是线程安全的。
* 将同步策略文档化。