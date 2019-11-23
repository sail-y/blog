---
title: Effective Java 第三版-3条款3_强制对单例属性使用私有构造方法或是枚举类型
tags: [java]
date: 2019-03-21 21:08:04
categories: Effective Java
---

# 条款3：强制对单例属性使用私有构造方法或是枚举类型

>A *singleton* is simply a class that is instantiated exactly once [Gamma95]. Singletons typically represent either a stateless object such as a function (Item 24) or a system component that is intrinsically unique. **Making a class a singleton can make it difficult to test its clients** because it’s impossible to substitute a mock implementation for a singleton unless it implements an interface that serves as its type.		
<!--more-->
>所谓单例，指的是只会实例化⼀次的类[Gamma95]。单例要么表示⼀个⽆状态的对象（⽐
如说函数，条款25），要么表示⼀个本质上独⼀⽆⼆的系统组件。将⼀个类设定为单例会使得其客户端难以测试，这是因为我们⽆法为单例替换模拟实现，除⾮它实现了作为其类型的接⼝。

单例是只实例化一次的简单类[Gamma95]。单例通常要么是一个无状态的对象，比如一个~~功能~~，要么是系统内固有且唯一的组件。类变成单例后会让他的客户端很难测试，因为无法为单例模拟一个替代的实现，除非这个类实现了一个接口作为它的类型。

>There are two common ways to implement singletons. Both are based on keeping the constructor private and exporting a public static member to provide access to the sole instance. In one approach, the member is a final field:

>有两种常⻅的⽅式来实现单例。他们的做法都是将构造⽅法设为私有，并导出⼀个公有的静态成员来提供对唯⼀实例的访问。在第⼀种⽅式中，成员是个final字段：

有两种常规方式实现单例模式。都是让构造方法保持私有，输出一个公共的静态成员以提供访问唯一的实例。一种实现的方法是成员是一个final的字段：

```java
// Singleton with public final field
public class Elvis {
   public static final Elvis INSTANCE = new Elvis();
   private Elvis() { ... }
   public void leaveTheBuilding() { ... }
}
```

>The private constructor is called only once, to initialize the public static final field Elvis.INSTANCE. The lack of a public or protected constructor guarantees a “monoelvistic” universe: exactly one Elvis instance will exist once the Elvis class is initialized—no more, no less. Nothing that a client does can change this, with one caveat: a privileged client can invoke the private constructor reflectively (Item 65) with the aid of the AccessibleObject.setAccessible method. If you need to defend against this attack, modify the constructor to make it throw an exception if it’s asked to create a second instance.

>私有构造⽅法只会被调⽤⼀次，⽤于初始化public static final字段Elvis.INSTANCE。由于缺乏公有或是受保护的构造⽅法，因此这可以确保⼀种『独占的』世界：当实例化Elvis类时，只有唯⼀⼀个Elvis实例会存在——不多也不少。⽆论客户端怎么做都⽆法改变这⼀点，只不过我还是要警告⼀下：授权的客户端可以通过反射来调⽤私有构造⽅法（条款65），借助于AccessibleObject.setAccessible⽅法即可做到。如果需要防范这种情况，请修改构造⽅法，使得在通过构造⽅法创建第⼆个实例时抛出异常。

私有的构造方法只会被调用一次，用来初始化public static final修饰的字段Elvis.INSTANCE。没有public和protected的构造方法保证了实例的唯一性：不多不少，在Elvis类初始化后只会有一个Elvis的实例存在。客户端做的任何事情都不能改变这一点，但是有一点要注意：有特权的客户端可以在AccessibleObject.setAccessible方法的帮助下，反射（条款65）调用private的构造方法。~~你需要防御这种攻击~~，修改构造方法，当它创建第二个的实例的抛出一个异常。

>In the second approach to implementing singletons, the public member is a static factory method:

>在实现单例的第⼆种⽅式中，公有成员是个静态⼯⼚⽅法：

实现单例模式的第二种方法是public成员是一个静态的工厂方法：

```java
// Singleton with static factory
public class Elvis {
private static final Elvis INSTANCE = new Elvis(); private Elvis() { ... }
public static Elvis getInstance() { return INSTANCE; }
   public void leaveTheBuilding() { ... }
}
```

>All calls to Elvis.getInstance return the same object reference, and no other Elvis instance will ever be created (with the same caveat mentioned earlier).

>所有对Elvis.getInstance的调⽤都会返回相同的对象引⽤，不会再创建其他的Elvis实例（请不要忘记上⾯提到的警告）。

所有Elvis.getInstance的调用都会返回相同的对象引用，不会有其他的Elvis实例被创建（除了前面提到过的特殊方式）

>The main advantage of the public field approach is that the API makes it clear that the class is a singleton: the public static field is final, so it will always contain the same object reference. The second advantage is that it’s simpler.

>采⽤公有字段⽅式的主要优点在于，通过API我们就可以很清晰地看到类是个单例：public static字段是final的，这样它就总是包含着同样的对象引⽤。第⼆个优点则是它更加简单。

