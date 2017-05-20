---
title: JDK8-自定义收集器和注意事项
date: 2017-02-26 14:10:04
tags: [java,jdk8]
categories: jdk8
---

### 自定义收集器

之前我们简单说过了Collector接口，以及他的简单使用，现在我们来尝试自定义一个收集器，来进行更加深刻的理解。

Collector的5个方法：

```java
Supplier<A> supplier();    
BiConsumer<A, T> accumulator();
BinaryOperator<A> combiner();
Function<A, R> finisher();
// 收集器特性，只有3个值，CONCURRENT，UNORDERED，IDENTITY\_FINISH
// CONCURRENT标识同一个结果容器可以由多个线程多次调用。
// UNORDERED标识收集器并不承诺保证流的顺序。
// IDENTITY_FINISH标识finisher函数就是identity函数。
Set<Characteristics> characteristics();
```
<!--more-->
了解以上接口方法后，我们来自己实现一个收集器：

```java
public class MySetCollector<T> implements Collector<T, Set<T>, Set<T>> {

    /**
     * 产生结果容器
     */
    @Override
    public Supplier<Set<T>> supplier() {
        System.out.println("supplier invoked!");
        return HashSet::new;
    }

    /**
     * 累加器
     */
    @Override
    public BiConsumer<Set<T>, T> accumulator() {
        System.out.println("accumulator invoked!");
        return Set<T>::add;
    }

    /**
     * 用于并行流，将多个部分的执行结果合并起来
     */
    @Override
    public BinaryOperator<Set<T>> combiner() {
        System.out.println("combiner invoked!");
        return (set1, set2) -> {
            set1.addAll(set2);
            return set1;
        };
    }

    /**
     * 合并后返回最终的结果类型
     */
    @Override
    public Function<Set<T>, Set<T>> finisher() {
        System.out.println("finisher invoked!");
        return Function.identity();
    }

    @Override
    public Set<Characteristics> characteristics() {
        System.out.println("characteristics invoked");
        return Collections.unmodifiableSet(EnumSet.of(IDENTITY_FINISH, UNORDERED));
    }

    public static void main(String[] args) {
        List<String> list = Arrays.asList("hello", "world", "welcome");

        Set<String> set = list.stream().collect(new MySetCollector<>());

        System.out.println(set);
    }
}
```
输出结果如下：

```plain
supplier invoked!
accumulator invoked!
combiner invoked!
characteristics invoked
characteristics invoked
[world, hello, welcome]
```

首先说明一点，因为这些返回都是函数式接口，所以方法被调用了，也不意味着行为被执行了。

我们来看一下collect方法的源码。

```java
public final <R, A> R collect(Collector<? super P_OUT, A, R> collector) {
    A container;
    if (isParallel()
            && (collector.characteristics().contains(Collector.Characteristics.CONCURRENT))
            && (!isOrdered() || collector.characteristics().contains(Collector.Characteristics.UNORDERED))) {
        container = collector.supplier().get();
        BiConsumer<A, ? super P_OUT> accumulator = collector.accumulator();
        forEach(u -> accumulator.accept(container, u));
    }
    else {
        container = evaluate(ReduceOps.makeRef(collector));
    }
    return collector.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH)
           ? (R) container
           : collector.finisher().apply(container);
}
```
我们的不是并行流，就直接看evaluate(ReduceOps.makeRef(collector));这一行代码，我们再进ReduceOps.makeRef看一下源码。

```java
public static <T, I> TerminalOp<T, I>
    makeRef(Collector<? super T, I, ?> collector) {
    Supplier<I> supplier = Objects.requireNonNull(collector).supplier();
    BiConsumer<I, ? super T> accumulator = collector.accumulator();
    BinaryOperator<I> combiner = collector.combiner();
    class ReducingSink extends Box<I>
            implements AccumulatingSink<T, I, ReducingSink> {
        @Override
        public void begin(long size) {
            state = supplier.get();
        }

        @Override
        public void accept(T t) {
            accumulator.accept(state, t);
        }

        @Override
        public void combine(ReducingSink other) {
            state = combiner.apply(state, other.state);
        }
    }
    return new ReduceOp<T, I, ReducingSink>(StreamShape.REFERENCE) {
        @Override
        public ReducingSink makeSink() {
            return new ReducingSink();
        }

        @Override
        public int getOpFlags() {
            return collector.characteristics().contains(Collector.Characteristics.UNORDERED)
                   ? StreamOpFlag.NOT_ORDERED
                   : 0;
        }
    };
}
```
可以看到下面的代码就已经执行了这3个方法，来获取3个函数式接口。

```java
Supplier<I> supplier = Objects.requireNonNull(collector).supplier();
BiConsumer<I, ? super T> accumulator = collector.accumulator();
BinaryOperator<I> combiner = collector.combiner();
```

那么为什么characteristics()方法调用了2次呢，看看上面的源码就知道，一处是在getOpFlags方法调用的，一处是在collect的最后一行代码里调用的。

如果Collections.unmodifiableSet(EnumSet.of(IDENTITY\_FINISH, UNORDERED));把IDENTITY_FINISH去掉，那么就会调用finisher方法。

