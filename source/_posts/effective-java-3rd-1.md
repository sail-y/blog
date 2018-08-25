---
title: Effective Java 第三版-条款1_考虑使用静态工厂方法而非构造方法
tags: [java]
date: 2018-08-13 14:33:51
categories: Effective Java
---

先尝试自己翻译，再和龙哥的译文进行对比。

# 条款1: 考虑使用静态工厂方法而非构造方法

传统方式允许客户端获取一个类的实例，是提供一个公有的构造方法。有另外一种技术获取实例，它应该在每个程序员的工具箱里。类可以提供一个公有的静态工厂方法，就是一个简单的静态方法，它会返回这个类的实例。这里有一个来自`Boolean`(原生类型boolean的包装类)类的简单例子，这个方法将一个原生类型的布尔值转换成一个Boolean对象引用：
<!--more-->
>对于一个类来说，若想让客户端能够获取到其实例，传统⽅式是提供⼀个公有的构造⽅法。 实际上，还有另外一种技术应该成为每个程序员⼯具箱的一部分。类可以提供⼀个公有的静态⼯厂方法，它仅仅是一个可以返回类实例的静态⽅法⽽已。如下这个简单的示例来⾃于 Boolean(即boolean装箱后的类型)。该方法会将⼀个boolean原⽣值转换为⼀一个Boolean对象引用:

>The traditional way for a class to allow a client to obtain an instance is to provide a public constructor. There is another technique that should be a part of every programmer’s toolkit. A class can provide a public static factory method, which is simply a static method that returns an instance of the class. Here’s a simple example from Boolean (the boxed primitive class for boolean). This method translates a boolean primitive value into a Boolean object reference:

```java
public static Boolean valueOf(boolean b) {
   return b ? Boolean.TRUE : Boolean.FALSE;
}
```


注意静态工厂方法和设计模式[Gamma95]里的`工厂方法模式`并不一样，这里描述的静态工厂方法跟设计模式没有关联。

>请注意，上面这个静态⼯厂⽅法与设计模式[Gamma95]中的⼯厂方法模式并不一样。本条款所介绍的静态⼯厂⽅法在设计模式一书中并没有直接的等价物。
>
>Note that a static factory method is not the same as the Factory Method pattern from Design Patterns [Gamma95]. The static factory method described in this item has no direct equivalent in Design Patterns.

一个类可以提供静态工厂方法给它的客户端以替代构造方法。用静态工厂方法替代构造方法既有好处，也有坏处。

>除了了公有构造方法外，类还可以向其客户端提供静态⼯厂方法。相⽐于公有构造方法来说，提供静态⼯厂⽅法有利也有弊。

>A class can provide its clients with static factory methods instead of, or in addition to, public constructors. Providing a static factory method instead of a public constructor has both advantages and disadvantages.

**静态工厂方法的一个好处是不像构造方法，它们有方法名字**。如果是构造方法，它的参数并不能描述构造方法返回的实例，但是有一个好名字的静态工厂方法更好理解，也让客户端代码更有易读性。举个例子，构造方法**BigInteger(int, int, Random)**返回一个可能为质数的BigInteger，用静态工厂方法**BigInteger.probablePrime**(此方法在 Java 4中加入)可能会更好表达它的意思。
>静态⼯厂⽅法的一个好处在于，相⽐于构造方法来说，他们拥有名字。如果构造方法的参数本身没有描述出将要返回的对象，那么拥有恰当名字的静态⼯厂将会更加易于使用，所生成的客户端代码的可读性也更好。比如说，构造方法BigInteger(int, int, Random)会返回⼀一个可能为质数的BigInteger，不不过使⽤用静态⼯厂方法BigInteger.probablePrime的表述性会更更棒(该⽅法是在Java 4中被加⼊进来的)。
>
>One advantage of static factory methods is that, unlike constructors, they have names. If the parameters to a constructor do not, in and of themselves, describe the object being returned, a static factory with a well-chosen name is easier to use and the resulting client code easier to read. For example, the constructor BigInteger(int, int, Random), which returns a BigInteger that is probably prime, would have been better expressed as a static factory method named BigInteger.probablePrime. (This method was added in Java 4.)

