---
title: 并发编程7-取消与关闭
date: 2016-12-14 10:51:20
tags: [java, 并发]
categories: 并发
---

# 取消与关闭

任务和线程的启动很容易。在大多数时候，我们都会让它们运行直到结束，或者让它们自行停止。然而，有时候我们希望提前结束任务或线程，或许是因为用户取消了操作，或者应用程序需要被快速关闭。

## 任务取消
在Java中没有一种安全的抢占式方法来停止线程，因此也就没有安全的抢占式方法来停止任务。只有一些协作式的机制，使请求取消的任务和代码都遵循一种协商好的协议。

```java
private volatile boolean cancelled;

public void run() {
	while(!cancelled){
		// do something
	}
}
```
<!--more-->

## 中断
一些特殊的阻塞库的方法支持中断。线程中断是一种协作机制，线程可以通过这种机制来通知另一个线程，告诉它在合适的或者可能的情况下轻质当前工作，并转而执行其他的工作。

在Java的API或语言规范中，并没有将中断与任何取消语义关联起来，但实际上，如果在取消之外的其他操作中使用中断，那么都是不合适的，并且很难职称起更大的应用。

每个线程都有一个boolean类型的中断状态。当中断线程时，这个线程的中断状态将设置为true。在Thread中包含了中断线程以及查询中断状态的方法。interrupt方法能中断目标线程，isInterrupted方法能返回目标线程的中断状态。静态方法interrupted将清除当前线程的中断状态，并返回它之前的值，这也是清除中断状态的唯一方法。

```java
public class Thread(){
	public void interrupt() {...}
	public boolean isInterrupted() {...}
	public static boolean interrupted() {...}
}
```

调用interrupt并不意味着立即停止目标线程正在进行的工作，而只是传递了请求中断的消息。

### 中断策略
正如任务中应该包含取消策略一样，线程同样应该包含中断策略。中断策略规定线程如何解释某个中断请求-当发现中断请求时，应该做哪些工作。由于每个线程拥有各自的中断策略，因此除非你知道中断对该线程的含义，否则就不应该中断这个线程。


### 响应中断
当调用可中断的阻塞函数时，例如Thread.sleep或BlockingQueue.put等，有两种实用策略可用于处理InterruptedException:

* 传递异常，从而使你的方法也成为可中断的阻塞方法
* 恢复中断方法，从而使调用栈中的上层代码能够对进行处理。

只有实现了线程中断策略的代码才可以屏蔽中断请求。在常规的任务和库代码中都不应该屏蔽中断请求。

### 处理不可中断的阻塞
并非所有的可阻塞方法或者阻塞机制都能相应中断；如果一个线程由于执行同步的Socket I/O或者等待获得内置锁而阻塞，那么中断请求只能设置线程的中断状态，除此之外没有其他任何作用。对于那些由于执行补课中断操作而被阻塞的线程，可以使用类似于中断的手段来停止这些线程，但这要求我们必须知道线程阻塞的原因。

## 停止基于线程的服务
应用程序通常会创建拥有多个线程的服务，例如线程池，并且这些服务的生命周期通常比创建它们的方法的生命周期更长。如果应用程序准备退出，那么这些服务所拥有的线程也需要结束。由于无法通过抢占式的方法来停止线程，因此它们需要自行结束。

除非拥有某个线程，否则不能对该线程进行操控。对于持有线程的服务，只要服务的存在时间大于创建线程的方法的存在时间，那么就应该提供生命周期方法。

例如日志服务，为了不给程序带来性能开销，记录日志的操作有一种方法是通过调用log方法将日志消息放入某个队列中，并由其他线程来处理。然后我们要合理的处理这个日志队列，避免因为JVM无法正常关闭时，停止日志线程导致消息丢失。

### 关闭ExecutorService
ExecutorService提供两种关闭方法：使用shutdown正常关闭，以及使用shutdownNow强行关闭。在进行强行关闭时，shutdownNow首先关闭当前正在执行的任务，然后返回所有尚未启动的任务清单。

这两种关闭方式的差别在于各自的安全性和响应性：强行关闭的速度更快，但风险也更大，因为任务很可能在执行到一半时被结束；而正常关闭虽然速度慢，但却更安全，因为ExecutorService会一直等到队列中的所有任务都执行完成后才关闭。在其他拥有线程的服务中也应该考虑提供累死的关闭方式以供选择。

