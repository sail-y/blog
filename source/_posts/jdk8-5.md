---
title: JDK8-Stream源码解析
date: 2017-02-10 12:34:27
tags: [java,jdk8]
categories: jdk8
---

### collect

我们看一下Stream API里很重要的collect函数。

1. collect是一个收集器。
2. Collector作为collect方法的参数
3. Collector是一个接口，它是一个可变的汇聚操作，将输入元素累积到一个可变的结果容器中；它会在所有元素都处理完毕之后，将累积的结果转换为一个最终的表示（这是一个可选操作）；它支持串行与并行两种方式执行。
4. Collectors提供了关于Collector的常见汇聚实现，Collectors本身实际上是一个工厂。
5. 为了确保串行与并行操作结果的等价性，Collector函数需要满足两个条件：identity（同一性）与associativity（结合性）
6. a == combiner.apply(a, supplier.get())
7. 函数式编程最大的特点：表示做什么，而不是如何做。
<!--more-->

```java

public class StreamTest1 {
    public static void main(String[] args) {
        Student student1 = new Student("zhangsan", 80);
        Student student2 = new Student("lisi", 90);
        Student student3 = new Student("wangwu", 100);
        Student student4 = new Student("zhaoliu", 90);
        Student student5 = new Student("zhaoliu", 90);

        List<Student> students = Arrays.asList(student1, student2, student3, student4, student5);

        List<Student> students1 = students.stream().collect(toList());
        students1.forEach(System.out::println);


        System.out.println("----------");

        System.out.println("count: " + students.stream().collect(counting()));
        System.out.println("count: " + students.stream().count());

        System.out.println("----------");

        students.stream().collect(minBy(Comparator.comparingInt(Student::getScore))).ifPresent(System.out::println);
        students.stream().collect(maxBy(Comparator.comparingInt(Student::getScore))).ifPresent(System.out::println);
        System.out.println(students.stream().collect(averagingInt(Student::getScore)));
        System.out.println(students.stream().collect(summingInt(Student::getScore)));
        System.out.println(students.stream().collect(summarizingInt(Student::getScore)));
        System.out.println("----------");

        System.out.println(students.stream().map(Student::getName).collect(joining(", ")));
        System.out.println(students.stream().map(Student::getName).collect(joining(", ", "<being>", "<end>")));

        System.out.println("----------");

        Map<Integer, Map<String, List<Student>>> map = students.stream()
                .collect(groupingBy(Student::getScore, groupingBy(Student::getName)));
        System.out.println(map);
        System.out.println("----------");

        Map<Boolean, List<Student>> map2 = students.stream().collect(partitioningBy(student -> student.getScore() > 80));
        System.out.println(map2);

        System.out.println("----------");


        Map<Boolean, Map<Boolean, List<Student>>> map3 = students.stream()
                .collect(partitioningBy(student -> student.getScore() > 80, partitioningBy(student -> student.getScore() > 90)));
        System.out.println(map3);
        System.out.println("----------");

        Map<Boolean, Long> map4 = students.stream().collect(partitioningBy(student -> student.getScore() > 80, counting()));
        System.out.println(map4);
        System.out.println("----------");


        Map<String, Student> map5 = students.stream().collect(groupingBy(Student::getName, collectingAndThen(minBy(Comparator.comparingInt(Student::getScore)), Optional::get)));
        System.out.println(map5);
    }
```

用Collectors.toList举例

```java
public static <T>
    Collector<T, ?, List<T>> toList() {
        return new CollectorImpl<>((Supplier<List<T>>) ArrayList::new, List::add,
                                   (left, right) -> { left.addAll(right); return left; },
                                   CH_ID);
    }
```

CollectorImpl就是Collector的一个实现类，这个构造方法的参数我理解如下：

1. 第一个参数Supplier，就是生成一个容器用来装需要收集的元素，这里是一个ArrayList
2. 第二个参数是一个BiConsumer，这里叫做累加器，操作内容就是把流里的元素放进容器里
3. 第三个参数combiner是一个BinaryOperator类型，只有在并发流的时候才会用到，意思就是并发的时候会有多个Supplier各自进行收集，最后combiner会把这些结果集合并在一起。