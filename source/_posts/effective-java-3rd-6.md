---
title: Effective Java 第三版-条款6_避免创建不必要的对象
tags: [java]
date: 2019-05-09 20:20:55
categories: Effective Java
---

# 条款6_避免创建不必要的对象

>It is often appropriate to reuse a single object instead of creating a new functionally equivalent object each time it is needed. Reuse can be both faster and more stylish. An object can always be reused if it is immutable (Item 17).

在需要一个对象时，恰当的做法是尽可能重用这个对象而非创建一个功能完全一样的新对象。重用是既快又时髦。如果对象是不可变的，那么它总是可以被重用（条款17）。

<!--more-->

>As an extreme example of what not to do, consider this statement:

作为⼀个绝对不要这么做的极端示例，考虑如下语句：

```java
String s = new String("bikini"); // DON'T DO THIS!
```

>The statement creates a new String instance each time it is executed, and none of those object creations is necessary. The argument to the String constructor ("bikini") is itself a String instance, functionally identical to all of the objects created by the constructor. If this usage occurs in a loop or in a frequently invoked method, millions of String instances can be created needlessly.

这个语句每次执行都会创建一个新的实例，而这些对象的创建却是完全没有必要的。String构造方法的参数数("bikini")本身就是个String实例，在功能上与由这个构造方法创建的所有对象完全相同。如果这种用法出现在一个循环或是被频繁调用的方法中，那就会创建出无数的不必要地String实例。

>The improved version is simply the following:

如下是改进版本：

```java
String s = "bikini";
```

>This version uses a single String instance, rather than creating a new one each time it is executed. Furthermore, it is guaranteed that the object will be reused by any other code running in the same virtual machine that happens to contain the same string literal [JLS, 3.10.5]

该版本使用了单个String实例⽽⾮每次在执⾏时都创建⼀个新的实例。此外，它还确保了运⾏在同⼀个虚拟机中并且包含了相同字符串字⾯值的其他代码能够重⽤该对象[JLS, 
3.10.5]。

>You can often avoid creating unnecessary objects by using static factory methods (Item 1) in preference to constructors on immutable classes that provide both. For example, the factory method Boolean.valueOf(String) is preferable to the constructor Boolean(String), which was deprecated in Java 9. The constructor must create a new object each time it’s called, while the factory method is never required to do so and won’t in practice. In addition to reusing immutable objects, you can also reuse mutable objects if you know they won’t be modified.

如果不变类既提供了静态⼯⼚⽅法（条款1），也提供了构造⽅法，那么你就可以通过前者
来避免创建不必要的对象。比如说，工厂方法Boolean.valueOf(String)要⽐构造⽅法
Boolean(String)更值得使⽤，后者已经在Java 9中被标记为不建议使⽤。构造⽅法必须要在每次调⽤时创建新的对象，⽽⼯⼚⽅法则没有这个限制，在实践中也不会这么做。除了重⽤不可变对象外，如果你知道对象不会被修改，那还可以重⽤可变对象。

>Some object creations are much more expensive than others. If you’re going to need such an “expensive object” repeatedly, it may be advisable to cache it for reuse. Unfortunately, it’s not always obvious when you’re creating such an object. Suppose you want to write a method to determine whether a string is a valid Roman numeral. Here’s the easiest way to do this using a regular expression:

一些对象的创建成本要比其他对象高很多。如果你不断需要这种`昂贵的对象`，那么更好的方式是将其缓存起来重用。不幸地是，在创建这样的对象时，这种情况并非那么显而易见。假设你要写一个方法来确定一个字符串是否是一个有效的罗马数字。下面是个最简单的实现方式，它使用了正则表达式：

```java
// Performance can be greatly improved!
static boolean isRomanNumeral(String s) {
return s.matches("^(?=.)M*(C[MD]|D?C{0,3})"
+ "(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$");
}
```

>The problem with this implementation is that it relies on the String.matches method. While String.matches is the easiest way to check if a string matches a regular expression, it’s not suitable for repeated use in performance-critical situations. The problem is that it internally creates a Pattern instance for the regular expression and uses it only once, after which it becomes eligible for garbage collection. Creating a Pattern instance is expensive because it requires compiling the regular expression into a finite state machine.

