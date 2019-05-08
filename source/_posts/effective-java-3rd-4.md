---
title: Effective Java 第三版-条款4_通过私有构造方法强制禁止类的实例化类型
tags: [java]
date: 2019-04-24 16:14:38
categories: Effective Java
---

# 条款4_通过私有构造方法强制禁止类的实例化类型

>Occasionally you’ll want to write a class that is just a grouping of static methods and static fields. Such classes have acquired a bad reputation because some people abuse them to avoid thinking in terms of objects, but they do have valid uses. They can be used to group related methods on primitive values or arrays, in the manner of java.lang.Math or java.util.Arrays. They can also be used to group static methods, including factories (Item 1), for objects that implement some interface, in the manner of java.util.Collections. (As of Java 8, you can also put such methods in the interface, assuming it’s yours to modify.) Lastly, such classes can be used to group methods on a final class, since you can’t put them in a subclass.		
>有时，你想要编写⼀个只包含⼀组静态⽅法和静态字段的类。这种类有⼀个不太好的名声，因为有些⼈会滥⽤他们，不从对象的⻆度来思考，⽽是坚信他们的想法是正确⽆误的。他们可⽤于将针对原⽣值或是数组的⽅法划分到⼀起，⽐如说java.lang.Math或是java.util.Arrays；还可以将静态⽅法划分到⼀起，包括⼯⼚（条款1），⽤于实现了某个接⼝的对象，⽐如说java.util.Collections（从Java 8开始，如果想要⾃⼰修改，那么你还可以将这类⽅法放到接⼝中）。最后，还可以将针对终态类的⽅法划分到⼀起，因为你⽆法再将他们放到⼦类中了。

偶尔你会想写一个只有一组静态字段和静态方法的类。这样的类得到了一个坏的名声，因为有人会滥用他们，不从对象的角度思考，但它们有正确的用法。它们可以将原生只或数组的相关方法组合到一起，比如**java.lang.Math**或者**java.util.Arrays**。还可以将静态方法组合到一起，包括工厂（条款1），或是实现了某些接口的对象，比如说**java.util.Collections**，（在Java 8中，如果你想自己修改，你可以将这类方法放到接口中）。最后，可以将终态类上的方法进行分组，因为不能将它们放在子类中。


>Such utility classes were not designed to be instantiated: an instance would be nonsensical. In the absence of explicit constructors, however, the compiler provides a public, parameterless default constructor. To a user, this constructor is indistinguishable from any other. It is not uncommon to see unintentionally instantiable classes in published APIs.		
>这种辅助类在设计时是不希望被实例化的：实例本身是毫⽆意义的。不过，如果没有显式指定构造⽅法，那么编译器就会提供⼀个公有、⽆參的默认构造⽅法。对于⽤户来说，该构造⽅法很难与其他构造⽅法区分开来。我们常常会在已发布的APIs中看到⽆意中被实例化的类。

这样的工具类不被设计成可实例化的：实例是没有意义的。虽然没有显式的构造器，但是编译器会提供一个无参，公共的默认构造器。~~对用户来说，这个构造器是不易察觉的。在已发布的API中无意中可实例化的类里不常见。~~

>**Attempting to enforce noninstantiability by making a class abstract does not work**. The class can be subclassed and the subclass instantiated. Furthermore,it misleads the user into thinking the class was designed for inheritance (Item 19). There is, however, a simple idiom to ensure noninstantiability. A default constructor is generated only if a class contains no explicit constructors, so a class can be made noninstantiable by including a private constructor:		
>通过将⼀个类设置为抽象类来强制禁⽌类的实例化是⾏不通的。类可以被⼦类化，⽽⼦类是可以实例化的。此外，这么做会对⽤户产⽣误导，让⽤户误以为这个类的设计⽬的是为了继承（条款19）。然⽽，有⼀种简单的⽅式可以确保类⽆法被实例化。如果⼀个类中没有显式指定构造⽅法，那么会⽣成⼀个默认构造⽅法，因此通过在类中增加⼀个私有构造⽅法就可以确保类⽆法被实例化了。


试图通过抽象类来强制禁止实例化是行不通的。类可以被子类化，然后实例化子类。此外，它会误导用户这个类是被设计用来继承的（条款19）。但是，有一个简单的做法来确保类不被实例化。默认构造器只会在一个类不包含的显式的构造器的时候才会被生成，所以类包含一个私有的构造器就可以变为不可实例化的。

```java
// Noninstantiable utility class
public class UtilityClass {
// Suppress default constructor for noninstantiability
private UtilityClass() {
throw new AssertionError();
}
... // Remainder omitted
}
```

>Because the explicit constructor is private, it is inaccessible outside the class. The AssertionError isn’t strictly required, but it provides insurance in case the constructor is accidentally invoked from within the class. It guarantees the class will never be instantiated under any circumstances. This idiom is mildly counterintuitive because the constructor is provided expressly so that it cannot be invoked. It is therefore wise to include a comment, as shown earlier.		
>由于显式构造⽅法是私有的，因此它在类的外部是⽆法被访问到的。AssertionError并不是⼀定要加的，不过如果在类的内部不⼩⼼被调⽤的话，它会提供⼀种保证。它可以确保在任何情况下类都是绝对⽆法被实例化的。这种⽅式有点⼉违背直觉，因为提供构造⽅法的⽬的仅仅是为了⾃⼰不能被调⽤。更好的做法则是加上⼀些注释说明，正如上述代码所做的那样。

因为显式的构造器是私有的，在类的外面是不可见的。这里的AssertionError不是严格要求的，但是它提供了保险预防构造器被意外的从类内部调用。它保证了类在任何情况下都不会被实例化。这个做法有点违反直觉，~~因为构造函数是明确提供的，但是不能调用它。~~因此，如前的代码一样，包含注释是明智的。


>As a side effect, this idiom also prevents the class from being subclassed. All constructors must invoke a superclass constructor, explicitly or implicitly, and a
subclass would have no accessible superclass constructor to invoke.		
>这种做法的⼀个副作⽤则是类也⽆法被⼦类化了。所有构造⽅法都得显式或隐式调⽤⽗类构造⽅法，⽽⼦类在这种情况下没有可访问到的⽗类构造⽅法去调⽤。

~~有个副作用，这个做法也会阻止一个类被子类化。~~所有的构造器都会显式的或隐式的调用父类的构造器，而子类没有可访问的父类构造器去调用。


