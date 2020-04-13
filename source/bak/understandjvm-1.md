---
title: 深入理解JVM01-类加载
tags: [java,JVM]
date: 2018-12-02 15:55:41
categories: JVM
---

# 类加载

在Java代码中，类型的加载、连接与初始化过程都是在程序运行期间完成的。

1. 类加载常见的行为是将磁盘上的class文件加载到内存中
2. 连接将是类与类之间的关系处理好
3. 初始化对一些静态的变量进行赋值

<!--more-->

这提供了更大的灵活性，增加了更多的可能性。

## 类加载深入剖析

加载类的工具，叫做类加载器

### Java虚拟机的生命周期

在如下几种情况，Java虚拟机将结束生命周期

* 执行了System.exit()方法
* 程序正常执行结束
* 程序在执行过程中遇到了异常或错误而异常终止
* 由于操作系统出现错误而导致Java虚拟机进程终止

## 类的加载、连续、与初始化

* 加载：查找并加载类的二进制数据
* 连接

	* 验证：确保被加载的类的正确性
	* 准备：为类的静态变量分配内存，并将其初始化为默认值
	* 解析：把类中的符号引用转换为直接引用
* 初始化：为类的静态变量赋予正确的初始值。

## 类的使用和卸载

* 使用
* 卸载

Java对类的使用方式可以分为两种，主动使用和被动使用。所有的Java虚拟机实现必须在每个类或接口被Java程序**首次主动使用**时才初始化他们，这也意味着被动使用不会初始化他们。

主动使用一共有其七种情况：

1. 创建类的实例
2. 访问某个类或接口的静态变量，或者对该静态变量赋值（getstatic,putstatic）
3. 调用类的静态方法（invokestatic）
4. 反射（如Class.forName("com.test.Test")）
5. 初始化一个类的子类
6. Java虚拟机启动时被标明为启动类的类（Java Test）
7. JDK1.7开始提供的动态语言支持：java.lang.invoke.MethodHandle实例的解析结果`REF_getStatic`，`REF_putStatic`，`REF_invokeStatic`句柄对应的类没有初始化，则初始化

除了以上其中情况，其他使用Java类的方式都被看做是对类的被动使用，都不会导致类的初始化。

## 类的加载

类的加载指的是将类的.class文件中的二进制数据读入到内存中，将其放在运行时数据区的方法区内，然后在内存中创建一个java.lang.Class对象（规范未说明Class对象位于哪里，HotSpot虚拟机将其放在了方法区中）用来封装类在方法区内的数据结构（JDK8以后没有方法区了，叫做MetaSpace）

加载.class文件的几种方式：

1. 从本地系统中直接加载
2. 通过网络下载.class文件
3. 从zip,jar等归档文件中加载.class文件
4. 从专有数据库中提取.class文件
5. 将Java源文件动态编译为.class文件

### 例1

下面给一个类加载的例子：

```java
/**
 *
 * -XX:+TraceClassLoading，用于追踪类的加载信息并打印出来
 *	
 * @author yangfan
 * @date 2018/12/03
 */
 // MyTest1就是启动类，会先加载
public class MyTest1 {
    public static void main(String[] args) {
        // 这里MyChild1里面的静态代码块并不会执行
        // 因为没有主动使用MyChild1
        // 虽然MyChild1没有初始化，但是它被加载了，在加了-XX:+TraceClassLoading参数后可以看到
        System.out.println(MyChild1.str);

        // 对于静态字段来说，只有直接定义了该字段的类才会被初始化
        // 当一个类在初始化时，要求其父类全部都已经初始化完毕
//        System.out.println(MyChild1.st2);
    }
}

class MyParent1 {
    public static String str = "hello world";

    static {
        System.out.println("MyParent1 static block");
    }
}

class MyChild1 extends MyParent1 {

    public static String st2 = "welcome";

    static {
        System.out.println("MyChild1 static block");
    }
}
```

这里用到了一个JVM参数，其实我们大多数时候，可能只是调整一下堆大小，其他的参数用得比较少，其实这个参数是有规律可循的。

`-XX:+<option>`，表示开启option选项		
`-XX:-<option>`，表示关闭option选项		
`-XX:<option>=value`，表示将option选项的值设置为value

### 例2