上述这种实现的问题在于它依赖于String.matches方法。虽然String.matches是检查字符串是否匹配一个正则表达式的最简单的方式，但它却不适合于性能关键的场景下重复使用。问题的原因是，它内部会为正则表达式创建一个Pattern实例，但却只用一次，接下来就会被垃圾回收掉。创建Pattern实例是非常昂贵的，因为它需要将正则表达式编译为一个有限状态机。


>To improve the performance, explicitly compile the regular expression into a Pattern instance (which is immutable) as part of class initialization, cache it, and reuse the same instance for every invocation of the isRomanNumeral method:

为了改进性能，请在类初始化过程中手动将正则表达式编译到Pattern实例中（它是不可变），然后将其缓存起来，在每次调用isRomanNumeral方法的时候重用这个实例：

```java
// Reusing expensive object for improved performance
public class RomanNumerals {
	private static final Pattern ROMAN = Pattern.compile(
			"^(?=.)M*(C[MD]|D?C{0,3})"
			+ "(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$");
	static boolean isRomanNumeral(String s) {
		return ROMAN.matcher(s).matches();
	}
}
```

>The improved version of isRomanNumeral provides significant performance gains if invoked frequently. On my machine, the original version takes 1.1 µs on an 8-character input string, while the improved version takes 0.17 µs, which is 6.5 times faster. Not only is the performance improved, but arguably, so is clarity. Making a static final field for the otherwise invisible Pattern instance allows us to give it a name, which is far more readable than the regular expression itself.

改进版本的isRomanNumeral在频繁调用调用的情况极大提升了性能。在我的机器上，原始版本对于8字符的字符串花费了1.1 µs，而改进版本则只花了0.17 µs，快了6.5倍。除了性能改进外，代码也更清晰了。相比于不可见的Pattern实例，我们为其指定了一个static final字段，这可以让我们给它起一个名字，这一点相比正则表达式本身来说，可读性更好了。

>If the class containing the improved version of the isRomanNumeral method is initialized but the method is never invoked, the field ROMAN will be initialized needlessly. It would be possible to eliminate the initialization by lazily initializing the field (Item 83) the first time the isRomanNumeral method is invoked, but this is not recommended. As is often the case with lazy initialization, it would complicate the implementation with no measurable performance improvement (Item 67).

如果包含了改进版本isRomanNumeral方法的类初始化了，但是方法却永远没有被调用，那么ROMAN字段就没有必要初始化了。可以通过在isRomanNumeral方法首次调用的时候延迟初始化该字段（条款83）来消除不必要的初始化，不过并不推荐这么做。因为对于延迟初始化来说，它常常导致实现变得复杂，并且性能上的改进也是存疑的（条款67）。

>When an object is immutable, it is obvious it can be reused safely, but there are other situations where it is far less obvious, even counterintuitive. Consider the case of adapters [Gamma95], also known as views. An adapter is an object that delegates to a backing object, providing an alternative interface. Because an adapter has no state beyond that of its backing object, there’s no need to create more than one instance of a given adapter to a given object.

当一个对象是不可变的，那么显然对象可以被安全的重用，但是还有一些其他情况，这一点并不是那么明显，甚至是违反直觉的。考虑适配器场景[Gamma95]，⼜叫做视图（views）。所谓适配器，指的是委托给支撑对象的对象，并提供了另外的接口。因为适配器除了支撑对象的状态外，它自身是没有状态的，因此对于给定的对象来说，没有必要为其创建多个适配器的实例。

>For example, the keySet method of the Map interface returns a Set view of the Map object, consisting of all the keys in the map. Naively, it would seem that every call to keySet would have to create a new Set instance, but every call to keySet on a given Map object may return the same Set instance. Although the returned Set instance is typically mutable, all of the returned objects are functionally identical: when one of the returned objects changes, so do all the others, because they’re all backed by the same Map instance. While it is largely harmless to create multiple instances of the keySet view object, it is unnecessary and has no benefits.

比如说，Map接口的keySet方法会返回Map对象的Set视图，其中包含了map里所有的键。直觉上，每次调用keySet都会创建一个Set实例，不过实际情况却是，每次调用给定Map对象的keySet都只会返回同一个Set实例。虽然返回的Set实例是可变的，但返回的对象却是相同的：当返回的对象中的一个发生了变化，其他也会发生变化，因为他们都是由相同的Map实例维护的。虽然创建keySet视图对象的多个实例是没有什么问题的，但是这么做没有必要，也没什么好处。

