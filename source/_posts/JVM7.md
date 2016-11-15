title: JVM7-类文件结构
date: 2016-11-04 09:25:26
tags: [JVM,java]
categories: JVM
---

## Class类文件结构
本章说一下Java编译后的class文件结构。
### 魔数与Class文件的版本

![](http://7xs4nh.com1.z0.glb.clouddn.com/jvm7.png)
我这里用sublime打开一个class文件，看到前面4个字节是十六进制0xCAFEBABE,这个是Class文件的魔数.

>很多文件存储标准中都使用魔数进行身份识别，因为扩展名可以更改，魔数就是确定这个文件是否为一个能被虚拟机接受的Class文件。

然后看0000 0034，转换成十进制是52，这个表示Java编译的版本号，相信大家在工作中也遇见过`Unsupported major.minor version 52.0`之类的错误，指的就是这个版本号，52对应的是JDK8。
<!--more-->
### 常量池
再后面的就是常量池，常量池可以理解为Class文件之中的资源仓库，我们前面提到过，Java运行时内存区域里有一块方法区，方法区里面有一个运行时常量池，Class文件的这部分数据，会在运行时被加载到方法区的运行时常量池中。
常量池中主要存放两大类常量：**字面量**和**符号引用**。『字面量』比较接近于Java语言层面的常量概念，如文本字符串、声明为final的常量值等。而『符号引用』则属于编译原理方面的概念，包括了下面三类常量：

* 类和接口的全限定名
* 字段的名称和描述符
* 方法的名称和描述符

先放一段代码

```java
public class TestClass {
    private int m;

    public int inc() {
        return m + 1;
    }
}

```
我们用`javap`命令来看一下编译后的class文件

```plain
~ javap -verbose TestClass
Compiled from "TestClass.java"
public class clazz.TestClass
  minor version: 0
  major version: 52
  flags: ACC\_PUBLIC, ACC\_SUPER
Constant pool:
   #1 = Methodref          #4.#18         // java/lang/Object."<init>":()V
   #2 = Fieldref           #3.#19         // clazz/TestClass.m:I
   #3 = Class              #20            // clazz/TestClass
   #4 = Class              #21            // java/lang/Object
   #5 = Utf8               m
   #6 = Utf8               I
   #7 = Utf8               <init>
   #8 = Utf8               ()V
   #9 = Utf8               Code
  #10 = Utf8               LineNumberTable
  #11 = Utf8               LocalVariableTable
  #12 = Utf8               this
  #13 = Utf8               Lclazz/TestClass;
  #14 = Utf8               inc
  #15 = Utf8               ()I
  #16 = Utf8               SourceFile
  #17 = Utf8               TestClass.java
  #18 = NameAndType        #7:#8          // "<init>":()V
  #19 = NameAndType        #5:#6          // m:I
  #20 = Utf8               clazz/TestClass
  #21 = Utf8               java/lang/Object
{
  public clazz.TestClass();
    descriptor: ()V
    flags: ACC\_PUBLIC
    Code:
      stack=1, locals=1, args\_size=1
         0: aload\_0
         1: invokespecial #1                  // Method java/lang/Object."<init>":()V
         4: return
      LineNumberTable:
        line 11: 0
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0       5     0  this   Lclazz/TestClass;

  public int inc();
    descriptor: ()I
    flags: ACC\_PUBLIC
    Code:
      stack=2, locals=1, args\_size=1
         0: aload\_0
         1: getfield      #2                  // Field m:I
         4: iconst\_1
         5: iadd
         6: ireturn
      LineNumberTable:
        line 15: 0
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0       7     0  this   Lclazz/TestClass;
}
SourceFile: "TestClass.java"
```
<a name="ref"></a>
看看常量池里的内容：

`Utf8`就是UTF-8编码的字符串，`Class`、`Methodref`和`Fieldref`则是符号引用。符号引用后面的编号最终也指向了字符串表示他们的值。

### 访问标志
常量池结束后，紧接着2个字节代表访问标志(access\_flag)。包括这个Class是类还是借口；是否定义为public类型；是否定义为abstract类型；如果是类的话，是否被声明为final。上面的flags中的值是flags: ACC\_PUBLIC, ACC\_SUPER表示这个类是public的。

<!--### 类索引、父类引用与接口索引集合
Class文件中由这三项数据来确定这个类的集成关系。3个2字节无符号数表示，本例中索引指向#3和#4
### 字段表集合
字段表（field\_info）用于描述借口或者类中声明的变量。
-->
### 描述符
这里说一下方法和字段的描述符。			
基本类型是取首字母的大写基本上。例如byte就是B,有3个特殊的，long是J，boolean是Z，V是void。			
L表示对象（例如Ljava/lang/String）。对数组而言，每一维度将使用一个前置的“[”字符来描述。			
>如定义一个为“java.lang.String[][]”类型的二维数组，将被记录为“[[java/lang/String”。

描述方法的时候，是先参数列表，后返回值。参数列表在小括号“()”内。例如`()V`表示0个参数，返回值为void，`int test(int[] i, char c)`的描述符为`([IC)I`。

## 字节码指令集
aload\_0、iconst\_1之类的都是字节码指令，下面将字节码操作按用途分为9类，按照分类介绍一下。
### 加载和存储指令
加载和存储指令用于将数据在栈帧中的局部变量表和[操作数栈](http://sail-y.github.io/2016/10/28/JVM2/#Java虚拟机栈)之间来回传输：

* 将一个局部变量加载到操作栈：iload、iload\_<n>、lload、lload\_<n>、fload、fload\_<n>、dload、dload\_<n>、aload、aload\_<n>
* 将一个数字从操作数栈存储到局部变量表：istore、istore\_<n>、lstore、lstore\_<n>、fstore、fstore\_<n>、dstore、dstore\_<n>、astore、astore\_<n>
* 将一个常量加载到操作栈：bipush、sipush、ldc、ldc\_w、ldc2\_w、aconst\_null、iconst\_<i>、lconst\_<l>、fconst\_<f>、dconst\_<d>
* 扩充局部变量表的访问索引的指令：wide。

存储数据的操作数栈和局部变量表主要就是由加载和存储指令进行操作，除此之外，还有少量指令，如访问对象的字段或数组元素的指令也会向操作数栈传输数据。上面有尖括号的表示一组指令（例如iload\_<n>，就代表了iload\_0、iload
\_1、iload\_2、iload\_3），iload\_0也等价于iload 0。

### 运算指令
运算或算术指令用于堆两个操作数栈上的值进行某种特定运算，并把结果重新存入到操作栈顶。大体上算术指令可以分为两种：对整型数据进行运算的指令与堆浮点型数据进行运算的指令，无论是哪种算术指令，都使用Java虚拟机的数据类型，由于没有直接支持byte、short、char和boolean类型的算术指令，对于这类数据的运算，应使用操作int类型的指令代替。

* 加法指令：iadd、ladd、fadd、dadd
* 减法指令：isub、lsub、fsub、dsub
* 乘法指令：imul、lmul、fmul、dmul
* 除法指令：idiv、ldiv、fdiv、ddiv
* 求余指令：irem、lrem、frem、drem
* 取反指令：inge、lneg、fneg、dneg
* 位移指令：ishl、ishr、iushr、lshl、lshr、lushr
* 按位或指令：ior、lor
* 按位与指令：iand、land
* 按位异或指令：ixor、lxor
* 局部变量自增指令：iinc
* 比较指令：dcmpg、dcmpl、fcmpg、fcmpl、lcmp

### 类型转换指令
类型转换指令可以将两种不同的数值类型进行相互转换，这些转换操作一般用于实现用户代码中的显式类型转换操作，或者用于处理字节指令集中数据类型相关指令无法与数据类型一一对应的问题。
以下是宽化类型转换，Java虚拟机直接支持，无需指令：

* int类型到long、float或者double类型
* long类型到float、double类型
* float类型到double类型

窄化类型指令包括：i2b、i2c、i2s、l2i、f2i、f2l、d2i、d2l、和d2f。窄化类型转换可能导致不同的正负号、不同的数量级以及精度丢失的情况。

### 对象创建与访问指令

* 创建类实例的指令：new
* 创建数组的指令：newarray、anewarray、multianewarray
* 访问类字段和实例字段的指令：getfield、putfield、getstatic、putstatic
* 把一个数组元素加载到操作数栈的指令：baload、caload、saload、iaload、laload、faload、daload、aaload
* 将一个操作数栈的值存储到数组元素中的指令：bastore、castore、sastore、iastore、fastore、dastore、aastore
* 取数组长度的指令：arraylength
* 检查类实例类型的指令：instanceof、checkcast

### 操作数栈管理指令

* 将操作数的组合暂定一个或两个元素出栈：pop、pop2
* 复制栈顶一个或两个数值并将复制值或双份的复制值重新压入栈顶：dup、dup2、dup\_x1、dup\_x2、dup\_x2、dup2\_x2
* 将栈最顶端的两个数值互换：swap

### 控制转移指令

* 条件分支：ifeq、iflt、ifle、ifne、ifgt、ifge、ifnull、ifnonnull、if\_icmpeq、if\_icmpne、if\_icmplt、if\_icmpgt、if\_icmple、if\_icmpge、if\_acmpeq、和if\_acmpne
* 复合条件分支：tableswitch、lookupswitch
* 无条件分支：goto、goto\_w、jsr、jsr\_w、ret

### 方法调用和返回指令

* invokevirtual调用对象的实例方法
* invokeinterface调用接口方法
* invokespecial调用一些需要特殊处理的实例方法，包括实例初始化方法、私有方法和父类方法
* invokestatic调用类方法
* invokedynamic指令用于再运行时动态解析出调用点限定符所引用的方法，并执行该方法

### 异常处理指令

throw语句由athrow指令实现，而catch语句不是由字节码来实现的，采用异常表来实现。

### 同步指令

同步一段指令集序列在Java语言中是由synchronized语句块来表示的，在Java虚拟机的指令集中由monitorenter和monitorexit两条指令来支持。