一个类只能有一个相同签名的构造方法。程序员知道如何绕过这个限制，那就是提供2个构造方法，但是参数的顺序不一样。这是很糟糕的主意，用户永远不能记住哪个构造方法是哪个，然后会不小心调用到错误的构造方法。人们在读代码的时候如果不看类的文档也不会知道这些构造方法干了些什么。
>一个类只能拥有唯⼀一个具有给定签名的构造⽅法。程序员们已经知道如何绕过这个限制了， 那就是提供两个构造方法，这两个构造方法之间唯一的差别就是参数列列表中参数类型的顺序是不同的。这是一个⾮常差劲的想法。这种API的使用者永远都记不住哪个构造⽅法是哪个，最终陷⼊到调用了错误的构造⽅法的窘境。当⽤户阅读了使用这种构造⽅法的代码时，他们在不查阅类文档的情况下是不可能搞清楚代码到底在做什么事情。
>
>A class can have only a single constructor with a given signature. Program- mers have been known to get around this restriction by providing two constructors whose parameter lists differ only in the order of their parameter types. This is a really bad idea. The user of such an API will never be able to remember which constructor is which and will end up calling the wrong one by mistake. People reading code that uses these constructors will not know what the code does without referring to the class documentation.

因为它们有名字，静态工厂方法没有前面提到的限制。如果一个类需要多个相同签名的构造方法，用静态工厂方法替代构造方法，~~并小心地给它们取名字以标记它们的不同之处~~。
>由于拥有名字，因此静态⼯厂方法不会遇到上面所讨论的限制。当⼀个类需要多个拥有相同签名的构造方法时，只需使⽤静态⼯厂⽅法来代替构造方法，<font color='red'>并精心选择好名字来明确他们之间的差别即可。</font>
>
>Because they have names, static factory methods don’t share the restriction discussed in the previous paragraph. In cases where a class seems to require multiple constructors with the same signature, replace the constructors with static factory methods <font color='red'>and carefully chosen names to highlight their differences.</font>

**静态工厂方法的第二个好处是不像构造方法，它们不需要每次被调用的时候都创建一个新的对象。**这允许不可变对象（条款17）用一个预设好的实例，~~或者缓存一个已经创建好的实例~~，这样可以反复的分发它们来避免创建不必要的重复对象。**Boolean.valueOf(boolean)**方法~~说明~~了这种技巧：它永远不创建对象。这种技巧跟享元模式比较相似，如果相同的对象经常被请求到，它可以大幅度地提升性能，特别是当创建对象开销很大的时候。
>静态⼯厂⽅法的第2个好处在于，相⽐比于构造⽅法来说，他们不必在每次调用时都创建⼀个新的对象。这样就可以让不变类使⽤用预先构造好的实例，<font color='red'>或是在构造时将其缓存起来</font>，从⽽避免了创建不必要的重复对象的情况。Boolean.valueOf(boolean)⽅法就**使用**了这项技术: 它永远不会创建对象。该项技术类似于享元模式。如果经常需要请求同样的对象，那么这种做法将会极大改进性能，特别是在对象创建成本很高的情况下更是如此。
>
>A second advantage of static factory methods is that, unlike constructors, they are not required to create a new object each time they’re invoked. This allows immutable classes (Item 17) to use preconstructed instances, <font color='red'>or to cache instances as they’re constructed</font>, and dispense them repeatedly to avoid creating unnecessary duplicate objects. The Boolean.valueOf(boolean) method **illustrates** this technique: it never creates an object. This technique is similar to the Flyweight pattern [Gamma95]. It can greatly improve performance if equivalent objects are requested often, especially if they are expensive to create.

~~静态工厂方法返回经常被请求的同一个对象的能力允许类在任何时刻都对这些实例维持严格的控制~~。能做到这样的类被称为实例受控的类。~~有很多理由去写实例受控的类~~，实例受控允许一个类保证它是单例的（条款3）或者不可实例化（条款4）。而且，它能让一个不可变的值类（条款17）保证不会有2个相等的实例存在：有且只有当a == b时候，才会有a.equals(b)。这是享元模式的基础，枚举也提供了这种保证。

