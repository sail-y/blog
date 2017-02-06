---
title: JDK8-Stream详解
date: 2017-02-05 20:57:07
tags: [java,jdk8]
categories: jdk8
---
# Stream

Java 8 中的 Stream 是对集合（Collection）对象功能的增强，它专注于对集合对象进行各种非常便利、高效的聚合操作（aggregate operation），或者大批量数据操作 (bulk data operation)。Stream API 借助于同样新出现的 Lambda 表达式，极大的提高编程效率和程序可读性。同时它提供串行和并行两种模式进行汇聚操作，并发模式能够充分利用多核处理器的优势，使用 fork/join 并行方式来拆分任务和加速处理过程。通常编写并行代码很难而且容易出错, 但使用 Stream API 无需编写一行多线程的代码，就可以很方便地写出高性能的并发程序。所以说，Java 8 中首次出现的 java.util.stream 是一个函数式语言+多核时代综合影响的产物。

<!--more-->

* Collection提供了新的stream()方法
* 流不存储值，通过管道的方式获取值
* 本质是函数式的，对流的操作会产生一个结果，不过并不会修改底层的数据源，集合可以作为流底层数据源
* 延迟查找，很多流操作（过滤、映射、排序等）都可以延迟实现



Stream 不是集合元素，它不是数据结构并不保存数据，它是有关算法和计算的，它更像一个高级版本的 Iterator。原始版本的 Iterator，用户只能显式地一个一个遍历元素并对其执行某些操作；高级版本的 Stream，用户只要给出需要对其包含的元素执行什么操作，比如 “过滤掉长度大于 10 的字符串”、“获取每个字符串的首字母”等，Stream 会隐式地在内部进行遍历，做出相应的数据转换。
Stream 就如同一个迭代器（Iterator），单向，不可往复，数据只能遍历一次，遍历过一次后即用尽了，就好比流水从面前流过，一去不复返。
而和迭代器又不同的是，Stream 可以并行化操作，迭代器只能命令式地、串行化操作。顾名思义，当使用串行方式去遍历时，每个 item 读完后再读下一个 item。而使用并行去遍历时，数据会被分成多个段，其中每一个都在不同的线程中处理，然后将结果一起输出。Stream 的并行操作依赖于 Java7 中引入的 Fork/Join 框架（JSR166y）来拆分任务和加速处理过程。
流由3部分构成：

