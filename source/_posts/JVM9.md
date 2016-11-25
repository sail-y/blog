title: JVM9-虚拟机字节码执行引擎
date: 2016-11-15 16:53:50
tags: [JVM,java]
categories: JVM
---

执行引擎是Java虚拟机最核心的组成部分之一，本章将主要从概念模型的角度来讲解虚拟机的方法调用和字节码执行。
## 运行时栈帧结构
栈帧（Stack Frame）是用于支持虚拟机进行方法代用和方法执行的数据结构，它是虚拟机运行时数据区中的[虚拟机栈](http://sail-y.github.io/2016/10/28/JVM2/#Java虚拟机栈)的栈元素。栈帧存储了局部变量表、操作数栈、动态链接、方法出口等信息。每一个方法从调用开始至执行完成的过程，都对应着一个栈帧在虚拟机里面从入栈到出栈的过程。对于执行引擎来说，在活动线程中，只有位于栈顶的栈帧才是有效的，称为当前栈帧，与这个栈帧相关联的方法称为当前方法，执行引擎运行的所有字节码指令都只针对当前栈帧进行操作，在概念模型上，点醒的栈帧结构图如下：
<!--more-->
![](http://7xs4nh.com1.z0.glb.clouddn.com/jvm-9-1.jpeg)
### 局部变量表
局部变量表是一组变量值存储空间，用于存放**参数**和**方法内部**定义的局部变量。局部变量表的容量以变量槽（Slot）为最小单位。虚拟机规范中没有明确指明一个Slot应占用的内存空间大小，只是向导性的说到每个Slot都应该能存放一个boolean、byte、char、short、int、float、reference和returnAddress。reference表示对一个对象实例的引用，returnAddress目前很少见了。一个Slot可以存放一个32位以内的数据，那么64位的long和double会被分配两个连续的Slot空间。		
实例方法第0位索引的Slot默认是用于传递方法所属对象实例的引用（this），然后从1开始是方法参数，参数表分配完后再是方法体内部的变量。		
前面提到过，类变量在**准备阶段**会赋予系统初始值，**初始化阶段**赋予程序员定义的初始值，所以就算没有设值也会又一个默认值，但局部变量则不一样，没有设值变进行使用的话，编译无法通过。

```java
public static void main(String[] args) {
	int a;
	System.out.println(a);
}
```
### 操作数栈
操作数栈也常称为操作栈，它是一个后入先出栈。操作数栈的每一个元素可以是任意的Java数据类型，包括long和double。32位的数据类型所占的栈容量为1，64为数据类型所占的栈容量为2。		
当一个方法刚刚开始执行的时候，这个方法的操作数栈是空的，在方法的执行过程中，会有各种字节码指令往操作数栈中写入和提取内容，也就是出栈/入栈操作。举个例子，整数加法的字节码指令iadd在运行的时候操作数栈中最接近栈顶的两个元素已经存入了两个int类型的数值，当执行这个指令时，会将这两个int值出栈并想家，然后将加的结果入栈。

### 动态连接
每个栈帧都包含一个指向运行时常量池中该栈帧所属方法的引用，持有这个引用是为了支持方法调用过程中的动态连接。我们知道Class文件的常量池中存有大量的符号引用，字节码中的方法调用指令就以常量池中指向方法的符号引用作为参数。这些符号引用会在类加载阶段或者第一次使用的时候就转化为直接引用，这种转化称为[静态解析](http://sail-y.github.io/2016/11/07/JVM8/#解析)。另外一部分将在每一次运行期间转化为直接引用，这部分称为动态连接。

### 方法返回地址
当一个方法开始执行后，只有两种方式退出方法，要么遇到方法返回的字节码指令，要么是在方法执行过程中遇到了异常。无论哪种退出方式，在方法退出后，都需要返回到方法被调用的位置，程序才能继续执行，方法返回时可能需要再栈帧中保存一些信息，用来帮助恢复它的上层方法的执行状态。

## 方法调用
方法调用并不等同于方法执行，方法调用阶段唯一的任务就是确定被调用方法的版本（即调用哪一个方法），暂时还不涉及方法内部的具体运行过程。

### 解析
所有方法调用中的目标方法在Class文件里面都是一个常量池中的符号引用，在类加载解析阶段，会将其中一部分符号引用转化为直接引用，这个前提是调用目标在程序代码写好、编译器进行编译时必须确定下来。这类方法的调用称为解析（Resolution）。

在Java语言符合“编译期可知，运行期不可变”的方法主要包括静态方法和私有方法。

调用方法的虚拟机字节码指令：

* invokestatic：调用静态方法
* invokespecial：调用实例构造器<init>方法、私有方法和父类方法
* invokevirtual：调用所有的虚方法
* invokeinterface：调用接口方法，会在运行时再确定一个实现此接口的对象
* invokedynamic：先在运行时动态解析出调用点限定符所引用的方法，然后再执行该方法，在此之前的4条调用指令，分派逻辑是固话在Java虚拟机内部的，而invokedynamic指令的分派逻辑是由用户所设定的引导方法决定的。

能invokestatic和invokespecial指令调用的方法，能在解析阶段把符号引用转化为直接引用，这些方法称为非虚方法，其他方法称为虚方法（final除外）。被final修饰的虽然是用invokevirtual调用的，但是它是一个非虚方法。

### 分派
分派调用可能是静态的也可能是动态的，又可分为单分派和多分派。
	
#### 静态分派
先上一段代码

```java

/**
 * Created by YangFan on 2016/11/16 上午11:14.
 * <p/>
 * 静态分派演示
 */
public class StaticDispatch {
    static abstract class Human {

    }

    static class Man extends Human {

    }

    static class Woman extends Human {

    }

    public void sayHello(Human guy) {
        System.out.println("hello, guy");
    }



    public void sayHello(Woman guy) {
        System.out.println("hello, lady");
    }


    public void sayHello(Man guy) {
        System.out.println("hello, gentleman");
    }

    public static void main(String[] args) {
        Human man = new Man();
        Human woman = new Woman();
        StaticDispatch sd = new StaticDispatch();
        sd.sayHello(man);
        sd.sayHello(woman);
    }
}

```

运行结果：

```plain
hello, guy
hello, guy
```
很简单，下面从虚拟机的角度来讲解一下。

	Human man = new Man();
上面的“Human”称为变量的静态类型（Static Type），后面的“Man”称为变量的实际类型（Actual Type）。静态类型在编译期是可知的，实际类型变化的结果在运行期才可确定。**虚拟机（编译器）在重载时是通过参数的静态类型而不是实际类型作为判定依据的**，所以选了sayHello(Human)作为调用目标，并把这个方法的符号引用写到main()方法里的两条invokevirtual指令的参数中。

所有依赖**静态类型**来定位方法执行版本的分派动作称为静态分派。

### 动态分派
动态分派和多态的重写有着密切的关联。

```java

/**
 * Created by YangFan on 2016/11/16 下午3:25.
 * <p/>
 * 方法动态分派演示
 */
public class DynamicDispatch {
    static abstract class Human {
        protected abstract void sayHello();
    }

    static class Man extends Human {
        @Override
        protected void sayHello() {
            System.out.println("man say hello");
        }
    }

    static class Woman extends Human {
        @Override
        protected void sayHello() {
            System.out.println("woman say hello");
        }
    }

    public static void main(String[] args) {
        Human man = new Man();
        Human woman = new Woman();
        man.sayHello();
        woman.sayHello();
        man = new Woman();
        man.sayHello();
    }
}

```
运行结果：

```plain
man say hello
woman say hello
woman say hello
```
我们用javap -c 命令看看输出结果

```plain
  public static void main(java.lang.String[]);
    Code:
       0: new           #2                  // class polymorphic/DynamicDispatch$Man
       3: dup
       4: invokespecial #3                  // Method polymorphic/DynamicDispatch$Man."<init>":()V
       7: astore_1
       8: new           #4                  // class polymorphic/DynamicDispatch$Woman
      11: dup
      12: invokespecial #5                  // Method polymorphic/DynamicDispatch$Woman."<init>":()V
      15: astore_2
      16: aload_1
      17: invokevirtual #6                  // Method polymorphic/DynamicDispatch$Human.sayHello:()V
      20: aload_2
      21: invokevirtual #6                  // Method polymorphic/DynamicDispatch$Human.sayHello:()V
      24: new           #4                  // class polymorphic/DynamicDispatch$Woman
      27: dup
      28: invokespecial #5                  // Method polymorphic/DynamicDispatch$Woman."<init>":()V
      31: astore_1
      32: aload_1
      33: invokevirtual #6                  // Method polymorphic/DynamicDispatch$Human.sayHello:()V
      36: return

```

0~15行的字节码是准备动作，作用是建立man和woman的内存空间、调用Man和Woman类型的实例构造器，将这两个实例的引用存放在第1、2个局部变量Slot之中，这个动作对应了这两句代码。

```java
Human man = new Man();
Human woman = new Woman();
```
然后16~21行是关键。16: aload_1和20: aload_2两句分别将两个对象压入栈顶，17和21的invokevirtual就是调用方法指令，后面的是参数（方法的符号引用）。那么多态如何确定执行的目标方法，下面说一下invokevirtual指令的运行时解析过程：

1. 找到操作数栈的第一个元素所指向的对象的实际类型，记作C。
2. 如果在类型C中找到与常量中的描述符和简单名称都相符的方法，则进行访问权限校验，如果通过则反悔这个方法的直接引用，查找过程结束；如果不通过，则反悔java.lang.IllegalAccessError异常。
3. 否则，按照继承关系从下网上一次对C的各个父类进行第2步的搜索和验证过程。
4. 如果始终没有找到合适的方法，则抛出java.lang.AbstracMethodError异常。

由于invokevirtual指令执行的第一步就是在运行期确定接收者的实际类型，所以两次调用中的invokevirtual指令把常量池中的类方法符号引用解析到了不同的直接引用上，这个过程就是Java语言中方法重写的本质。我们把这种在运行期根据实际类型确定方法执行版本的过程称为动态分派。

### 单分派与多分派
方法的接收者与方法的参数统称为方法的宗量。根据分派基于多少种宗量，可以将分派划分为单分派和多分派两种。单分派是根据一个宗量对目标方法进行选择，多分派则是根据多于一个宗量对目标方法进行选择。
看代码
```java

/**
 * Created by YangFan on 2016/11/16 下午5:07.
 * <p/>
 * 单分派、多分派演示
 */
public class Dispatch {
    static class QQ {}

    static class _360 {}

    public static class Father {
        public void hardChoice(QQ arg) {
            System.out.println("father choose qq");
        }

        public void hardChoice(_360 arg) {
            System.out.println("father choose 360");
        }

    }

    public static class Son extends Father {
        public void hardChoice(QQ arg) {
            System.out.println("son choose qq");
        }

        public void hardChoice(_360 arg) {
            System.out.println("son choose 360");
        }

    }

    public static void main(String[] args) {
        Father father = new Father();
        Father son = new Son();
        father.hardChoice(new _360());
        son.hardChoice(new QQ());
    }

}
```
运行结果：

```plain
father choose 360
son choose qq
```

编译阶段，也就是静态分派的过程，先确定静态类型是Father还是Son，再确定参数是QQ还是360，因为是根据两个宗量进行选择，所以Java语言的静态分派是多分派类型。

运行阶段，也就是动态分派的过程，在执行“son.hardChoice(new QQ());”对应的invokevirtual指令时，由于编译期已决定目标方法的签名必须为hardChoice(QQ),所以只需要确定方法接收者的实际类型是Father还是Son。因为只有一个宗量作为选择依据，所以Java语言的动态分派属于单分派类型。