### 自定义收集器深度剖析和并行流陷阱

接下里我们自定义的一个Collector目的是要把一个list转换成一个map，不过要求Supplier返回是一个Set。意思就是Collector<T,A,R>3个泛型参数，A和R的类型是不一样的。

```java
public class MySetCollector2<T> implements Collector<T, Set<T>, Map<T, T>> {

    /**
     * 产生结果容器
     */
    @Override
    public Supplier<Set<T>> supplier() {
        System.out.println("supplier invoked!");
        return HashSet::new;
    }

    /**
     * 累加器
     */
    @Override
    public BiConsumer<Set<T>, T> accumulator() {
        System.out.println("accumulator invoked!");
        return (set, item) -> {
            System.out.println("accumulator: " + set +  Thread.currentThread().getName());
            set.add(item);
        };
    }

    /**
     * 用于并行流，将多个部分的执行结果合并起来
     */
    @Override
    public BinaryOperator<Set<T>> combiner() {
        System.out.println("combiner invoked!");
        return (set1, set2) -> {
            set1.addAll(set2);
            return set1;
        };
    }

    /**
     * 合并后返回最终的结果类型
     */
    @Override
    public Function<Set<T>, Map<T, T>> finisher() {

        return set -> {
            Map<T, T> map = new HashMap<>();
            set.forEach(item -> map.put(item, item));
            return map;
        };
    }

    @Override
    public Set<Characteristics> characteristics() {
        System.out.println("characteristics invoked");

        // 这里就不能再写IDENTITY_FINISH了，因为A和R的类型不一样，如果写了会报一个强制转换的异常。
        return Collections.unmodifiableSet(EnumSet.of(UNORDERED));
    }

    public static void main(String[] args) {
        List<String> list = Arrays.asList("hello", "world", "welcome", "hello", "a", "b", "c", "d", "e", "f", "g");

        Map<String, String> map = list.stream().collect(new MySetCollector2<>());

        System.out.println(map);
    }
}
```
输出结果：

```plain
supplier invoked!
accumulator invoked!
combiner invoked!
characteristics invoked
characteristics invoked
finisher invoked
{a=a, b=b, world=world, c=c, d=d, e=e, f=f, g=g, hello=hello, welcome=welcome}
```
上面写到不能再添加IDENTITY_FINISH，否则会出错，原因就在于之前我们解释的过的源码中的一行代码，就是collect的源码中。

```java
return collector.characteristics().contains(Collector.Characteristics.IDENTITY_FINISH)
               ? (R) container
               : collector.finisher().apply(container);
```
很明显，如果包含了IDENTITY_FINISH枚举，那么会执行(R) container。直接进行强制转换，在我们这里的container的e类型是Set,R是Map，那么这行代码就是把Set强制转换成一个Map，当然我们就会得到一个强制类型转换的异常。这也说明一个问题，characteristics并不能乱写，所以我们要理解这个函数的每一个枚举的含义，才能在开发中很好的运用。

接下来我们进行一个改造，把stream换成parallelStream。
运行一次