><font color='red'>静态⼯厂⽅法可以在重复调⽤的情况下返回同一个对象的能力使得类可以在任何时候都能严格控制哪些实例可以存在</font>。采取这种做法的类叫做实例控制。<font color='red'>编写实例控制类有几个原因</font>。 借助于实例控制，类可以确保它⾃身是一个单例或是不可实例化的。此外，还可以让不可变的值类确保不会存在两个相等的实例:当且仅当a == b时，a.equals(b)才为true。这是享元模式的基础。枚举类型提供了这种保证。
>
><font color='red'>The ability of static factory methods to return the same object from repeated invocations allows classes to maintain strict control over what instances exist at any time.</font> Classes that do this are said to be instance-controlled. <font color='red'>There are several reasons to write instance-controlled classes.</font> Instance control allows a class to guar- antee that it is a singleton (Item 3) or noninstantiable (Item 4). Also, it allows an immutable value class (Item 17) to make the guarantee that no two equal instances exist: a.equals(b) if and only if a == b. This is the basis of the Flyweight pattern [Gamma95]. Enum types (Item 34) provide this guarantee.


**静态工厂方法第三个好处是不像构造方法，它们可以返回它返回类型的任何子类的对象。**这给你了很大的灵活性去选择返回对象的类型。

>静态⼯厂⽅法的第3个好处在于，相比于构造方法来说，他们可以返回所声明的返回类型的任何子类型的对象。这样，我们在选择所返回的对象类型时就拥有了更大的灵活性。
>
>A third advantage of static factory methods is that, unlike constructors, they can return an object of any subtype of their return type. This gives you great flexibility in choosing the class of the returned object.

~~灵活性的一种应用是一个API可以返回非公有类的对象。用这种方式隐藏类的实现提供了很紧凑的API。这种技术适用于基于接口的框架(interface-based frameworks 条款20)，接口为静态工厂方法提供了自然的返回类型。~~

><font color='red'>这种灵活性的⼀个应⽤用场景就是API能够在无需将类声明为公有的情况下就可以返回对象。 以这种⽅式隐藏实现类使得API变得⾮常紧凑。这项技术也被应⽤用到了基于接口的框架中， 其中接口就为静态⼯厂⽅法提供了了⾃然⽽然的返回类型。
>
>One application of this flexibility is that an API can return objects without making their classes public. Hiding implementation classes in this fashion leads to a very compact API. This technique lends itself to interface-based frameworks (Item 20), where interfaces provide natural return types for static factory methods.</font>

在Java 8之前，接口不能有静态方法。按照惯例，`Type`接口的静态工厂方法会被放进叫做`Types`的不可实例化的伴生类中(noninstantiable companion class)。例如，Java集合框架对它们自己的接口有45个实用的实现，提供不可变的集合，同步的集合等等。差不多所有的实现都是通过静态工厂方法导出到一个不可实例化的类中（java.util.Collections），所有返回对象的类都是非公有的。
>在Java 8之前，接口是不能拥有静态方法的。根据约定，针对名为Type的接口的静态⼯厂⽅法会被放到名为Types的不可实例例化的伴生类当中。⽐如说，Java集合框架有接⼝的45个辅助实现，提供了不可修改的集合、同步集合等等。⼏乎所有这些实现都是通过⼀个不可实例化的类(java.util.Collections)中的静态⼯厂⽅方法公开的。所返回对象的类型都是⾮公有的。
>
>Prior to Java 8, interfaces couldn’t have static methods. By convention, static factory methods for an interface named Type were put in a noninstantiable companion class (Item 4) named Types. For example, the Java Collections Framework has forty-five utility implementations of its interfaces, providing unmodifiable collections, synchronized collections, and the like. Nearly all of these implemen- tations are exported via static factory methods in one noninstantiable class (java.util.Collections). The classes of the returned objects are all nonpublic.


