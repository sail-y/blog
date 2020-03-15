---
title: Effective Java 第三版-条款5_优先选择依赖注入而非硬编码资源的关联关系
tags: [java]
date: 2019-04-24 20:14:38
categories: Effective Java
---

# 条款5_优先选择依赖注入而非硬编码资源的关联关系


>Many classes depend on one or more underlying resources. For example, a spellchecker depends on a dictionary. It is not uncommon to see such classes implemented as static utility classes (Item 4):

很多类会依赖一个或多个潜在的资源。比如拼写检查器会依赖字典。我们常常会看
到这种类被实现为了静态辅助类（条款4）

```java
// Inappropriate use of static utility - inflexible & untestable!
public class SpellChecker {
private static final Lexicon dictionary = ...;
private SpellChecker() {} // Noninstantiable
public static boolean isValid(String word) { ... }
public static List<String> suggestions(String typo) { ... }
}
```
<!--more-->

> Similarly, it’s not uncommon to see them implemented as singletons (Item 3):

同样地，它们常常也被实现成单例模式（条款3）

```java
// Inappropriate use of singleton - inflexible & untestable!
public class SpellChecker {
private final Lexicon dictionary = ...;
private SpellChecker(...) {}
public static INSTANCE = new SpellChecker(...);
public boolean isValid(String word) { ... }
public List<String> suggestions(String typo) { ... }
}
```

>Neither of these approaches is satisfactory, because they assume that there is only one dictionary worth using. In practice, each language has its own dictionary, and special dictionaries are used for special vocabularies. Also, it may be desirable to use a special dictionary for testing. It is wishful thinking to assume that a single dictionary will suffice for all time. 

上面的两种方式都不尽人意，因为他们都假设只有一个字典可供使用。实际上，没中语言都有自己的字典，并且特殊的字典用于特殊的词汇表。另外，我们还需要一个特殊的字典用于测试。认为一个字典就能满足所有的情况只不过是一种美好的愿望罢了。

>You could try to have SpellChecker support multiple dictionaries by making the dictionary field nonfinal and adding a method to change the dictionary in an existing spell checker, but this would be awkward, error-prone, and unworkable in a concurrent setting. **Static utility classes and singletons are inappropriate for classes whose behavior is parameterized by an underlying resource. **

你可以试着让拼写检查器支持多个字典，让字典的字段为非final并且添加一个方法改变拼写检查器里的字典，但是这样会很笨拙，容易出错，在并发设置的情况下无法正常工作。**如果一个类的行为是由等资源来参数化的，那么静态辅助类和单例不适合这种情况**

>What is required is the ability to support multiple instances of the class (in our example, SpellChecker), each of which uses the resource desired by the client (in our example, the dictionary). A simple pattern that satisfies this requirement is to **pass the resource into the constructor when creating a new instance**. This is one form of dependency injection: the dictionary is a dependency of the spell checker and is injected into the spell checker when it is created.

我们所需要的是支持类的多个实例的能力（在该例里中就是SpellChecker），每个实例都会使用客户端所需要的资源（在该示例中就是字典）。满足该需求的一个简单模式就是**在创建一个新实例的时候将资源传给构造方法**。这是依赖注入的一种形式：字典是拼写检查器的的一个依赖，并且在创建拼写检查器的时候被注入。

```java
// Dependency injection provides flexibility and testability
public class SpellChecker {
private final Lexicon dictionary;
public SpellChecker(Lexicon dictionary) {
this.dictionary = Objects.requireNonNull(dictionary);
}
public boolean isValid(String word) { ... }
public List<String> suggestions(String typo) { ... }
}
```

>The dependency injection pattern is so simple that many programmers use it for years without knowing it has a name. While our spell checker example had only a single resource (the dictionary), dependency injection works with an arbitrary number of resources and arbitrary dependency graphs. It preserves immutability (Item 17), so multiple clients can share dependent objects (assuming the clients desire the same underlying resources). Dependency injection is equally applicable to constructors, static factories (Item 1), and builders (Item 2).

依赖注入模式非常的简单，许多程序员用了很多年，不过却不知道它有一个名字。虽然我们的拼写检查器例子只有一个资源（字典），依赖注入可用于任意数量的资源和任意数量的依赖图。它能够保证不变性（条款17），所以多个客户端可以共享依赖对象（假设客户端需要同样的底层资源）。依赖注入适用于构造方法、静态工厂（条款1）和构建器（条款2）。

>A useful variant of the pattern is to pass a resource factory to the constructor. A factory is an object that can be called repeatedly to create instances of a type. Such factories embody the Factory Method pattern [Gamma95]. The Supplier<T> interface, introduced in Java 8, is perfect for representing factories. Methods that take a Supplier<T> on input should typically constrain the factory’s type parameter using a bounded wildcard type (Item 31) to allow the client to pass in a factory that creates any subtype of a specified type. For example, here is a method that makes a mosaic using a client-provided factory to produce each tile:

这种模式的一个很有用的变种是将资源工厂传递给构造方法。工厂是个可以被重复调用来创建同一个类的实例的对象。这种工厂是工厂方法模式的一种具化形式[Gama95]。Java 8 引入的Supplier<T>接口，就非常适用于表示工厂。将Supplier<T>作为输入的方法会通过绑定的通配符类型（条款31）来限制工厂的类型参数，从而可以让客户端传递的工厂能够创建指定类型的任意子类型。比如，有一个方法用客户端提供的用于生产每个瓷砖的工厂做一个马赛克：

```java
Mosaic create(Supplier<? extends Tile> tileFactory) { ... }
```

>Although dependency injection greatly improves flexibility and testability, it can clutter up large projects, which typically contain thousands of dependencies. This clutter can be all but eliminated by using a dependency injection framework, such as Dagger [Dagger], Guice [Guice], or Spring [Spring]. The use of these frameworks is beyond the scope of this book, but note that APIs designed for manual dependency injection are trivially adapted for use by these frameworks.

虽然依赖注入极大的提供了灵活性和可测试性，但是它可能让包含成千上万依赖的大型项目变得混乱。这种混乱可以通过依赖注入框架消除，比如Dagger [Dagger]、Guice 
[Guice]或是Spring [Spring]。这些框架的使用介绍超过了本书的范围，不过请注意，针对⼿⼯进⾏依赖管理所设计的APIs也是适合于这些框架的。

>In summary, do not use a singleton or static utility class to implement a class that depends on one or more underlying resources whose behavior affects that of the class, and do not have the class create these resources directly. Instead, pass the resources, or factories to create them, into the constructor (or static factory or builder). This practice, known as dependency injection, will greatly enhance the flexibility, reusability, and testability of a class.


总结一下，如果一个类依赖一个或多个底层资源，而这些资源的行为会影响到类的行为，那么请不要用单例或者静态辅助类来实现，也不要让类直接创建这些资源。相反，将资源或工厂传递给构造方法（或者静态工厂，或者构建器）来创建它们。这种实践叫做依赖注入，会极大提高类的灵活性，可重用性，和测试性。