>Another way to create unnecessary objects is autoboxing, which allows the programmer to mix primitive and boxed primitive types, boxing and unboxing automatically as needed. Autoboxing blurs but does not erase the distinction between primitive and boxed primitive types. There are subtle semantic distinctions and not-so-subtle performance differences (Item 61). Consider the following method, which calculates the sum of all the positive int values. To do this, the program has to use long arithmetic because an int is not big enough to hold the sum of all the positive int values:

创建不必要对象的另一种情况是自动装箱，程序员们可以通过自动装箱将原生类型与原生类型的包装类混合起来，这种情况下就会根据需要自动进行装箱与拆箱操作。**自动装箱模糊了原生类型与包装类型，但却没有消除原生类型与包装类型之间的差别。**这里存在一些微小的语义上的差别以及稍微有点大的性能上的差别（条款61）。考虑如下方法，它会计算所有正整型的和。为了做到这一点，程序需要运用long运算，因为int不足以容纳所有正整型int值的和：


```java
// Hideously slow! Can you spot the object creation?
private static long sum() {
 Long sum = 0L;
 for (long i = 0; i <= Integer.MAX_VALUE; i++)
 	sum += i;
 return sum;
}
```

>This program gets the right answer, but it is much slower than it should be, due to a one-character typographical error. The variable sum is declared as a Long instead of a long, which means that the program constructs about 231 unnecessary Long instances (roughly one for each time the long i is added to the Long sum). Changing the declaration of sum from Long to long reduces the runtime from 6.3 seconds to 0.59 seconds on my machine. The lesson is clear: **prefer primitives to boxed primitives, and watch out for unintentional autoboxing.**

这个程序会得到正确的答案，不过要比预计的慢很多，原因在于一个字符拼写上的错误。变量sum被声明为Long而非long，这意味着程序要构建大约2的31次方个不必要的Long实例（大致在每次long i被加到Long sum中时）。在我的机器上，将sum声明由Long改为long则会将运行时间从6.3秒减少到0.59s。结论很清晰：**优选选择原生类型而非包装类型，并消息提防无意的自动装箱**

>This item should not be misconstrued to imply that object creation is expensive and should be avoided. On the contrary, the creation and reclamation of small objects whose constructors do little explicit work is cheap, especially on modern JVM implementations. Creating additional objects to enhance the clarity, simplicity, or power of a program is generally a good thing. 本条款不应该被误解，以为对象创建是昂贵的，应该避免。与之相反，构造方法没有做什么显式工作的小对象的创建和回收是非常廉价的，特别是在现代JVM上更是如此。创建额外的对象来增强清晰性、简单性或是程序的能力通常是件好事。

>Conversely, avoiding object creation by maintaining your own object pool is a bad idea unless the objects in the pool are extremely heavyweight. The classic example of an object that does justify an object pool is a database connection. The
cost of establishing the connection is sufficiently high that it makes sense to reuse these objects. Generally speaking, however, maintaining your own object pools clutters your code, increases memory footprint, and harms performance. Modern JVM implementations have highly optimized garbage collectors that easily outperform such object pools on lightweight objects.

与之相反，通过维护自己的对象池来避免对象创建是个不好的做法，除非池中的对象是非常重量级的。真正需要一个对象池的一个典型示例就是数据库连接。建立连接的成本非常高昂，因此重用对象是有意义的。不过，一般来说，维护自己的对象池会将代码搞乱，增加内存使用率，也会对性能产生不好的影响。现在JVM已经对垃圾回收期进行了高度优化，对于轻量级对象来说，其性能已经超越了这种对象池。

>The counterpoint to this item is Item 50 on defensive copying. The present item says, “Don’t create a new object when you should reuse an existing one,” while Item 50 says, “Don’t reuse an existing object when you should create a new one.” Note that the penalty for reusing an object when defensive copying is called for is far greater than the penalty for needlessly creating a duplicate object. Failing to make defensive copies where required can lead to insidious bugs and security holes; creating objects unnecessarily merely affects style and performance.

与本条款对应的是关于防御式拷贝的条款50。本条款说的是“在应该重用已有对象的时候，请不要创建新的”，而条款50说的是“在应该创建新的对象时，请不要复用已有的”。注意，当防御式拷贝调用时，重用对象的代价要比创建一个复制对象的成本高许多。在本应该进行防御式拷贝但却没有这么做的情况下会导致难以察觉的bug和安全漏洞；创建不必要的对象仅仅是影响了风格和性能而已。