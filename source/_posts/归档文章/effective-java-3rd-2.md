---
title: Effective Java 第三版-条款2_当面对很多构造方法参数时，请考虑使用构建器
tags: [java]
date: 2019-03-20 20:24:33
categories: Effective Java
---

原文->翻译->对比


>Static factories and constructors share a limitation: they do not scale well to large numbers of optional parameters. Consider the case of a class representing the Nutrition Facts label that appears on packaged foods. These labels have a few required fields—serving size, servings per container, and calories per serving— and more than twenty optional fields—total fat, saturated fat, trans fat, cholesterol, sodium, and so on. Most products have nonzero values for only a few of these optional fields.

<!--more-->

静态工厂和构造方法都有一个限制：他们的伸缩性很差当有太多可选参数的情况。考虑有这样一个类，Nutrition Facts--食物的营养成分表。这些标签有一些必要的字段，比如每份的分量，每份的容量，每份的卡路里以及超过20个可选的字段，例如脂肪，饱和脂肪，反式脂肪，胆固醇，钠等等。大多数产品只有其中少量字段是非0的。

>静态⼯⼚与构造⽅法有⼀个共通的限制：当存在⼤量的可选参数时，他们的可伸缩性很差。考虑这样⼀个类，它表示贴在包装好的⻝品上的营养表标签。这些标签有⼀些必要的字段，如分量⼤⼩、每瓶容量以及每份的卡路⾥数，还有20多个可选字段，如总脂肪量、饱和脂肪酸、反式脂肪酸、胆固醇及钠元素等等。对于⼤多数产品来说，只有少量的这些可选字段有⾮零值。

>What sort of constructors or static factories should you write for such a class? Traditionally, programmers have used the telescoping constructor pattern, in which you provide a constructor with only the required parameters, another with a single optional parameter, a third with two optional parameters, and so on, culminating in a constructor with all the optional parameters. Here’s how it looks in practice. For brevity’s sake, only four optional fields are shown:

对于这样一个类你应该写什么样的构造方法或者静态工厂呢？通常程序员会用重叠的构造方法模式，就是提供一个有必要参数的构造方法，第二个构造方法多一个可选参数，第三个构造多两个可选参数...这样一直叠下去。最后一个构造方法拥有所有的可选参数。为简洁起见只写4个可选参数：

>对于这样⼀个类来说，你应该编写哪种构造⽅法或是静态⼯⼚呢？传统上，程序员们会使⽤重叠构造⽅法模式，在这种模式中，你会提供⼀个只接收必要参数的构造⽅法，然后编写⼀个接收单个可选参数的构造⽅法，再编写⼀个接收两个可选参数的构造⽅法，以此类推，最后提供⼀个接收所有可选参数的构造⽅法。如下代码示例就说明了这⼀点。出于简洁的⽬的，这⾥只给出了4个可选字段：


```java
// Telescoping constructor pattern - does not scale well!
public class NutritionFacts {
    private final int servingSize; // (mL) required
    private final int servings;
    private final int calories;
    private final int fat;
    private final int sodium;
    private final int carbohydrate; // (g/serving)

    public NutritionFacts(int servingSize, int servings) {
        this(servingSize, servings, 0);
    }

    public NutritionFacts(int servingSize, int servings, int calories) {
        this(servingSize, servings, calories, 0);
    }

    public NutritionFacts(int servingSize, int servings,
		        int calories, int fat) {
		    this(servingSize, servings, calories, fat, 0)
	}

    public NutritionFacts(int servingSize, int servings, int calories, int fat, int sodium) {
        this(servingSize, servings, calories, fat, sodium, 0);
    }

    public NutritionFacts(int servingSize, int servings, int calories, int fat, int sodium, int carbohydrate) {
        this.servingSize = servingSize;
        this.servings = servings;
        this.calories = calories;
        this.fat = fat;
        this.sodium = sodium;
        this.carbohydrate = carbohydrate;
    }
}
```

>When you want to create an instance, you use the constructor with the shortest parameter list containing all the parameters you want to set:

当你想创建一个实例，你用参数列表最少的一个构造方法来包含所有你想设置的参数：

>在创建实例时，你可以使⽤包含了所要设置的所有参数的最短参数列表构造⽅法：

```java
NutritionFacts cocaCola =
	new NutritionFacts(240, 8, 100, 0, 35, 27);
```
>Typically this constructor invocation will require many parameters that you don’t
want to set, but you’re forced to pass a value for them anyway. In this case, we passed a value of 0 for fat. With “only” six parameters this may not seem so bad,
but it quickly gets out of hand as the number of parameters increases. 

