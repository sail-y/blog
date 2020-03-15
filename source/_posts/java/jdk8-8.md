---
title: JDK8-Collectors工厂类源码探索
date: 2017-02-26 16:27:03
tags: [java,jdk8]
categories: jdk8
---

### Collectors静态工厂类

对于Collectors静态工厂类来说，其实现一共分为两种情况：

1. 通过CollectorImpl来实现。
2. 通过reducing方法来实现, reducing方法本身又是通过CollectorImpl实现的。
<!--more-->

```java
public static <T> Collector<T, ?, List<T>> toList() {
    return new CollectorImpl<>((Supplier<List<T>>) ArrayList::new, List::add,
                               (left, right) -> { left.addAll(right); return left; },
                               CH_ID);
}
```

这个方法现在来看也很简单了，3个参数，supplier，accumulator，combiner，然后characteristics是CH_ID，就是IDENTITY_FINISH，那么也就不需要finisher方法了。

toList是实现是ArrayList，如果我们需要LinkedList怎么办呢。我们需要用toCollection方法，接收一个Supplier，指定为`LinkedList:new`就可以了。

```java
public static <T, C extends Collection<T>> Collector<T, ?, C> toCollection(Supplier<C> collectionFactory) {
    return new CollectorImpl<>(collectionFactory, Collection<T>::add,
                               (r1, r2) -> { r1.addAll(r2); return r1; },
                               CH_ID);
}
```

下面的joining就是用了finisher，因为A和R类型不一样(StringBuilder和String)，需要用finishder来转换一下。

```java
public static Collector<CharSequence, ?, String> joining() {
    return new CollectorImpl<CharSequence, StringBuilder, String>(
            StringBuilder::new, StringBuilder::append,
            (r1, r2) -> { r1.append(r2); return r1; },
            StringBuilder::toString, CH_NOID);
}
```

collectingAndThen的实现就是把FINISH_IDENTITY的特性给移除了，然后再给finisher()加一个andThen操作，对结果再次进行一个转换。

```java
public static<T,A,R,RR> Collector<T,A,RR> collectingAndThen(Collector<T,A,R> downstream, Function<R,RR> finisher) {
    Set<Collector.Characteristics> characteristics = downstream.characteristics();
    if (characteristics.contains(Collector.Characteristics.IDENTITY_FINISH)) {
        if (characteristics.size() == 1)
            characteristics = Collectors.CH_NOID;
        else {
            characteristics = EnumSet.copyOf(characteristics);
            characteristics.remove(Collector.Characteristics.IDENTITY_FINISH);
            characteristics = Collections.unmodifiableSet(characteristics);
        }
    }
    return new CollectorImpl<>(downstream.supplier(),
                               downstream.accumulator(),
                               downstream.combiner(),
                               downstream.finisher().andThen(finisher),
                               characteristics);
}
```

mapping函数，就是在累加器执行之前，对参数进行一个类型转换，这也会导致返回类型改变。举例如下，首先根据人的城市分组，

```java
Map<City, Set<String>> lastNamesByCity = people.stream().collect(groupingBy(Person::getCity,mapping(Person::getLastName, toSet())));
```
源码如下,结合上面的例子来看，就是toSet()本来应该是Set<Person>，但是因为mapping把累加器的类型由Person改成了String。
```java
public static <T, U, A, R> Collector<T, ?, R> mapping(Function<? super T, ? extends U> mapper,
                           Collector<? super U, A, R> downstream) {
    BiConsumer<A, ? super U> downstreamAccumulator = downstream.accumulator();
    return new CollectorImpl<>(downstream.supplier(),
                               (r, t) -> downstreamAccumulator.accept(r, mapper.apply(t)),
                               downstream.combiner(), downstream.finisher(),
                               downstream.characteristics());
}
```
counting方法，就是初始值为0，每个元素映射成1，然后再加起来。后面的minBy,maxBy也都是通过reducing来实现的。

```java
public static <T> Collector<T, ?, Long> counting() {
	return reducing(0L, e -> 1L, Long::sum);
}
```

summarizingInt方法，为什么第一个参数是一个数组呢，而不是直接一个值，因为累加器accumulator是BiConsumer，接受2个参数，不返回值，如果要进行累加的话，只能通过容器来累加，如果直接是一个值的话，没办法传递，也没有办法累加。

```java
public static <T> Collector<T, ?, Integer> summingInt(ToIntFunction<? super T> mapper) {
    return new CollectorImpl<>(
            () -> new int[1],
            (a, t) -> { a[0] += mapper.applyAsInt(t); },
            (a, b) -> { a[0] += b[0]; return a; },
            a -> a[0], CH_NOID);
}
```