```java

/**
 * 用javap反编译后
 *
 * classes javap -c com.sail.jvm.classloader.MyTest2
 * Compiled from "MyTest2.java"
 * public class com.sail.jvm.classloader.MyTest2 {
 *   public com.sail.jvm.classloader.MyTest2();
 *     Code:
 *        0: aload_0
 *        1: invokespecial #1                  // Method java/lang/Object."<init>":()V
 *        4: return
 *
 *   public static void main(java.lang.String[]);
 *     Code:
 *        0: getstatic     #2                  // Field java/lang/System.out:Ljava/io/PrintStream;
 *        3: ldc           #4                  // String hello world
 *        5: invokevirtual #5                  // Method java/io/PrintStream.println:(Ljava/lang/String;)V
 *        8: return
 * }
 *
 * 助记符：
 * ldc表示将int，float或是String类型的常量值从常量池推送至栈顶
 * bipush表示将单字节(-128 ~ 127)的常量值推送至栈顶
 * sipush表示将一个短整型常量值(-32768 ~ 32767)推送至栈顶
 * iconst_1表示将int类型1推送至栈顶(iconst_m1 ~ iconst_5)
 *
 * @author yangfan
 * @date 2018/12/04
 */
public class MyTest2 {

    public static void main(String[] args) {
        System.out.println(MyParent2.str);
    }

}

class MyParent2 {
    /**
     * 在编译阶段，这个常量会存入到调用这个常量的方法所在的类的常量池中，
     * 本质上调用类并没有直接引用到定义常量的类，因此并不会触发定义常量的类的初始化
     *
     * 即str会被放置到MyTest2的常量池中，之后MyTest2与MyParent2就没有任何关系了，
     * 甚至，我们可以将MyParent2的class删除
     */
    public static final String str = "hello world";

    public static final short s = 127;

    public static final int i = 0;

    public static final int m = 6;

    static {
        System.out.println("MyParent2 static block");
    }
}

```

其实这些助记符在rt.jar里都能找到，比如iconst就在com.sun.org.apache.bcel.internal.generic.ICONST里。

### 例3

```java
/**
 * 当一个常量的值并非编译期间可以确定的，那么其值就不会被放到调用类的常量池中，
 * 这时程序在运行时，会导致主动使用这个常量所在的类，显然会导致这个类被初始化。
 * 
 * @author yangfan
 * @date 2019/03/26
 */
public class MyTest3 {
    public static void main(String[] args) {
        System.out.println(MyParent3.str);
    }
}

class MyParent3 {
    public static final String str = UUID.randomUUID().toString();

    static {
        System.out.println("MyParent3 static code");
    }
}
```

### 例4