显然这个构造方法的调用会要求一些你并不想设置的参数，但是你必须传一个值给它。在这个例子中，我们传了一个0给fat。“只有”6个参数看起来也许还不太糟，但是随着参数的数量增加它很快就失控了。

>⼀般来说，这个构造⽅法调⽤需要很多你并不想设置的参数，但却不得不为其传值。在这种情况下，我们为fat传递了0值。上述代码『只有』6个参数，看起来还不算太糟糕，不过随着参数数量的增加，很快你就数不过来了。



>In short, the telescoping constructor pattern works, but it is hard to write client code when there are many parameters, and harder still to read it. The reader is left wondering what all those values mean and must carefully count parameters to find out. Long sequences of identically typed parameters can cause subtle bugs. If the client accidentally reverses two such parameters, the compiler won’t complain, but the program will misbehave at runtime (Item 51).

简而言之，重叠的构造方法模式可以用，但是当参数太多的时候，不便于写客户端代码，代码可读性也不好。读者会很疑惑这些值代表什么意思，必须小心的看这些参数。长长的相同类型的参数会导致一些隐藏的bug。如果客户端不小心写反了2个参数，编译器不会报错，但是程序会在运行时出现错误的行为(条款51)。

>⼀⾔以蔽之，重叠构造⽅法模式可以⽤，但当参数数量过多时，客户端代码的编写就变得愈发困难，阅读起来也更费劲。阅读者会想，所有这些值是什么意思，并且要⼩⼼地检查参数才能知道结果。⻓⻓的同类型参数序列会导致⾮常隐秘的Bug。如果客户端不⼩⼼改变了这样两个参数的顺序，那么编译器是不知情的，不过程序在运⾏期则会表现出错误的⾏为（条款51）。

>A second alternative when you’re faced with many optional parameters in a constructor is the JavaBeans pattern, in which you call a parameterless constructor to create the object and then call setter methods to set each required parameter and each optional parameter of interest:

当你处理太多可选参数的时候，第二个选择是用JavaBeans模式，先用无参构造方法创建一个对象，然后再调用setter方法来设置所有必须的参数和可选参数：

>当构造⽅法中存在⼤量可选参数时，另⼀种解决⽅案是JavaBeans模式。在这种模式下，你会通过⼀个⽆参构造⽅法来创建对象，接下来调⽤setter⽅法设置每个必填参数与所需要的每个可选参数：

```java
// JavaBeans Pattern - allows inconsistency, mandates mutability
public class NutritionFacts {
    // Parameters initialized to default values (if any)
    private int servingSize = -1; // Required; no default value
    private int servings = -1; // Required; no default value
    private int calories = 0;
    private int fat = 0;
    private int sodium = 0;
    private int carbohydrate = 0;

    public NutritionFacts() {
    }

    // Setters
    public void setServingSize(int val) {
        servingSize = val;
    }

    public void setServings(int val) {
        servings = val;
    }

    public void setCalories(int val) {
        calories = val;
    }

    public void setFat(int val) {
        fat = val;
    }

    public void setSodium(int val) {
        sodium = val;
    }

    public void setCarbohydrate(int val) {
        carbohydrate = val;
    }
}
```

>This pattern has none of the disadvantages of the telescoping constructor pattern. It is easy, if a bit wordy, to create instances, and easy to read the resulting code:

这个模式没有重叠的构造器模式的缺点。它很简单，就是对于创建一个对象来说有一些啰嗦，下面的代码很容易阅读：

>该模式没有重叠构造⽅法模式的缺点。通过这种⽅式可以轻松创建实例（就是稍微有点冗⻓），并且代码读起来也⽐较容易：

```java
NutritionFacts cocaCola = new NutritionFacts();
cocaCola.setServingSize(240);
cocaCola.setServings(8);
cocaCola.setCalories(100);
cocaCola.setSodium(35);
cocaCola.setCarbohydrate(27);
```

>Unfortunately, the JavaBeans pattern has serious disadvantages of its own. Because construction is split across multiple calls, a JavaBean may be in an inconsistent state partway through its construction. The class does not have the option of enforcing consistency merely by checking the validity of the constructor parameters. Attempting to use an object when it’s in an inconsistent state may cause failures that are far removed from the code containing the bug and hence difficult to debug. A related disadvantage is that the JavaBeans pattern precludes the possibility of making a class immutable (Item 17) and requires added effort on the part of the programmer to ensure thread safety.