~~集合框架API比导出45个独立的公共类要小得多，每个类都有一个方便的实现~~。减少的不仅仅是大量的API，还有概念的权重: 程序员为了使用API必须掌握的概念的数量和难度。~~程序员知道返回的对象精确地具有其接口指定的API~~，所以不需要阅读额外的实现类的类文档。此外，用这种静态工厂方法需要客户端通过接口引用返回的对象，而不是通过实现类引用，这通常是很好的实践（条款64）。

><font color='red'>集合框架API要⽐它本来的样⼦小很多，它公开了45个独立的公有类，每个类都针对于⼀个便捷的实现</font>。这并不仅仅只是API的数量少了，更为重要的是概念上的数量少了:程序员使用API所需掌握的概念的数量和难度都降低了了。<font color='red'>程序员知道所返回的对象是由其接口API所精确描述的</font>，因此⽆需再去阅读实现类的⽂档了。此外，使用这种静态工厂⽅法要求客户端引用接口而非实现类所返回的对象，这通常来说是⼀个很好的实践。
>
><font color='red'>The Collections Framework API is much smaller than it would have been had it exported forty-five separate public classes, one for each convenience implementation</font>. It is not just the bulk of the API that is reduced but the conceptual weight: the number and difficulty of the concepts that programmers must master in order to use the API. <font color='red'>The programmer knows that the returned object has precisely the API specified by its interface</font>, so there is no need to read additional class documentation for the implementation class. Furthermore, using such a static factory method requires the client to refer to the returned object by interface rather than implementation class, which is generally good practice (Item 64).

对Java8来说，接口不能包含静态方法的限制已经被移除了，所以没有理由为接口提供一个不可实例化的伴生类。许多这样的类中的公有静态成员变量应该放在接口中。但是，请注意，这些静态方法的一些实现代码还是有必要放在一个单独包级别的私有类中。这是因为Java8要求所有接口的静态成员都是公有的。Java 9允许私有的静态方法，但是静态变量和静态成员类仍然只能是公有的。

>Java 8已经取消了接口中不能包含静态⽅法的限制，这样一般来说，我们就没必要再为接⼝提供不可实例化的伴生类了。很多本应该位于这种类中的公有静态成员现在应该放到接⼝自身当中了。不过，值得注意的是，我们还是需要将这些静态⽅法的实现代码放到单独的包级别的私有类中。这是因为Java 8要求接口的所有静态成员都必须是公有的。Java 9允许私有的静态方法，不过静态字段与静态成员类依旧得是公有的。
>
>As of Java 8, the restriction that interfaces cannot contain static methods was eliminated, so there is typically little reason to provide a noninstantiable companion class for an interface. Many public static members that would have been at home in such a class should instead be put in the interface itself. Note, however, that it may still be necessary to put the bulk of the implementation code behind these static methods in a separate package-private class. This is because Java 8 requires all static members of an interface to be public. Java 9 allows private static methods, but static fields and static member classes are still required to be public.

**静态工厂的第四个好处是返回对象的类型作为输入参数的函数，它可以随调用的不同而变化。**所声明返回类型的任何子类型都是被允许的。~~返回对象的类型也可以随着版本的变化而变化。~~

>**静态⼯厂的第4个好处在于，作为输入参数的函数，返回对象所属的类会随着调⽤用的不同而不同**。所声明的返回类型的任何子类型都是允许的。返回对象所属的类也会随着调⽤的不同而不不同。
>
>A fourth advantage of static factories is that the class of the returned object can vary from call to call as a function of the input parameters. Any sub- type of the declared return type is permissible. The class of the returned object can also vary from release to release.

