---
title: JDK8-Lambda表达式初步与函数式接口
date: 2016-12-19 14:00:37
tags: [java,jdk8]
categories: jdk8
---

# Lambda表达式初步与函数式接口
“Lambda 表达式”(lambda expression)是一个匿名函数，Lambda表达式基于数学中的λ演算得名，直接对应于其中的lambda抽象(lambda abstraction)，是一个匿名函数，即没有函数名的函数。Lambda表达式可以表示闭包（注意和数学传统意义上的不同）。
<!--more-->
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

Lambda表达式为Java添加了缺失的函数式编程特性，使我们能将函数当作一等公民看待。		
在将函数作为一等公民的语言中，Lambda表达式是类型是函数。但在Java中，Lambda表达式是对象，他们必须依附于一类特别的对象类型----函数式接口（functional interface）。


### 例子
下面是用lambda表达式和stream来对一个列表的字符串进行大写字母转换。

```java
List<String> list = Lists.newArrayList("hello", "world", "hello world");
list.stream().map(String::toUpperCase).forEach(System.out::println);
```

上面看到有2个冒号的地方，这个叫做方法引用，方法引用有四种方式，这是其中一种，通过类的方式引用。

```java
Function<String, String> function = String::toUpperCase;
System.out.println(function.apply("hello"));
``` 

那么对象会被当做lambda表达式的第一个参数传入，上面的代码就相当于"hello".toUpperCase();


下面演示一个Comparator的例子

```java
List<String> names = Arrays.asList("zhangsan", "lisi", "wangwu", "zhaoliu");
Collections.sort(names, (o1, o2) -> o2.compareTo(o1));

System.out.println(names);
```

这就是一个倒序排序，Collections.sort()的第二个参数就是一个Comparator对象，我们用lambda表示来写的，看一下Comparator是声明为函数式接口。所以可以用lambda来写。

```java
@FunctionalInterface
public interface Comparator<T> 
```

## Java Lambda基本语法

* Java中的Lambda表达式基本语法
	* (arg) -> (body)
* 比如
	* (arg1, arg2) -> {bodu}
	* (type1 arg1, type2 arg2...) -> {body}
	
### 示例

* (int a, int b) -> { return a + b; }
* () -> System.out.println("Hello World");
* (String s) -> {System.out.println(s);}
* () -> 42


## Java Lambda结构
* 一个Lambda表达式可以有零个或多个参数
* 参数的类型既可以明确声明，也可以根据上下文来推断。例如：(int a)与(a)效果相同。
* 所有参数需包含在圆括号内，参数之间用逗号相隔。例如：(a,b)或(int a,int b)或(String a,int b, float c)
* 空圆括号代表参数集为空。例如：() -> 42
* 当只有一个参数，且其类型可推导时，圆括号()可省略。例如：a -> return a * a;
* Lambda表达式的主体可包含零条或多条语句。
* 如果Lambda表达式的主体只有一条语句，花括号{}可省略。匿名函数的返回类型与该主体表达式一致。
* 如果Lambda表达式的主体包含一条以上语句，则表达式必须包含在花括号{}中(形成代码块)。匿名函数的返回类型与代码块的返回类型一致，若没有返回则为空。


## 主要接口详解

### Function接口

```java
public class FunctionTest {
    public static void main(String[] args) {
        FunctionTest test = new FunctionTest();
        System.out.println(test.compute(1, value -> 2 * value));
        System.out.println(test.compute(2, value -> 5 + value));
        System.out.println(test.compute(3, value -> value * value));


        Function<Integer, String> function = String::valueOf;
        System.out.println(test.convert(5, function.compose((Integer i) -> i + 1)));

    }

    public int compute(int a, Function<Integer, Integer> function) {
        int result = function.apply(a);
        return result;
    }

    public String convert(int a, Function<Integer, String> function) {
        return function.apply(a);
    }
}
```

#### compose和andThen

compose()方法，它接受一个Function，也返回一个Function，结果就是执行参数里的apply，再执行本对象的apply。
andThen()方法则相反，是先执行本对象的apply，再执行参数Function的apply。

