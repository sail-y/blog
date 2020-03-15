---
title: JDK8-比较器Comparator
date: 2017-02-26 11:08:13
tags: [java,jdk8]
categories: jdk8
---

### 比较器详解

关于比较器我们经常在排序的时候用到，按照某个属性排序。比如我们按照学生的成绩排序，如果成绩相等呢，我们再按照姓名排序。

在Java 8中，Comparator新增了不少默认方法以及静态方法，我们要把这些东西用起来。
<!--more-->
看看示例代码

```java
public class MyComparatorTest {

    public static void main(String[] args) {
        List<String> list = Arrays.asList("nihao", "hello", "world", "welcome");

        // 字符串长度升序
        list.sort((item1, item2) -> item1.length() - item2.length());
        
        
        list.sort(Comparator.comparingInt(String::length));
        //这行代码会报错
        list.sort(Comparator.comparingInt(o -> o.length()).reversed());
        // 字符串长度降序
        list.sort(Comparator.comparingInt(String::length).reversed());

        System.out.println(list);
    }
}

```
我们看一下为什么list.sort(Comparator.comparingInt(o -> o.length()).reversed());
会报错呢？其实改成list.sort(Comparator.comparingInt((String o) -> o.length()).reversed());，我们主动加上lambda表达式的类型声明，也是可以的，这是因为Java的类型推断，只能推断一层，我们看comparingInt的参数泛型是<? super T>，而reversed()方法才是最后调用的一个方法，所以Java就只能推断出reversed()方法泛型是什么。而推断不出Comparator.comparingInt的参数泛型应该是什么了。
所以这个例子如果我们去掉reversed方法，list.sort(Comparator.comparingInt(o -> o.length());这样写也是可以正常运行的。

接着看thenComparing方法，解读一下文档，说的就是只在第一个比较器比较的结果是相等的时候，才会执行第二个执行比较器，如果不相等的话，那么第二个比较器是不会执行的。

```java
list.sort(Comparator.comparingInt(String::length).thenComparing(String.CASE_INSENSITIVE_ORDER));
```