**EnumSet**类（条款36）没有公有的构造方法，只有静态工厂。在**OpenJDK**的实现里，他们会返回2个子类中的一个实例，这取决于枚举类型的长度：~~如果它有64以下个元素，那么大多数枚举类型会返回**RegularEnumSet**的实例~~，底层是用一个long实现的；如果枚举类型有超过65个元素，那么静态工厂方法会返回**JumboEnumSet**的实例，底层是用一个long数组实现的。
>
>EnumSet类(条款36)并没有公有构造⽅方法，只有静态工厂。在OpenJDK实现中，他们会返回两个子类的实例，到底返回哪⼀一个则取决于底层枚举类型的⼤小:<font color='red'>如果拥有的元素数量小于等于64个(这也是⼤大多数枚举类型的情况)，那么静态⼯厂就会返回⼀个RegularEnumSet实例</font>，其底层是个long类型;如果枚举类型拥有的元素数量⼤于等于65个，那么⼯厂就会返回⼀个JumboEnumSet实例，其底层是个long类型的数组。
>
>The EnumSet class (Item 36) has no public constructors, only static factories. In the OpenJDK implementation, they return an instance of one of two subclasses, depending on the size of the underlying enum type: <font color='red'>if it has sixty-four or fewer elements, as most enum types do, the static factories return a RegularEnumSet instance</font>, which is backed by a single long; if the enum type has sixty-five or more elements, the factories return a JumboEnumSet instance, backed by a long array.


这2个实现类对客户端来说是不可见的，~~如果**RegularEnumSet**停止对小枚举类型提供高性能的优势~~，它可以在未来的发布中被移除掉，且不会有什么副作用。同样地，在将来的发布中也可以添加第三种或者第四种**EnumSet**的实现，如果能带来性能上的提升。客户端也不需要关心从工厂获得的对象类型是什么；他们只需要知道那是**EnumSet**的某个子类。

>这两个实现类对于客户端来说是不可见的。如果RegularEnumSet对于小的枚举类型不再有性能上的优势，那么就可以在未来的版本中将其剔除而不会产⽣生任何副作用。与之类似，如果经过验证能够提供更好的性能，那么未来的版本中就可以增加第3种或是第4种EnumSet实现。客户端既不不知晓，也不不关⼼心他们从⼯厂中所得到的对象的真正类型是什么;他们只关 ⼼所得到的是EnumSet的某个⼦类。
>
>The existence of these two implementation classes is invisible to clients. <font color='red'>If RegularEnumSet ceased to offer performance advantages for small enum types</font>, it could be eliminated from a future release with no ill effects. Similarly, a future release could add a third or fourth implementation of EnumSet if it proved beneficial for performance. Clients neither know nor care about the class of the object they get back from the factory; they care only that it is some subclass of EnumSet.


~~**静态工厂的第五个好处是当返回对象的类包含了需要的方法，这个类不需要存在。**~~这样灵活的静态工厂方法是服务提供者框架（*service provider frameworks*）的基础，就像**Java Database Connectivity API (JDBC)**。~~一个服务提供者框架是系统提供一个服务的实现~~，系统让实现对客户端可用，对客户端实现进行解耦。

><font color='red'>静态⼯厂的第5个好处在于，在使用包含了方法的类时，返回对象所属的类不必事先存在。</font> 这种灵活的静态工厂方法构成了服务提供者框架的基础，比如说Java Database Connectivity API(JDBC)。<font color='red'>服务提供者框架是这样一种系统，提供者实现了某个服务，系统将其实现公开给客户端</font>，从⽽实现了客户端与实现之间的解耦。
>
><font color='red'>A fifth advantage of static factories is that the class of the returned object need not exist when the class containing the method is written.</font> Such flexible static factory methods form the basis of service provider frameworks, like the Java Database Connectivity API (JDBC). <font color='red'>A service provider framework is a system in which providers implement a service, and the system makes the implementations available to clients</font> decoupling the clients from the implementations.

服务提供者框架有三个基本的组件：一个服务接口，代表一个实现；一个提供者注册的API，提供用来注册实现；一个服务访问API，客户端用来获得一个服务的实例。客户端访问API可能会允许客户端指定一个特定的标准来选择一个实现。如果没有这样的标准，API会返回一个默认实现的实例，或者让客户端遍历所有可用的实现。服务访问API是灵活的静态工厂，构成了服务提供者框架的基础。