不幸的是，JavaBeans模式有它自己的缺点。因为构造被拆分成了很多调用，一个JavaBean在构造的过程中可能会进入一个不一致的状态。~~Class无法通过检查构造器的参数来确保参数的一致性。~~尝试用一个处于不一致的状态中的对象可能会导致一些跟代码无关的bug，并且很难调试。一个关联的缺点是JavaBeans模式没有制作不可变类的能力，需要程序员额外的努力来保证线程安全。

>但遗憾的是，JavaBeans模式⾃身存在严重的缺陷。由于构造过程被划分为多个调⽤，因此JavaBean在构造过程中可能会处于⼀种不⼀致的状态下。类仅仅通过检查构造⽅法参数的有效性是⽆法确保⼀致性的。当对象处于不⼀致状态时，使⽤这个对象会导致难以觉察的Bug，这种Bug也极难调试。与之相关的另⼀个缺陷就是JavaBeans模式⽆法确保⼀个类的不变性（条款17），并且需要程序员⾃⼰确保线程安全性。

>It is possible to reduce these disadvantages by manually “freezing” the object when its construction is complete and not allowing it to be used until frozen, but this variant is unwieldy and rarely used in practice. Moreover, it can cause errors at runtime because the compiler cannot ensure that the programmer calls the freeze method on an object before using it.

在对象构造完成后手动冻结它，在解冻之前不允许使用，是有可能减少这些缺点的，但是这种方式很难操作，在实践中很少使用。而且，这也会导致一些运行时错误，因为编译器不能保证程序员在使用对象之前调用它的冻结方法。

>当构造完毕时，我们可以通过⼿⼯『冻结』对象并且直到冻结后才允许使⽤对象来消除这些缺陷，不过这种做法很少使⽤。此外，这么做会导致运⾏期错误，因为编译器⽆法确保程序员在使⽤对象前会调⽤对象的冻结⽅法。

>Luckily, there is a third alternative that combines the safety of the telescoping constructor pattern with the readability of the JavaBeans pattern. It is a form of the Builder pattern [Gamma95]. Instead of making the desired object directly, the client calls a constructor (or static factory) with all of the required parameters and gets a builder object. Then the client calls setter-like methods on the builder object to set each optional parameter of interest. Finally, the client calls a parameterless build method to generate the object, which is typically immutable. The builder is typically a static member class (Item 24) of the class it builds. Here’s how it looks in practice:

幸运的是，有第三种选择，那就是把安全的重叠的构造方法模式和可读性好的JavaBeans模式组合在一起。它是构建器模式[Gamma95]的一种形式。相比直接构建一个需要的对象，客户端用所有需要的参数调用构造方法（或静态工厂）来得到一个构建器对象。然后客户端调用构建器对象类似setter的方法来设置所有想要的可选参数。最后，客户端调用一个无参的build方法来生成一个不可变对象。构建器是这个类本身的一个静态成员类（条款24）。下面是代码：

>幸好，还有⼀种⽅案融合了重叠构造⽅法模式的安全性与JavaBeans模式的可读性。它是⼀种构建器模式[Gamma95]。相⽐于直接创建所需的对象，客户端会调⽤⼀个构造⽅法（或是静态⼯⼚），该构造⽅法带有所需的参数，并且得到⼀个构建器对象。接下来，客户端会对构建器对象调⽤类似于setter的⽅法来设置每⼀个感兴趣的可选参数。最后，客户端会调⽤⼀个⽆参的build⽅法来⽣成对象，该对象是个不变对象。构建器通常是它所构建的类的⼀个静态成员类（条款24）。如下代码展示了其使⽤⽅式：


```java
// Builder Pattern
public class NutritionFacts {
    private final int servingSize;
    private final int servings;
    private final int calories;
    private final int fat;
    private final int sodium;
    private final int carbohydrate;

    public static class Builder {
        // Required parameters
        private final int servingSize;
        private final int servings;
        // Optional parameters - initialized to default values
        private int calories = 0;
        private int fat = 0;
        private int sodium = 0;
        private int carbohydrate = 0;

        public Builder(int servingSize, int servings) {
            this.servingSize = servingSize;
            this.servings = servings;
        }

        public Builder calories(int val) {
            calories = val;
            return this;
        }

        public Builder fat(int val) {
            fat = val;
            return this;
        }

        public Builder sodium(int val) {
            sodium = val;
            return this;
        }

        public Builder carbohydrate(int val) {
            carbohydrate = val;
            return this;
        }

        public NutritionFacts build() {
            return new NutritionFacts(this);
        }
    }

    private NutritionFacts(Builder builder) {
        servingSize = builder.servingSize;
        servings = builder.servings;
        calories = builder.calories;
        fat = builder.fat;
        sodium = builder.sodium;
        carbohydrate = builder.carbohydrate;
    }
}
```

