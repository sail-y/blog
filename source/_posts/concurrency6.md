---
title: 并发编程6-任务执行
date: 2016-12-13 09:13:36
tags: [java, 并发]
categories: 并发
---

# 任务执行
任务通常是一些抽象的且离散的工作单元。通过把应用程序的工作分解到多个任务中，可以简化程序的组织结构

## 在线程中执行任务

在理想情况下，各个任务之间是相互独立的：任务并不依赖其他任务的状态、结果或边界效应。独立性有助于实现并发，例如向web服务器提交一个请求，不会影响正在处理的其他请求。

### 为任务创建线程

如果为每一个任务都创建一个线程，那么资源开销是极大的，无限制的创建线程存在一些缺陷：

* 线程生命周期的开销非常高
* 资源消耗
* 稳定性
<!--more-->
## Executor框架

```java
public interface Executor {
	void execute(Runnable command);
}
```
Executor基于生产者-消费者模式，提交任务的操作相当于生产者（生成待完成的工作单元），执行任务的线程则相当于消费者（执行完这些工作单元）。

每当看到下面这种形式的代码时：

	new Thread(runnable).start();
	
并且你希望获得一种更灵活的执行策略时，请考虑使用Executor来代替Thread。

### 线程池

线程池从字面意思来看，是指管理一组同构工作线程的资源池。

在线程池中执行任务比「为每一个任务分配一个线程」优势更多。通过重用现有的线程而不是创建新线程，可以在处理多个请求时分摊在线程创建和销毁过程中产生的巨大开销。另外一个额外的好处死，当请求到达时，工作线程通常已经存在，因此不会由于等待创建线程而延迟任务的执行，从而提高了响应性。

Executors中的静态工厂方法提供了一些线程池：

* newFixedThreadPool
* newCachedThreadPool
* newSingleThreadExecutor
* newScheduledThreadPool

### Executor的生命周期

ExecutorService提供了一些用于生命周期管理的方法。

```java
public interface ExecutorService extends Executor {
    void shutdown();
    List<Runnable> shutdownNow();  
    boolean isShutdown();
    boolean isTerminated();
    boolean awaitTermination(long timeout, TimeUnit unit)
        throws InterruptedException;
    <T> Future<T> submit(Callable<T> task);
    <T> Future<T> submit(Runnable task, T result);
    Future<?> submit(Runnable task);
    <T> T invokeAny(Collection<? extends Callable<T>> tasks,
                    long timeout, TimeUnit unit)
        throws InterruptedException, ExecutionException, TimeoutException;
}

```

ExecutorService的生命周期有3种状态：运行、关闭和已终止。ExecutorService在初始创建时处于运行状态。shotdown方法将执行平缓的关闭过程：不再接受新的任务，同事等待已经提交的任务执行完成--包括那些还未开始执行的任务。shotdownNow方法将执行粗暴的关闭过程：它将尝试取消所有运行中的任务，并且不再启动队列中尚未开始执行的任务。

### 延迟任务与周期任务
Timer类负责管理延迟任务以及周期任务。然而，Timer存在一些缺陷，因此应该考虑使用ScheduledThreadPoolExecutor来代替它。

### 携带结果的任务Callable与Future
Callable：它人为主入口点将返回一个值，并可能抛出一个异常。Future表示一个任务的生命周期，并提供相应的方法来判断是否已经完成或取消，以及获取任务的结果和取消任务等。

可以通过许多种方法创建一个Future来描述任务。ExecutorService中的所有submit方法都将反悔一个Future，从而将一个Runnable或Callable提交给Executor，并得到一个Future用来获得任务的执行结果或者取消任务。

### CompletionService与BlockingQueue
CompletionService将Executor和BlockingQueue的功能融合在一起。你可以将Callable任务提交给它来执行，然后使用类似于队列操作的take和poll等方法来获得已完成的结果，而这些结果会在完成时将被封装为Future。ExecutorCompletionService实现了CompletionService，并将计算部分委托给一个Executor。

## 小结

通过围绕任务执行来设计应用程序，可以简化开发过程，并有助于实现并发。Executor框架将任务提交与执行策略解耦开来，同时还支持多重不同类型的执行策略。当需要创建线程来执行任务时，可以考虑使用Executor。要想在将应用程序分解为不同的任务时获得最大的好处，必须定义清晰的任务边界。某些应用程序中存在着比较明显的任务边界，而在其他一些程序中则需要进一步分析才能揭示出粒度更细的并行性。