>服务提供者框架存在3个基本组件:服务接口(表示实现)、提供者注册API(提供者通过它来注册实现)以及服务访问API(客户端通过它来获取服务实例例)。客户端可以通过服务访问API来指定标准，从⽽而选择相应的实现。如果不存在这样的标准，那么API就会返回默认实现的实例，或是让客户端遍历所有可用的实现。服务访问API是一种灵活的静态⼯厂，它构成了服务提供者框架的基础。
>
>There are three essential components in a service provider framework: a service interface, which represents an implementation; a provider registration API, which providers use to register implementations; and a service access API, which clients use to obtain instances of the service. The service access API may allow clients to specify criteria for choosing an implementation. In the absence of such criteria, the API returns an instance of a default implementation, or allows the client to cycle through all available implementations. The service access API is the flexible static factory that forms the basis of the service provider framework.

服务提供者框架的第四个可选组件是服务提供者接口，它描述了生产服务接口实例的工厂对象。在没有服务提供者接口的情况下，实现必须以反射的方式实例化（条款65）。在JDBC中，**Connection**扮演了服务接口，DriverManager.registerDriver是提供者注册API，DriverManager.getConnection是服务访问API，Driver是服务提供者接口。

>服务提供者框架第4个可选的组件是服务提供者接口，它描述了了⽤于⽣产服务接口实例的⼯⼚对象。如果服务提供者接口不存在，那么实现就必须要通过反射的方式来实例化(条款 65)。对于JDBC来说，Connection就扮演着服务接⼝的⻆色， DriverManager.registerDriver是提供者注册API，DriverManager.getConnection是服务访问 API，而Driver则是服务提供者接口。
>
>An optional fourth component of a service provider framework is a service provider interface, which describes a factory object that produce instances of the service interface. In the absence of a service provider interface, implementations must be instantiated reflectively (Item 65). In the case of JDBC, Connection plays the part of the service interface, DriverManager.registerDriver is the provider registration API, DriverManager.getConnection is the service access API, and Driver is the service provider interface.

有许多服务提供者框架的变种。例如，服务访问API可以向客户端返回一个比服务提供者供应的更丰富的接口。这是*桥接模式*。依赖注入框架可以被认为是一个很强的服务提供者，从Java6开始，平台包含了一个~~强大~~的服务提供者框架，**java.util.ServiceLoader**，所以你不需要通常也不应该自己写一个（条款59）。JDBC不用ServiceLoader，因为它更早发布。
>服务提供者框架模式有很多变种。⽐如说，服务访问API可以向客户端返回比提供者所规定的更为宽泛的服务接口。这就是桥接模式[Gamma95]。依赖注⼊框架(条款5)可以看作是一种强大的服务提供者。从Java 6开始，平台包含了一个<font color='red'>通⽤</font>的服务提供者框架，即 java.util.ServiceLoader。因此，你无需，通常来说也不应该再编写⾃己的了(条款59)。 JDBC并未使用ServiceLoader，因为前者出现的时间要更早⼀些。
>
>There are many variants of the service provider framework pattern. For exam- ple, the service access API can return a richer service interface to clients than the one furnished by providers. This is the Bridge pattern [Gamma95]. Dependency injection frameworks (Item 5) can be viewed as powerful service providers. Since Java 6, the platform includes a <font color='red'>general-purpose</font> service provider framework, java.util.ServiceLoader, so you needn’t, and generally shouldn’t, write your own (Item 59). JDBC doesn’t use ServiceLoader, as the former predates the latter.

仅提供静态工厂方法的主要限制是，没有公有或受保护构造函数的类不能被子类化。例如，~~子类化集合框架的实现类就很方便(翻译的什么鬼)~~。可以说这是一种因祸得福的做法，因为它鼓励程序员用组合而不是继承（条款18），并且对于不可变类是必须的。

>只提供静态⼯厂方法的主要限制在于，没有公有或是受保护构造⽅法的类是⽆法被⼦子类化的。
⽐如说，<font color='red'>我们⽆法子类化集合框架中的任何便捷实现类</font>。另一方面，这么做会⿎鼓励程序员们使⽤用组合⽽而⾮继承(条款18)，并且这对于不变类型来说也是需要的(条款17)。
>The main limitation of providing only static factory methods is that classes without public or protected constructors cannot be subclassed. For example, <font color='red'>it is impossible to subclass any of the convenience implementation classes in the Collections Framework</font>. Arguably this can be a blessing in disguise because it encourages programmers to use composition instead of inheritance (Item 18), and is required for immutable types (Item 17).