```java
public class FunctionTest2 {
    public static void main(String[] args) {
        FunctionTest2 test2 = new FunctionTest2();

        // 输出12
        System.out.println(test2.compute(2, value -> value * 3, value -> value * value));
        // 输出36
        System.out.println(test2.compute2(2, value -> value * 3, value -> value * value));

        // 动态+-操作
        System.out.println(test2.compute3(1, 2, (value1, value2) -> value1 + value2));
        System.out.println(test2.compute3(1, 2, (value1, value2) -> value1 - value2));


        // BIFunction实例
        System.out.println(test2.compute4(2, 3, (value1, value2) -> value1 + value2, value -> value * value));




    }

    public int compute(int a, Function<Integer, Integer> function1, Function<Integer, Integer> function2) {
        return function1.compose(function2).apply(a);
    }

    public int compute2(int a, Function<Integer, Integer> function1, Function<Integer, Integer> function2) {
        return function1.andThen(function2).apply(a);
    }


    public int compute3(int a, int b, BiFunction<Integer, Integer, Integer> biFunction) {
        return biFunction.apply(a, b);
    }

    public int compute4(int a, int b, BiFunction<Integer, Integer, Integer> biFunction, Function<Integer, Integer> function) {
        return biFunction.andThen(function).apply(a, b);
    }

}
```
### BiFunction
接受2个参数，返回一个值的函数式接口。

```java
public class PersonTest {
    public static void main(String[] args) {
        Person person1 = new Person("zhangsan", 20);
        Person person2 = new Person("lisi", 30);
        Person person3 = new Person("wangwu", 40);

        List<Person> people = Arrays.asList(person1, person2, person3);


        PersonTest test = new PersonTest();
//        List<Person> personResult = test.getPeopleByUsername("zhangsan", people);
//        personResult.forEach(person -> System.out.println(person.getUsername()));

//        List<Person> personResult = test.getPeopleByAge(20, people);
//        personResult.forEach(person -> System.out.println(person.getAge()));

        List<Person> personResult = test.getPeopleByAge2(20, people, (ageOfPerson, personList) -> personList.stream().filter(person -> person.getAge() > ageOfPerson).collect(Collectors.toList()));
        personResult.forEach(person -> System.out.println(person.getAge()));



    }

    public List<Person> getPeopleByUsername(String username, List<Person> people) {

        return people.stream().filter(person -> person.getUsername().equals(username)).collect(Collectors.toList());
    }

    public List<Person> getPeopleByAge(int age, List<Person> people) {
        BiFunction<Integer, List<Person>, List<Person>> biFunction = (ageOfPerson, personList) -> personList.stream().filter(person -> person.getAge() > ageOfPerson).collect(Collectors.toList());

        return biFunction.apply(age, people);
    }

    public List<Person> getPeopleByAge2(int age, List<Person> people, BiFunction<Integer, List<Person>, List<Person>> biFunction) {

        return biFunction.apply(age, people);
    }
}
```
### Predicate
判断用的函数式接口

```java
public class PredicateTest {
    public static void main(String[] args) {
        Predicate<String> predicate = p -> p.length() > 5;
        System.out.println(predicate.test("hello"));
    }
}
```
代码测试
```java
public class PredicateTest2 {
    public static void main(String[] args) {
        List<Integer> list = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

        PredicateTest2 predicateTest2 = new PredicateTest2();
        predicateTest2.conditionFilter(list, i -> i % 2 == 0);

        predicateTest2.conditionFilter2(list, item -> item > 5, item -> item % 2 == 0);

    }

    // 以前我们在对数据进行筛选或者处理的时候，一般是单独定义一个方法来进行处理，现在我们只需要把筛选条件当作参数传入
    public void conditionFilter(List<Integer> list, Predicate<Integer> predicate) {
        for (Integer integer : list) {
            if (predicate.test(integer)) {
                System.out.println(integer);
            }
        }
    }

    // Predicate的其他方法测试
    public void conditionFilter2(List<Integer> list, Predicate<Integer> predicate, Predicate<Integer> predicate2) {
        for (Integer integer : list) {
            if (predicate.or(predicate2).test(integer)) {
                System.out.println(integer);
            }
        }
    }
}
```

### Supplier

简单测试

```java
public class SupplierTest {
    public static void main(String[] args) {
        Supplier<String> supplier = () -> "hello world";
        System.out.println(supplier.get());
    }

}
```
java.util.function包下面还有很多函数式接口，无非就是0参数，1个参数，2个参数的接口，用法都是一样的。
```java

public class BinaryOperatorTest {
    public static void main(String[] args) {
        BinaryOperatorTest binaryOperatorTest = new BinaryOperatorTest();
        System.out.println(binaryOperatorTest.compute(1, 2, (a, b) -> a + b));
        System.out.println(binaryOperatorTest.compute(1, 2, (a, b) -> a - b));
        System.out.println("----------------");
        System.out.println(binaryOperatorTest.getShort("hello123", "world", (a, b) -> a.length() - b.length()));


    }

    public int compute(int a, int b, BinaryOperator<Integer> binaryOperator) {
        return binaryOperator.apply(a, b);
    }

    public String getShort(String a, String b, Comparator<String> comparator) {
        return BinaryOperator.minBy(comparator).apply(a, b);
    }


}

```