### shutdownNow的局限性
当通过shutdownNow来强行关闭ExecutorService时，它会尝试取消正在执行的任务，并返回所有已提交但尚未开始的任务，从而将这些任务写入日志或者保存起来以便之后进行处理。

然而，我们无法通过常规方法来找出哪些任务已经开始但尚未结束。这意味着我们无法在关闭过程中知道正在执行的任务的状态，除非任务本身会执行某种检查。要知道哪些任务还没有完成，你不仅需要知道哪些任务还没有开始，而且还需要知道当Executor关闭时哪些任务正在执行。

### 未捕获的异常
当线程内代码抛出RuntimeException时，Thread API提供了uncaughtExceptionHanlder，它能检测出某个线程由于未捕获的异常而终结的情况。

```java

public class CaptureUncaughtException {
    public static void main(String[] args) {
        ExecutorService executorService = Executors.newCachedThreadPool(new HandlerThreadFactory());
        executorService.execute(new ExceptionThread2());
    }
}

class ExceptionThread2 implements Runnable {
    @Override
    public void run() {
        Thread t = Thread.currentThread();
        System.out.println("run() by " + t);
        System.out.println("eh = " + t.getUncaughtExceptionHandler());
        throw new RuntimeException();
    }
}

class MyUncaughtExceptionHandler implements Thread.UncaughtExceptionHandler {
    @Override
    public void uncaughtException(Thread t, Throwable e) {
        System.out.println("caught " + e);
    }
}

class HandlerThreadFactory implements ThreadFactory {

    @Override
    public Thread newThread(Runnable r) {
        System.out.println(this + " creating new Thread");
        Thread t = new Thread(r);
        System.out.println("created " + t);
        t.setUncaughtExceptionHandler(new MyUncaughtExceptionHandler());
        System.out.println("eh = " + t.getUncaughtExceptionHandler());
        return t;
    }
}

```
## JVM关闭

JVM既可以正常关闭，也可以强行关闭。

### 关闭钩子
在正常关闭中，JVM首先调用所有已注册的关闭钩子。关闭钩子是指通过Runtime.addShutdownHook注册的但尚未开始的线程。JVM并不能保证关闭钩子的调用顺序。在关闭应用程序线程时，如果有（守护或非守护）线程仍然在运行，那么这些线程接下来将与关闭进程并发执行。当所有的关闭钩子都执行结束时，如果runFinalizersOnExit为true，那么JVM将运行终结器，然后再停止。JVM并不会停止或中断任何在关闭时仍然运行的应用程序线程。当JVM最终结束时，这些线程将被强行结束。如果关闭钩子或终结器没有执行完成，那么正常关闭进行“挂起”并且JVM必须被强行关闭。当被强行关闭时，只是关闭JVM，而不会运行关闭钩子。

### 守护线程
线程可分为两种：普通线程和守护线程。在JVM启动时创建的所有线程中，除了主线程以外，其他的线程都是守护线程（例如垃圾回收器以及其他执行辅助工作的线程）。当创建一个新线程时，新线程将继承创建它的线程的守护状态，因此在默认情况下，主线程创建的所有线程都是普通线程。

普通线程与守护线程之间的差异仅在于当线程退出时发生的操作。当一个线程退出时，JVM会检查其他正在运行的线程，如果这些线程都是守护线程，那么JVM会正常退出操作。当JVM停止时，所有仍然存在的守护线程都将被抛弃----既不会执行finally代码块，也不会执行回卷栈，而JVM只是退出。我们应尽可能少地使用守护线程。

### 终结器
finalize方法就是终结器，JVM并不保证何时运行甚至是否运行，应该避免使用终结器。

## 小结
在任务、线程、服务以及应用程序等模块中的生命周期结束问题，可能会增加它们在设计和实现时的复杂性。Java并没有提供某种抢占式的机制来取消操作或者终结线程。相反，它提供了一种协作式的中断机制来实现取消操作，但这要依赖于如何构建取消操作的协议，以及能否始终遵循这些协议。通过FutureTask和Executor框架，可以帮助我们构建可取消的任务和服务。