> The NutritionFacts class is immutable, and all parameter default values are in one place. The builder’s setter methods return the builder itself so that invocations can be chained, resulting in a fluent API. Here’s how the client code looks:

NutritionFacts类是不可变的，并且所有的参数默认值都在一个地方。构建器的setter方法返回构建器本身，所以调用可以是链式的，这就是流式API（fluent API)。下面是客户端代码：

>NutritionFacts类是不可变的，所有的参数默认值都在⼀个地⽅。构建器的setter⽅法返回的是构建器⾃身，这样调⽤就可以链接起来，形成⼀种流式API。如下展示了客户端代码的样⼦：

```java
NutritionFacts cocaCola = new NutritionFacts.Builder(240, 8)
           .calories(100).sodium(35).carbohydrate(27).build();
```

>This client code is easy to write and, more importantly, easy to read. The Builder pattern simulates named optional parameters as found in Python and Scala.				
>Validity checks were omitted for brevity. To detect invalid parameters as soon as possible, check parameter validity in the builder’s constructor and methods. Check invariants involving multiple parameters in the constructor invoked by the build method. To ensure these invariants against attack, do the checks on object fields after copying parameters from the builder (Item 50). If a check fails, throw an IllegalArgumentException (Item 72) whose detail message indicates which parameters are invalid (Item 75).

这种客户端代码易于编写，更重要的是易于阅读。构建器模式模拟了Python和Scala里的具名可选参数。					
为了简洁有效性检查被省略了。为了尽快检测到不合法的参数，要在构建器的构造方法和方法里校验参数的合法性。在build方法中调用的构造方法里检查涉及的多个参数的不变性。从builder复制这些参数过来后再执行检查（条款50），以确保这些不变性不被攻击。如果检查失败了，抛一个IllegalArgumentException，它的详细消息要说明是哪一个参数不合法（条款75）。

>上述客户端代码编写起来很容易，更为重要的是，阅读起来也⾮常轻松。**构建器模式模拟了Python与Scala中的具名可选参数。**
>出于简洁的⽬的，这⾥省略了有效性检查。为了能尽快检测出⽆效参数，请在构建器的构造⽅法与⽅法中检查参数的有效性。不变性检查涉及到由build⽅法所调⽤的构造⽅法中的多个参数。为了确保这些不变参数真正能够做到不变，请在从构建器中复制完参数后就对对象字段进⾏检查（条款50）。如果检查失败，那就要抛出IllegalArgumentException异常（条
款72），异常的详细信息标识出了哪些参数是⽆效的（条款75）。

---

>The Builder pattern is well suited to class hierarchies. Use a parallel hierarchy of builders, each nested in the corresponding class. Abstract classes have abstract builders; concrete classes have concrete builders. For example, consider an abstract class at the root of a hierarchy representing various kinds of pizza:

构建器模式非常适合类继承。构建器采用一个平行的层次，每一个都嵌套在相应的类里。抽象类有抽象的构建器；子类有子类的构建器。例如，考虑有这样一个抽象类，它是各种披萨的一个根类：

>构建器模式⾮常适合于类继承。使⽤平⾏的构建器层次体系，每个都嵌套在对应的类中。抽象类有抽象构建器；具体类有具体构建器。⽐如说，考虑如下这个抽象类，它是层次体系的根，表示各种类型的披萨：


```java
// Builder pattern for class hierarchies
public abstract class Pizza {
    public enum Topping {
        HAM, MUSHROOM, ONION, PEPPER, SAUSAGE
    }

    final Set<Topping> toppings;

    abstract static class Builder<T extends Builder<T>> {
        EnumSet<Topping> toppings = EnumSet.noneOf(Topping.class);

        public T addTopping(Topping topping) {
            toppings.add(Objects.requireNonNull(topping));
            return self();
        }

        abstract Pizza build();

        // Subclasses must override this method to return "this"
        protected abstract T self();
    }

    Pizza(Builder<?> builder) {
        toppings = builder.toppings.clone(); // See Item 50
    }
}
```

