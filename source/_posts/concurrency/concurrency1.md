title: 并发编程1-介绍
date: 2016-12-01 16:30:50
tags: [java,并发]
categories: 并发
---

在看完了《深入理解Java虚拟机》之后，继续看《Java并发编程实战一书》。
相信在了解虚拟机之后，再来看并发相关知识，能理解得更透彻，书中也讲到，对Java内存模型理解得越深入，就对并发编程掌握得越好。顺道说一下，关于JDK里线程和并发相关类的使用，我主要是通过《Think in Java》学习的，这里就不再介绍基本使用方法了。

## 简介
线程也被称为轻量级进程（这一部分在《深入理解Java虚拟机》中提到过，[点击查看](http://sail-y.github.io/2016/11/25/JVM11/#线程的实现)）。在大多数现代操作系统中， 都是以线程为基本的调度单位，而不是进程。


## 线程的优势
要想充分发挥多处理器系统的强大计算能力，线程可以有效的降低程序的开发和维护成本，同时提升复杂应用程序的性能。
<!--more-->
### 发挥多处理器的强大能力
现在，多处理系统日益普及，个人PC基本上也都是多个处理器了。由于基本的调度单位是线程，因此如果程序中只有一个线程，那么最多只能在一个处理器上运行。在双处理器系统上，单线程的程序只能使用一半的CPU资源，而在拥有100个处理器的系统上将有99%的资源无法使用。多线程程序可以同时在多个处理器上执行，如果设计正确，多线程程序可以通过提高处理器资源的利用率来提升系统吞吐率。

### 建模的简单性
通过使用线程，可以将复杂并且异步的工作流进一步分解为一组简单并且同步的工作流，每个工作流在一个单独的线程中运行，并在特定的同步位置进行交互。例如Servlet，框架负责解决请求管理、线程创建、负载平衡等细节，在正确的时刻将请求分发给正确的应用组件。我们开发的时候的就像在开发单线程程序一样，可以简化组件的开发。

### 异步事件的简化处理
服务器应用程序在接受来自多个远程客户端的请求时，如果为每个连接都分配其各自的线程并且使用同步I/O，那么就会降低这类程序的开发难度。如果某个应用程序请求数据花费时间较长或者阻塞了，在单线程应用程序在阻塞期间所有的请求都会停顿，为了避免这个问题，单线程服务器应用程序必须使用非阻塞I/O，这种I/O的复杂性太远远高于同步I/O，并且很容易出错。然而，如果每个请求都拥有自己的处理线程，那么在处理某个请求时发生的阻塞将不会影响其他请求的处理。

### 响应更灵敏的用户界面
将GUI应用的各种事件放入单独的线程中运行，时间线程能及时地处理界面事件，从而使用户界面具有更高的灵敏度。

## 线程带来的风险

Java对线程的支持其实是一把双刃剑。虽然Java提供了相应的语言和库，以及一种明确的跨平台内存模型，这些工具简化了并发应用程序的开发，但同时也提高了对开发人员的技术要求。

### 安全性问题
线程的安全性是非常复杂的，在没有充足同步的情况下，多个线程的操作执行顺序是不可预测的。由于多个线程要共享相同的内存地址空间，并且是并发运行，因此它们可能会访问或修改其他线程正在使用的变量，要使多线程程序的行为可以预测，必须对共享变量的访问操作进行协同，在Java中提供了各种同步机制来协同这种访问。

### 活跃性问题
当某个操作无法继续执行下去时，就会发生活跃性问题。在串行程序中，活跃性问题的形式之一就是无意中造成的无限循环，从而使循环之后的代码无法得到执行。线程也会带来一些其他活跃性问题，例如死锁，饥饿，以及活锁。

### 性能问题
活跃性意味着某件正确的事情始终会发生，但却不够好。线程带来性能问题就是线程调度带来的开销，还有线程使用共享数据必须使用同步机制，同步机制往往也会抑制编译器做某些优化等问题。