1. 源
2. 零个或多个中间操作
3. 终止操作
![](http://www.ibm.com/developerworks/cn/java/j-lo-java8streamapi/img001.png)

流操作的分类：

1. 惰性求值（中间操作）
2. 及早求值（终止操作）

## 创建流的几种方式

```java
public class StreamTest {
    public static void main(String[] args) {
        Stream stream = Stream.of("hello", "world", "hello world");

        String[] strArray = new String[]{"hello", "world", "hello world"};
        Stream stream1 = Stream.of(strArray);
        Stream stream2 = Arrays.stream(strArray);

        List<String> list = Arrays.asList(strArray);
        Stream stream3 = list.stream();
    }
}
```

## 流的简单使用

```java
public class StreamTest2 {
    public static void main(String[] args) {
        IntStream.of(new int[]{5, 6, 7}).forEach(System.out::println);
        System.out.println("--------");
        // 不包含8
        IntStream.range(3, 8).forEach(System.out::println);
        System.out.println("--------");
        // 包含8
        IntStream.rangeClosed(3, 8).forEach(System.out::println);
    }
}
```

## 进一步应用
```java
public class StreamTest3 {
    public static void main(String[] args) {
        List<Integer> list = Arrays.asList(1, 2, 3, 4, 5, 6);

        System.out.println(list.stream().map(i -> 2 * i).reduce(0, Integer::sum));
    }
}

```
### Stream转换为数组和集合
```java
public class StreamTest4 {
    public static void main(String[] args) {
        Stream<String> stream = Stream.of("hello", "world", "hello world");

//        String[] strArray = stream.toArray(i -> new String[i]);
//        Arrays.asList(strArray).forEach(System.out::println);

//        String[] strArray = stream.toArray(String[]::new);
//        Arrays.asList(strArray).forEach(System.out::println);

//        List<String> list = stream.collect(Collectors.toList());
//        list.forEach(System.out::println);

        // 第一个参数是要返回的容器，第二个参数是对每一个结果进行处理，第三个参数是把所有处理过的结果组装进要返回的list
//        List<String> list = stream.collect(() -> new ArrayList(), (theList, item) -> theList.add(item), (theList1, theList2) -> theList1.addAll(theList2));
//        List<String> list = stream.collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
//        list.forEach(System.out::println);

        // 另一个重载的collect方法
//        List<String> list = stream.collect(Collectors.toCollection(ArrayList::new));
//        list.forEach(System.out::println);


        // 转换为Set
//        Set<String> set = stream.collect(Collectors.toCollection(TreeSet::new));
//        set.forEach(System.out::println);

        // 拼接字符串
        String str = stream.collect(Collectors.joining());
        System.out.println(str);
    }
}
```

### map和flatMap
```java
public class StreamTest5 {
    public static void main(String[] args) {
        List<String> list = Arrays.asList("hello", "world", "helloworld", "test");
        list.stream().map(String::toUpperCase).collect(Collectors.toList()).forEach(System.out::println);
        System.out.println("-------------");

        List<Integer> list2 = Arrays.asList(1, 2, 3, 4, 5);
        list2.stream().map(item -> item * item).collect(Collectors.toList()).forEach(System.out::println);
        System.out.println("-------------");

        // flapMap是把流里的List也打开成一整个流
        Stream<List<Integer>> stream = Stream.of(Arrays.asList(1), Arrays.asList(2, 3), Arrays.asList(4, 5, 6));
        stream.flatMap(theList -> theList.stream()).map(item -> item).forEach(System.out::println);


    }
}
```

### 其他方法
```java
public class StreamTest6 {
    public static void main(String[] args) {
//        Stream<String> stream = Stream.generate(UUID.randomUUID()::toString);
//        stream.findFirst().ifPresent(System.out::println);


        // iterate会产生一个无限流，所以要配合limit使用
        Stream<Integer> stream = Stream.iterate(1, item -> item + 2).limit(6);
//        stream.forEach(System.out::println);


        //找出该流中大于2的元素，然后将每个月元素乘以2，然后过滤掉流中的前两个元素，然后再取流中的前两个元素，最后求出流中元素的总和。
        // 1,3,5,7,9,11 结果是32
//        Integer integer = stream.filter(item -> item > 2).mapToInt(item -> item * 2)
//                .skip(2).limit(2).sum();
//        System.out.println(integer);



//        IntSummaryStatistics intSummaryStatistics = stream.filter(item -> item > 2).mapToInt(item -> item * 2)
//                .skip(2).limit(2).summaryStatistics();

//        System.out.println(intSummaryStatistics.getCount());
//        System.out.println(intSummaryStatistics.getMax());
//        System.out.println(intSummaryStatistics.getMin());


//        System.out.println(stream);
//        System.out.println(stream.filter(item -> item > 2));
        // 这句代码会抛异常: stream has already been operated upon or closed
//        System.out.println(stream.distinct());

        // 正确的调用方式如下
        System.out.println(stream);
        Stream<Integer> stream2 = stream.filter(item -> item > 2);
        System.out.println(stream2);
        Stream<Integer> stream3 = stream2.distinct();
        System.out.println(stream3);

    }
}
```

### 中间操作和终止操作本质上的区别

中间操作都会返回一个Stream对象，比如说返回Stream<Integer>。		
终止操作则不会返回Stream类型，可能不返回值，也可能返回其他类型的单个值。

```java
public class StreamTest7 {
    public static void main(String[] args) {
        List<String> list = Arrays.asList("hello", "world", "hello world");

        // map是一个中间操作，是惰性的，在没有遇到终止操作的时候，中间操作是不会执行的
        Stream<String> test = list.stream().map(item -> {
            String result = item.substring(0, 1).toUpperCase() + item.substring(1);
            System.out.println("test");
            return result;
        });

        // 这句代码才会输入map方法中的test
        test.forEach(System.out::println);


    }
}

```

```java
public class StreamTest8 {
    public static void main(String[] args) {
        // 这段代码虽然输出了正确的结果，但是程序不会终止，因为distinct一直在为无限流不停的去重
        IntStream.iterate(0, i -> (i + 1 ) % 2).distinct().limit(6).forEach(System.out::println);
        // 下面才是正确的方式
        IntStream.iterate(0, i -> (i + 1 ) % 2).limit(6).distinct().forEach(System.out::println);

    }
}
```

### 串行流和并行流的区别
Stream 的并行操作依赖于 Java7 中引入的 Fork/Join 框架（JSR166y）来拆分任务和加速处理过程。

```java
public class StreamTest9 {
    public static void main(String[] args) {
        // 准备500w个uuid来用不同的流进行排序
        List<String> list = new ArrayList<>(5000000);

        for (int i = 0; i < 5000000; i++) {
            list.add(UUID.randomUUID().toString());
        }
        System.out.println("开始排序");

        long startTime = System.nanoTime();

        list.stream().sorted().count();
        long endTime = System.nanoTime();

        long millis = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        System.out.println("排序耗时：" + millis);


        startTime = System.nanoTime();

        list.parallelStream().sorted().count();
        endTime = System.nanoTime();

        millis = TimeUnit.NANOSECONDS.toMillis(endTime - startTime);
        System.out.println("排序耗时：" + millis);

        /**
         * 开始排序
         * 排序耗时：6500
         * 排序耗时：3394
         */
    }
}
```

### 流的短路

```java
public class StreamTest10 {
    public static void main(String[] args) {
        List<String> list = Arrays.asList("hello", "world", "hello world");
        // 打印长度为5的第一个单词
//        list.stream().mapToInt(String::length).filter(length -> length == 5).findFirst().ifPresent(System.out::println);

        // 下面只会输入出hello和5，因为流针对每一个元素的统一应用所有操作，所以直接找到了第一个hello
        list.stream().mapToInt(item -> {
            int length = item.length();
            System.out.println(item);
            return length;
        }).filter(length -> length == 5).findFirst().ifPresent(System.out::println);

    }
}
```

### flatMap的应用场景
```java
public class StreamTest11 {
    public static void main(String[] args) {
        List<String> list = Arrays.asList("hello welcome", "world hello", "hello world hello", "hello welcome");
        // 找出所有单词并且去重
        list.stream().flatMap(item -> Arrays.stream(item.split(" "))).distinct().forEach(System.out::println);
    }
}
```
进一步应用

```java
public class StreamTest12 {
    public static void main(String[] args) {
        List<String> list1 = Arrays.asList("Hi", "Hello", "你好");
        List<String> list2 = Arrays.asList("zhangsan", "lisi", "wangwu", "zhaoliu");


        List<String> result = list1.stream().flatMap(item -> list2.stream().map(item2 -> item + " " + item2)).collect(Collectors.toList());
        result.forEach(System.out::println);

    }
}
```

### 分组：group by操作
```java
public class StreamTest13 {
    public static void main(String[] args) {
        Student student1 = new Student("zhangsan", 100, 20);
        Student student2 = new Student("lisi", 90, 20);
        Student student3 = new Student("wangwu", 90, 30);
        Student student4 = new Student("zhangsan", 80, 40);

        List<Student> students = Arrays.asList(student1, student2, student3, student4);

        // select * from student group by name;
        /*
         * 传统方式：
         * 1. 循环列表
         * 2. 取出学生名字
         * 3. 检查map中是否存在该名字，不存在则直接添加到该map中；存在则将map中的List对象取出来，然后将该Student对象添加到List中
         * 4. 返回map对象
         */

        // 流方式，一行代码
        Map<String, List<Student>> map = students.stream().collect(Collectors.groupingBy(Student::getName));
        System.out.println(map);


        //  select count(*) from student group by name;
        Map<String, Long> map1 = students.stream().collect(Collectors.groupingBy(Student::getName, Collectors.counting()));
        System.out.println(map1);

        // 每个人的平均分
        Map<String, Double> map2 = students.stream().collect(Collectors.groupingBy(Student::getName, Collectors.averagingDouble(Student::getScore)));
        System.out.println(map2);


        // 分区是分组的一种特例，就是用条件来分为两组
        Map<Boolean, List<Student>> map3 = students.stream().collect(Collectors.partitioningBy(student -> student.getScore() >= 90));
        System.out.println(map3);

    }
}
```