>Note that Pizza.Builder is a generic type with a recursive type parameter (Item 30). This, along with the abstract self method, allows method chaining to work properly in subclasses, without the need for casts. This workaround for the fact that Java lacks a self type is known as the simulated self-type idiom.

注意Pizza.Builder是一个有可递归参数的泛型类（条款30）。~~这样，连同抽象类本身的方法一样，在子类中方法的链式调用也可以工作的很好，不需要类型转换~~。对于Java缺乏自类型这一事实，这种解决方法称为模拟自类型.

>注意到Pizza.Builder是个泛型类型，它有⼀个递归的类型参数（条款30）。通过该参数以及抽象的self⽅法可以让⽅法在⼦类中恰当地链接起来，⽽⽆需进⾏类型转换。这种对于Java缺乏⾃我类型问题的解决⽅案叫做模拟的⾃我类型。

>Here are two concrete subclasses of Pizza, one of which represents a standard New-York-style pizza, the other a calzone. The former has a required size parameter, while the latter lets you specify whether sauce should be inside or out:

下面是Pizza的两个具体子类，一个是标准的纽约风格披萨，另一个是半月披萨。前面的有一个必要的size参数，而后者允许你指定sauce（沙司）应该在里面还是外面：

>如下是两个具体的Pizza⼦类，⼀个代表标准的纽约⻛格披萨，另⼀个代表半圆形烤乳酪披萨。前者有⼀个必填的size参数，后者则可以指定将沙司加在⾥⾯还是外⾯：


```java
public class NyPizza extends Pizza {
    public enum Size {
        SMALL, MEDIUM, LARGE
    }

    private final Size size;

    public static class Builder extends Pizza.Builder<Builder> {
        private final Size size;

        public Builder(Size size) {
            this.size = Objects.requireNonNull(size);
        }

        @Override
        public NyPizza build() {
            return new NyPizza(this);
        }

        @Override
        protected Builder self() {
            return this;
        }
    }

    private NyPizza(Builder builder) {
        super(builder);
        size = builder.size;
    }
}

public class Calzone extends Pizza {
    private final boolean sauceInside;

    public static class Builder extends Pizza.Builder<Builder> {
        private boolean sauceInside = false; // Default

        public Builder sauceInside() {
            sauceInside = true;
            return this;
        }

        @Override
        public Calzone build() {
            return new Calzone(this);
        }

        @Override
        protected Builder self() {
            return this;
        }
    }

    private Calzone(Builder builder) {
        super(builder);
        sauceInside = builder.sauceInside;
    }
}
```

>Note that the build method in each subclass’s builder is declared to return the correct subclass: the build method of NyPizza.Builder returns NyPizza, while the one in Calzone.Builder returns Calzone. This technique, wherein a subclass method is declared to return a subtype of the return type declared in the superclass, is known as covariant return typing. It allows clients to use these builders without the need for casting.

注意build方法在每一个子类的构建器里都被声明为返回了正确的子类型：NyPizza.Builder的build方法返回NyPizza，Calzone.Builder里的返回Calzone。这种在子类方法中声明返回一个**父类声明返回的类型的子类**的技术，被称为返回类型协变。可以让客户端不需要类型转换就能使用构建器。

>注意到每个⼦类构建器中的build⽅法都被声明为返回正确的⼦类：NyPizza.Builder的build⽅法返回NyPizza，Calzone.Builder的build⽅法则返回Calzone。这种⼦类⽅法声明为返回⽗类⽅法所声明的返回类型的⼦类型的技术叫做协变返回类型。客户端可以通过这项技术在不借助于类型转换的情况下使⽤这些构建器。

--

>The client code for these “hierarchical builders” is essentially identical to the code for the simple NutritionFacts builder. The example client code shown next assumes static imports on enum constants for brevity:

这些有继承关系的构建器的客户端代码基本上跟简单的NutritionFacts构建器的代码是一样的。下面的客户端代码例子假设静态导入了枚举常量：

>这些『层次化构建器』的客户端代码本质上与简单的NutritionFacts构建器客户端代码别⽆⼆致。出于简洁的⽬的，如下的示例客户端代码假设已经静态导⼊了枚举常量

```java
NyPizza pizza = new NyPizza.Builder(SMALL)
           .addTopping(SAUSAGE).addTopping(ONION).build();
Calzone calzone = new Calzone.Builder()
       .addTopping(HAM).sauceInside().build();
```