```java
/**
 * 对于数组实例来说，其类型是由JVM在运行期动态生成的，表示为class [Lcom.sail.jvm.classloader.MyParent4
 * 这种形式。动态生成的类型，其父类型就是Object。
 * <p>
 * 对于数组来说，JavaDoc经常将构成数组的元素称为Component，实际上就是将数组降低一个未读后的类型。
 * <p>
 * 助记符：
 * anewarray：表示创建一个引用类型的（如类、接口、数组）数组，并将其引用值亚茹栈顶
 * newarray：表示创建一个指定的原始类型（如int、float、char等）的数组，并将其引用值压入栈顶
 *
 * @author yangfan
 * @date 2019/03/26
 */
public class MyTest4 {
    public static void main(String[] args) {
        // 首次主动使用
//        MyParent4 myParent4 = new MyParent4();

        // 不会输出，并没有使用
        MyParent4[] myParent4s = new MyParent4[1];
        // class [Lcom.sail.jvm.classloader.MyParent4;
        System.out.println(myParent4s.getClass());

        MyParent4[][] myParent4s1 = new MyParent4[1][1];
        // class [[Lcom.sail.jvm.classloader.MyParent4;
        System.out.println(myParent4s1.getClass());

        // class java.lang.Object
        System.out.println(myParent4s.getClass().getSuperclass());
        // class java.lang.Object
        System.out.println(myParent4s1.getClass().getSuperclass());

        System.out.println("=======");
        int[] ints = new int[1];
        // class [I
        System.out.println(ints.getClass());
        // class java.lang.Object
        System.out.println(ints.getClass().getSuperclass());

        char[] chars = new char[1];
        System.out.println(chars.getClass());
        boolean[] booleans = new boolean[1];
        System.out.println(booleans.getClass());
        short[] shorts = new short[1];
        System.out.println(shorts.getClass());
        byte[] bytes = new byte[1];
        System.out.println(bytes.getClass());
    }
}

class MyParent4 {
    static {
        // 会输出
        System.out.println("MyParent4 static block");
    }
}
/*

public class com.sail.jvm.classloader.MyTest4 {
  public com.sail.jvm.classloader.MyTest4();
    Code:
       0: aload_0
       1: invokespecial #1                  // Method java/lang/Object."<init>":()V
       4: return

  public static void main(java.lang.String[]);
    Code:
       0: iconst_1
       1: anewarray     #2                  // class com/sail/jvm/classloader/MyParent4
       4: astore_1
       5: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
       8: aload_1
       9: invokevirtual #4                  // Method java/lang/Object.getClass:()Ljava/lang/Class;
      12: invokevirtual #5                  // Method java/io/PrintStream.println:(Ljava/lang/Object;)V
      15: iconst_1
      16: iconst_1
      17: multianewarray #6,  2             // class "[[Lcom/sail/jvm/classloader/MyParent4;"
      21: astore_2
      22: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
      25: aload_2
      26: invokevirtual #4                  // Method java/lang/Object.getClass:()Ljava/lang/Class;
      29: invokevirtual #5                  // Method java/io/PrintStream.println:(Ljava/lang/Object;)V
      32: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
      35: aload_1
      36: invokevirtual #4                  // Method java/lang/Object.getClass:()Ljava/lang/Class;
      39: invokevirtual #7                  // Method java/lang/Class.getSuperclass:()Ljava/lang/Class;
      42: invokevirtual #5                  // Method java/io/PrintStream.println:(Ljava/lang/Object;)V
      45: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
      48: aload_2
      49: invokevirtual #4                  // Method java/lang/Object.getClass:()Ljava/lang/Class;
      52: invokevirtual #7                  // Method java/lang/Class.getSuperclass:()Ljava/lang/Class;
      55: invokevirtual #5                  // Method java/io/PrintStream.println:(Ljava/lang/Object;)V
      58: iconst_1
      59: newarray       int
      61: astore_3
      62: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
      65: aload_3
      66: invokevirtual #4                  // Method java/lang/Object.getClass:()Ljava/lang/Class;
      69: invokevirtual #5                  // Method java/io/PrintStream.println:(Ljava/lang/Object;)V
      72: getstatic     #3                  // Field java/lang/System.out:Ljava/io/PrintStream;
      75: aload_3
      76: invokevirtual #4                  // Method java/lang/Object.getClass:()Ljava/lang/Class;
      79: invokevirtual #7                  // Method java/lang/Class.getSuperclass:()Ljava/lang/Class;
      82: invokevirtual #5                  // Method java/io/PrintStream.println:(Ljava/lang/Object;)V
      85: return
}

*/
```

### 例5

```java
/**
 * 当一个接口在初始化时，并不要求其父接口都完成了初始化
 * 只有在真正使用到父接口的时候（如引用接口中定义的常量时），才会初始化
 * @author yangfan
 * @date 2019/03/26
 */
public class MyTest5 {
    public static void main(String[] args) {
        // 删除MyParent5.class文件后再运行
        // 把MyChild5.class删了，也没有问题
        System.out.println(MyChild5.b);
    }
}

interface MyParent5 {
    int a = 5;
}

interface MyChild5 extends MyParent5 {
//    int b = 6;
    // 此时要求MyParent5.class必须存在
    int b = new Random().nextInt(4);
}
```

### 例6

```java
/**
 * @author yangfan
 * @date 2019/03/26
 */
public class MyTest6 {
    public static void main(String[] args) {
        Singleton singleton = Singleton.getInstance();
        System.out.println("counter:1 " + Singleton.counter1);
        System.out.println("counter:2 " + Singleton.counter2);
    }
}

class Singleton {
    public static int counter1;

    // 在这里输出1
//    public static int counter2 = 0;

    private static Singleton singleton = new Singleton();
    private Singleton() {
        counter1++;
        counter2++; // 准备阶段的重要意义（分配内存，给默认值）

        System.out.println(counter1);
        System.out.println(counter2);
    }

    // 在这里输出0
    public static int counter2 = 0;

    public static Singleton getInstance() {
        return singleton;
    }
}
```