公共字段这种方法的主要好处是API清楚的表明这个类就是一个单例类：public static修饰的字段是final的，所以它始终都包含同一个对象引用。~~第二种方法的好处~~则是它更简单。

>One advantage of the static factory approach is that it gives you the flexibility to change your mind about whether the class is a singleton without changing its API. The factory method returns the sole instance, but it could be modified to return, say, a separate instance for each thread that invokes it. A second advantage is that you can write a generic singleton factory if your application requires it (Item 30). A final advantage of using a static factory is that a method reference can be used as a supplier, for example Elvis::instance is a Supplier<Elvis>. Unless one of these advantages is relevant, the public field approach is preferable.

>静态⼯⼚⽅式的⼀个优点在于，它赋予了你这样⼀种灵活性，即当你想要改变类的单例特性时，你⽆需修改其API。⼯⼚⽅法返回唯⼀的实例，不过你可以修改这个⽅法，使得每个线程调⽤它时都返回⼀个单独的实例。第⼆个优点则是，如果应⽤需要的话，你可以编写⼀个泛型的单例⼯⼚（条款30）。使⽤静态⼯⼚的第三个好处是，⽅法引⽤可以⽤作提供者，⽐如说Elvis::instance就是个Supplier<Elvis>。除⾮上述这些好处存在⼀定程度的相关性，否则推荐使⽤公有字段⽅式。

静态工厂的方式的一个好处是给了你很大的灵活性，你可以不用修改API就能改变一个类是否是单例的。工厂方法返回唯一的实例，但是可以在返回之前修改它，比如说每一个调用它线程都享有单独的实例。第二个好处是如果你的应用有需求的话，你可以写一个泛型的单例工厂（条款30）。最后一个好处是静态工厂可以被当做一个supplier来使用，比如Elvis::instance就是一个Supplier<Elvis>。~~除非这些好处都用不着~~，公共字段的方式才更可取。



>To make a singleton class that uses either of these approaches serializable (Chapter 12), it is not sufficient merely to add implements Serializable to its declaration. To maintain the singleton guarantee, declare all instance fields transient and provide a readResolve method (Item 89). Otherwise, each time a serialized instance is deserialized, a new instance will be created, leading, in the case of our example, to spurious Elvis sightings. To prevent this from happening, add this readResolve method to the Elvis class:

>要想让上述两种⽅式实现的单例类能够序列化（第12章），仅仅在类的声明中添加
implements Serializable是不够的。为了确保单例，请将所有实例字段声明为transient，并提供⼀个readResolve⽅法（条款89）。否则，每次当序列化的实例在反序列化时，⼀个新的实例就会被创建出来，对于我们这个示例来说，就会出现另⼀个Elvis。为了防⽌这种情况发⽣，请将如下的readResolve⽅法添加到Elvis类中:

要让使用这~~两种方法之一~~的单例类可序列化（第十二章），仅仅在声明的时候实现Serializable是不足够的。为了~~维持保证~~单例性，把所有instance的字段都用transient修饰，并且提供一个readResolve方法（条款89）。否则，序列化后的实例每次反序列化的时候都会生成一个新的实例，正如例子里的一样，~~这会导致虚假的Elvis单例~~。要避免这种情况，在Elvis类中添加readResolve方法：

```java
// readResolve method to preserve singleton property
private Object readResolve() {
    // Return the one true Elvis and let the garbage collector
    // take care of the Elvis impersonator.
   return INSTANCE;
}
```

>A third way to implement a singleton is to declare a single-element enum:

>实现单例的第三种⽅式是声明⼀个单元素的枚举：

第三种实现单例的方式是声明一个只有一个元素的枚举：

```java

// Enum singleton - the preferred approach
public enum Elvis {
   INSTANCE;
   public void leaveTheBuilding() { ... }
}
```

>This approach is similar to the public field approach, but it is more concise, provides the serialization machinery for free, and provides an ironclad guarantee against multiple instantiation, even in the face of sophisticated serialization or reflection attacks. This approach may feel a bit unnatural, but a single-element enum type is often the best way to implement a singleton. Note that you can’t use this approach if your singleton must extend a superclass other than Enum (though you can declare an enum to implement interfaces).

>该⽅式类似于公有字段⽅式，不过更加简洁，⽽且天然提供了序列化机制，能够强有⼒地保证不会出现多次实例化的情况，即便在复杂的序列化与反射场景下亦如此。该⽅式看起来有些不那么⾃然，不过单元素枚举类型通常是实现单例的最佳⽅式。注意，如果单例必须要继承⼀个⽗类⽽⾮枚举的情况下是⽆法使⽤该⽅式的（不过可以声明⼀个实现了接⼝的枚举）。

这种方式跟公开字段的方式是相似的，但是更简洁，天生自带序列化功能，为防止多次实例化提供了坚固的保证，甚至处理复杂的序列化或者反射调用时候也没有问题。这种方式可能感觉不太自然，但通常只有一个元素的枚举类是实现单例模式的最好的一种方式。注意这种方式你只能继承一个枚举类型以外的类（~~尽管~~你可以声明一个枚举去实现接口）。