```
characteristics invoked
supplier invoked!
accumulator invoked!
combiner invoked!
characteristics invoked
accumulator: []ForkJoinPool.commonPool-worker-3
accumulator: []ForkJoinPool.commonPool-worker-3
accumulator: []ForkJoinPool.commonPool-worker-3
accumulator: []ForkJoinPool.commonPool-worker-3
accumulator: []ForkJoinPool.commonPool-worker-3
accumulator: []ForkJoinPool.commonPool-worker-3
accumulator: []ForkJoinPool.commonPool-worker-3
accumulator: []ForkJoinPool.commonPool-worker-3
accumulator: []main
accumulator: []ForkJoinPool.commonPool-worker-1
accumulator: []ForkJoinPool.commonPool-worker-2
characteristics invoked
finisher invoked
{a=a, b=b, world=world, c=c, d=d, e=e, f=f, g=g, hello=hello, welcome=welcome}
```
我们可以看到有多个线程进行了累加器的调用。
我们再改一行代码

	return Collections.unmodifiableSet(EnumSet.of(UNORDERED, CONCURRENT);

输出：

```java
characteristics invoked
characteristics invoked
supplier invoked!
accumulator invoked!
accumulator: []ForkJoinPool.commonPool-worker-1
accumulator: [welcome]ForkJoinPool.commonPool-worker-1
accumulator: [a, welcome]ForkJoinPool.commonPool-worker-1
accumulator: [a, hello, welcome]ForkJoinPool.commonPool-worker-1
accumulator: [a, f, hello, welcome]ForkJoinPool.commonPool-worker-1
accumulator: [a, f, g, hello, welcome]ForkJoinPool.commonPool-worker-1
accumulator: [a, e, f, g, hello, welcome]ForkJoinPool.commonPool-worker-1
accumulator: [a, b, e, f, g, hello, welcome]ForkJoinPool.commonPool-worker-1
accumulator: [a, hello, welcome]main
accumulator: [a, hello, welcome]ForkJoinPool.commonPool-worker-2
accumulator: [a, hello, welcome]ForkJoinPool.commonPool-worker-3
characteristics invoked
finisher invoked
{a=a, b=b, c=c, world=world, d=d, e=e, f=f, g=g, hello=hello, welcome=welcome}
```

这有个很明显的差别，就是累加器输出的时候，打印set的值[]差别很大，这个不是偶然的，我们看CONCURRENT的api解释：**允许有多个线程操作同一个结果容器，并且只能被用于无序(UNORDERED)的流**。反过来想一下，如果没有加CONCURRENT特性，那么并行流就是有几个线程，就有几个结果容器被操作了，

我们多执行几次代码，可能会得到一个`ConcurrentModificationException`的异常，可是，如果我们把测试代码中打印set值的代码去掉，无论你执行多少次，也不会出现这个异常。
我们看一下`ConcurrentModificationException `的说明： This exception may be thrown by methods that have detected concurrent modification of an object when such modification is not permissible. For example, it is not generally permissible for one thread to modify a Collection while another thread is iterating over it. 
意思很明确了，不允许一个线程在修改的时候，另一个线程同时又在迭代它。所以我们要在实际开发中，避免在累加器中对中间结果容器进行额外的操作。

那么如何证明加了CONCURRENT之后就只有一个中间结果容器，不加就就有多个中间结果容器呢(多个线程多个容器，所以不会有ConcurrentModificationException)，用combiner就能测试了，因为只有一个中间结果容器的话，combiner根本不会执行。

我们把代码改一下：

```java
@Override
public BinaryOperator<Set<T>> combiner() {
    System.out.println("combiner invoked!");
    return (set1, set2) -> {
        System.out.println("set1: " + set1);
        System.out.println("set1: " + set2);
        set1.addAll(set2);
        return set1;
    };
}
```

不加CONCURRENT:

```plain
characteristics invoked
supplier invoked!
accumulator invoked!
combiner invoked!
characteristics invoked
accumulator: []ForkJoinPool.commonPool-worker-1 hashcode: 0
accumulator: []ForkJoinPool.commonPool-worker-2 hashcode: 0
accumulator: []ForkJoinPool.commonPool-worker-1 hashcode: 0
accumulator: []ForkJoinPool.commonPool-worker-3 hashcode: 0
accumulator: []ForkJoinPool.commonPool-worker-1 hashcode: 0
accumulator: []ForkJoinPool.commonPool-worker-3 hashcode: 0
accumulator: []ForkJoinPool.commonPool-worker-3 hashcode: 0
accumulator: []ForkJoinPool.commonPool-worker-2 hashcode: 0
set1: [hello]
set1: [hello]
set1: [world]
set1: [f]
set1: [g]
set1: [a]
set1: [welcome]
set1: [e]
accumulator: []ForkJoinPool.commonPool-worker-3 hashcode: 0
set1: [f, g]
set1: [a, hello]
set1: [world, hello]
set1: [a, hello, welcome]
accumulator: []ForkJoinPool.commonPool-worker-3 hashcode: 0
accumulator: []main hashcode: 0
set1: [c]
set1: [d]
set1: [b]
set1: [c, d]
set1: [b, c, d]
set1: [e, f, g]
set1: [a, world, hello, welcome]
set1: [b, c, d, e, f, g]
characteristics invoked
finisher invoked
{a=a, b=b, world=world, c=c, d=d, e=e, f=f, g=g, hello=hello, welcome=welcome}
```

加了CONCURRENT之后：

```plain
characteristics invoked
characteristics invoked
supplier invoked!
accumulator invoked!
accumulator: []ForkJoinPool.commonPool-worker-1 hashcode: 0
accumulator: [welcome]ForkJoinPool.commonPool-worker-1 hashcode: 1233099618
accumulator: [a, welcome]ForkJoinPool.commonPool-worker-1 hashcode: 1233099715
accumulator: []main hashcode: 0
accumulator: []ForkJoinPool.commonPool-worker-2 hashcode: 0
accumulator: []ForkJoinPool.commonPool-worker-3 hashcode: 0
accumulator: [a, world, hello, welcome]ForkJoinPool.commonPool-worker-2 hashcode: 1445580839
accumulator: [a, hello, welcome]ForkJoinPool.commonPool-worker-1 hashcode: 1332262037
accumulator: [a, world, e, hello, welcome]ForkJoinPool.commonPool-worker-2 hashcode: 1445580940
accumulator: [a, world, hello, welcome]ForkJoinPool.commonPool-worker-3 hashcode: 1445580839
accumulator: [a, world, e, f, hello, welcome]ForkJoinPool.commonPool-worker-1 hashcode: 1445581042
characteristics invoked
finisher invoked
{a=a, b=b, world=world, c=c, d=d, e=e, f=f, g=g, hello=hello, welcome=welcome}
```
可以看到的，加了CONCURRENT之后根本就没有执行combiner方法。
所以我们可以再总结一下combiner的使用说明，就是在并行流，并且收集器的特性没有CONCURRENT特性的时候，combiner才会被调用。


