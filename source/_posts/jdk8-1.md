---
title: JDK8-Lambda表达式初步与函数式接口
date: 2016-12-19 14:00:37
tags: [java,jdk8]
categories: jdk8
---

# Lambda表达式初步与函数式接口
“Lambda 表达式”(lambda expression)是一个匿名函数，Lambda表达式基于数学中的λ演算得名，直接对应于其中的lambda抽象(lambda abstraction)，是一个匿名函数，即没有函数名的函数。Lambda表达式可以表示闭包（注意和数学传统意义上的不同）。

## 为何需要Lambda表达式

* 在Java中，我们无法将函数作为参数传递给一个方法，也无法声明返回一个函数的方法。
* 在JavaScript中，函数参数一个函数，返回值是另一个函数的情况是非常常见的；JavaScript是一门非常典型的函数式语言。

Java匿名内部类示例：

```java
new Thread(new Runnable() {
    @Override
    public void run() {
        // do something     
    }
});
```
这样写是有点繁琐的，在Java8中可以直接下面这样写

```java
new Thread(() -> {
   // do something     
});
```

在Java8的循环中，我们也可以很方便的使用Lambda表达式。
示例如下：

```java
List<Integer> list = Arrays.assList(1,2,3,4,5);
// foreach语法
for(Integer i : list) {
	System.out.println(i);	
}
// JDK8新增的forEach方法
list.forEach(i -> System.out.println(i));
// 这种只有一行代码，一个参数的调用，我们甚至还可以再简化一点
list.forEach(System.out::println);


```

看forEach的方法源码

```java
default void forEach(Consumer<? super T> action) {
    Objects.requireNonNull(action);
    for (T t : this) {
        action.accept(t);
    }
}

```
接受了一个Consumer参数，这个接口是JDK8新增的一个函数式接口。			
什么是函数式接口？

1. 一个接口，有且只有一个抽象方法，这个接口就称为函数式接口。
2. 如果我们在某个接口上声明了@FunctionalInterface注解，那么编译器就会按照函数式接口的定义来要求该接口。
3. 如果某个接口只有抽象方法，但我们并没有给该接口声明@FunctionalInterface注解，那么编译器依旧会将该接口看做是函数式接口。

```java
@FunctionalInterface
public interface Consumer<T> {

    void accept(T t);

    default Consumer<T> andThen(Consumer<? super T> after) {
        Objects.requireNonNull(after);
        return (T t) -> { accept(t); after.accept(t); };
    }
}
```

我们来试试自己写一个函数式接口。

```java
@FunctionalInterface
interface MyInterface {
    void test();

    // 这个不算抽象方法，因为MyInterface的实现类必然是Object的子类，他会直接继承Object类的实现，实现类依然只需要实现test()方法。
    String toString();
}

public class Test {
    public void myTest(MyInterface myInterface) {
        myInterface.test();
    }

    public static void main(String[] args) {
        Test test = new Test();

        test.myTest(() -> {
            // 这里就是MyInterface.test()方法的实现
            System.out.println("mytest");
        });
    }

}

```

## Lambda表达式的作用

Lambda表达式为Java添加了确实的函数式变成特性，使我们能将函数当作一等公民看待。		
在将函数作为一等公民的语言中，Lambda表达式是类型是函数。但在Java中，Lambda表达式是对象，他们必须依附于一类特别的对象类型----函数式接口（functional interface）。