>A minor advantage of builders over constructors is that builders can have multiple varargs parameters because each parameter is specified in its own method. Alternatively, builders can aggregate the parameters passed into multiple calls to a method into a single field, as demonstrated in the addTopping method earlier.

构建器相对构造方法的一个小优势是构建器可以有多个可变参数，因为每个参数都指定在它自己的方法里。或者，构建器可以将用多个方法调用传递的参数聚合到单个字段中，如前面的addTopping方法所示。

>相⽐于构造⽅法来说，构建器的⼀个⼩⼩的优势在于构建器可以拥有多个可变参数，这是因为每个参数都是在⾃⼰的⽅法中指定的。此外，构建器可以将传递给多个调⽤的参数聚合起来，并通过⼀个⽅法传给单个字段，这⼀点在之前的addTopping⽅法中已经介绍过了。

--

>The Builder pattern is quite flexible. A single builder can be used repeatedly to build multiple objects. The parameters of the builder can be tweaked between invocations of the build method to vary the objects that are created. A builder can fill in some fields automatically upon object creation, such as a serial number that increases each time an object is created.

构建器模式是很灵活的。一个单独的构建器可以被重复用来构建多个对象。构建器的参数可以在build方法的调用之间进行调整，以更改创建的对象。一个构建器可以在对象创建的时候自动填写一些字段，比如每次在对象创建的时候生成一个自增的序列号。

>构建器模式是相当灵活的。单个构建器可以重复多次使⽤来构建多个对象。构建器的参数可以在build⽅法的调⽤之间进⾏调整以改变所创建的对象。构建器可以在对象创建时⾃动填充⼀些字段，⽐如说每次创建⼀个对象时递增的序列号等

--

>The Builder pattern has disadvantages as well. In order to create an object, you must first create its builder. While the cost of creating this builder is unlikely to be noticeable in practice, it could be a problem in performance-critical situations. Also, the Builder pattern is more verbose than the telescoping constructor pattern, so it should be used only if there are enough parameters to make it worthwhile, say four or more. But keep in mind that you may want to add more parameters in the future. But if you start out with constructors or static factories and switch to a builder when the class evolves to the point where the number of parameters gets out of hand, the obsolete constructors or static factories will stick out like a sore thumb. Therefore, it’s often better to start with a builder in the first place.

构建器也有一些缺点。为了创建一个对象，你必须先创建一个构建器。~~虽然创建构建器的开销不像实际中那样显著~~，但是在一些高性能的场景下也可能会是个问题。并且，构建器模式比重叠的构造方法更冗长，所以它只应该在有很多参数的时候才值得使用，比如说4个以上。但是请记住你也许在未来会想添加更多的参数。~~如果你刚开始用构造方法或者工厂方法，当类的参数数量发展到不可控制的时候再替换成构建器，废弃的构造方法和静态工厂会像一个疼痛的拇指一样突出。~~因此，最好在一开始的时候就用构建器。

>构建器模式也有⾃身的缺点。为了创建对象，你必须要先创建其构建器。虽然在实际情况中，创建构建器的成本并不是很⾼，但在性能关键的情况下这就会导致问题了。此外，构建器模式要⽐重叠的构造⽅法模式更加冗⻓，这样只有在参数数量⾜够多的情况下使⽤构建器模式才是值得的，⽐如说4个以上的参数。不过请记住，你可能会在未来增加更多的参数。但如果⼀开始使⽤的是构造⽅法或是静态⼯⼚，当参数数量变得很多时，想要切换到构建器，那么显⽽易⻅，会遗留很多废弃的构造⽅法或是静态⼯⼚。因此，更好的做法则是⼀开始就使⽤构建器。

--

>In summary, the Builder pattern is a good choice when designing classes whose constructors or static factories would have more than a handful of parameters, especially if many of the parameters are optional or of identical type. Client code is much easier to read and write with builders than with telescoping constructors, and builders are much safer than JavaBeans.

总结一下，当设计的类的构造方法或者静态工厂有太多参数的时候，构建器模式是一个好的选择，特别是当大多数参数都是可选的，或者相同的类型。构建器的客户端代码会比重叠的构造器更容易编写和阅读，而且构建器比JavaBeans更安全。

>总的来说，在设计类时，如果构造⽅法或是静态⼯⼚有很多参数，那么构建器模式就是个很好的选择，特别是当很多参数都是可选的，或是类型相同的情况下更是如此。相⽐于重叠的构造⽅法来说，构建器的客户端代码的读写都会更加轻松，⽽且要⽐JavaBeans更加安全。