静态工厂方法的第二个缺点是程序员很难找到它们。它们在API文档中不像构造函数那样清晰，因此很难弄清楚如何用提供的静态工厂方法实例化一个类而不是构造函数。~~Javadoc工具某一天可能将注意力转换到静态工厂方法上~~。与此同时，~~你可以通过在类或接口的静态工厂方法的文档上引起注意(<font color='red'>是多注意文档里的静态工厂方法</font>)~~，以及遵守通用命名约定来减少这个问题。下面是一些静态工厂方法的常见名称，这个列表还远远不够详尽：

>静态⼯厂方法的第2个缺点在于，程序员们很难找到他们。他们并不像构造⽅法那样在API⽂档中有清楚的说明，这样对于既提供静态⼯厂⽅法，⼜提供构造方法的类来说，我们就很难知晓到底该⽤那种⽅式来实例化它。可能在未来的某⼀一天，Javadoc工具会<font color='red'>重视</font>起静态⼯厂方法。与此同时，<font color='red'>你可以多注意到类或接⼝文档中的静态⼯厂</font>并坚持使用常见的命名约定来减少此类问题的发生。如下是静态工⼚方法的一些常⻅见名字，这个列表只是部分，还不不完全:
>
>A second shortcoming of static factory methods is that they are hard for programmers to find. They do not stand out in API documentation in the waythat constructors do, so it can be difficult to figure out how to instantiate a class that provides static factory methods instead of constructors. The Javadoc tool may someday draw attention to static factory methods. In the meantime, you can reduce this problem by <font color='red'>drawing attention to static factories in class or interface documentation</font> and by adhering to common naming conventions. Here are some common names for static factory methods. This list is far from exhaustive:

* **form**--一个*类型转换方法*接受单个参数，并返回这个类型一个相应的实例，例如：

	`Date d = Date.from(instant);`
* **of**--一个*聚合方法*接受多个参数，并返回一个组装他们的类型的实例，例如：

	`Set<Rank> faceCards = EnumSet.of(JACK, QUEEN, KING);`
	
* **valueOf**--from和of的一种冗长的形式，例如：

	`BigInteger prime = BigInteger.valueOf(Integer.MAX_VALUE);`

* **instance或者getInstance**--根据它的参数返回一个实例，但是他们不是相同的值，例如：

	`StackWalker luke = StackWalker.getInstance(options);`

* **create或者newInstance**--跟instance或者getInstance是一样的，但是方法能保证每次返回的都是新的实例，例如：

	`Object newArray = Array.newInstance(classObject, arrayLen);`

* **getType**--和getInstance一样，但是这个工厂方法是用在另外一个不同的类中。**Type**是工厂方法返回对象的类型。例如：

	`FileStore fs = Files.getFileStore(path);
`

* **newType**--和newInstance一样，但是这个工厂方法是用在另外一个不同的类中。**Type**是工厂方法返回对象的类型。例如：

	`BufferedReader br = Files.newBufferedReader(path);`

* **type**--getType和newType的一种另外一种简介的形式，例如：

	`List<Complaint> litany = Collections.list(legacyLitany);`
	
总之，静态工厂方法和公有的构造方法都有各自的用途，理解它们的有点是值得的。通常静态工厂更好，所以避免在没有首先考虑静态工厂的情况下提供公有的构造方法。

>总结⼀一下，静态⼯厂方法与公有的构造方法都有各自的适用场景，我们需要理解他们各自的优点。通常，静态⼯厂是优先选择的，这样可以避免习惯性地在没有考虑静态⼯厂的情况下
就提供公有构造⽅方法的情况发⽣生。
>
>In summary, static factory methods and public constructors both have their uses, and it pays to understand their relative merits. Often static factories are preferable, so avoid the reflex to provide public constructors without first consid- ering static factories.