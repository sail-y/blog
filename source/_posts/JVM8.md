title: JVM8-类加载机制
date: 2016-11-07 16:30:13
tags: [java,JVM]
categories: JVM
---
# 类加载机制
虚拟机把描述类的数据从Class文件加载到内存，并对数据进行校验、转换解析和初始化，最终形成可以被虚拟机直接使用的Java类型，这就是虚拟机的类加载机制。

## 类加载的时机
类被夹在到虚拟机内存中开始，到卸载出内存为止，它的整个生命周期包括：加载、验证、准备、解析、初始化、使用、卸载7个阶段。其中验证、准备、解析3个部分统称为连接，这个阶段的发生顺序如下图所示：
<!--more-->
![](http://images2015.cnblogs.com/blog/801753/201509/801753-20150928194629980-1976916805.png)

图中加载、验证、准备、初始化和卸载这5个阶段的顺序是确定的，类的加载过程必须按照这种顺序按部就班地开始，而解析阶段则不一定：它在某些情况下可以在初始化阶段之后再开始，这是为了支持Java语言的运行时绑定（也称为动态绑定或晚期绑定）。

虚拟机规定了5种主动引用必然会触发**初始化**（加载、验证、准备在此之前开始）

* 遇到new、getstatic、putstatic或invokestatic这4条字节码指令时。这4条指令的Java代码场景是：使用new关键字实例化对象，读取或设置一个类的静态字段（被final修饰，已在编译期放入常量池的除外），调用一个类的静态方法。
* 使用java.lang.reflect反射调用的时候，如果类还没有初始化，则需要先初始化
* 父类未初始化，则先初始化一个类的父类
* 虚拟机启动的时候会先初始化执行的主类（包含main的类）
* 当使用JDK1.7的动态语言支持时，如果一个java.lang.MethodHandle实例最后的解析结果REF\_getStatic、REF\_putStatic、REF\_invokeStatic的方法句柄，并且这个方法句柄所对应的类没有进行过初始化，则需要先触发其初始化。

除了这些主动引用，其他引用类都不会触发初始化，称为被动引用。例如通过子类引用父类的静态字段，不会触发子类初始化。

## 类加载的过程
下面分别介绍一下加载、验证、准备、解析和初始化这5个阶段所执行的具体动作。
### 加载
“加载”是“类加载”过程的一个阶段，在加载阶段，虚拟机需要完成3件事情：
 
 *  通过一个类的全限定名来获取定义此类的二进制字节流
 *  将这个字节流所代表的静态存储结构转化为方法区的运行时数据结构
 *  在内存中生成一个代表这个类的java.lang.Class对象，作为方法区这个类的各种数据的访问入口
 
### 验证
验证是连接阶段的第一步，这一阶段的目的是为了确保Class文件的字节流中包含的信息符合当前虚拟机的要求，并且不会危害虚拟机自身的安全。

1. 文件格式验证		
	第一阶段要验证字节流是否符合Class文件格式的规范，并且能被当前版本的虚拟机处理，验证通过后，才会存入方法区。例如
	* 是否以魔数0xCAFEBABE开头
	* 主、次版本号是否在当前虚拟机处理范围之内
	* 常量池的常量中是否有不被支持的常量类型
2. 元数据验证		
	第二阶段是对字节码描述的信息进行语义分析，以保证其描述的信息符合Java语言规范，例如
	* 是否有父类
	* 是否继承了不允许继承的类(被final修饰的类)
	* 如果这个类不是抽象类，是否实现了父类或接口中要求实现的方法
3. 字节码验证		
	第三阶段目的是通过数据流和控制流分析，确定程序语义是合法的、符合逻辑的。例如：在操作栈上放置了一个int类型的数据，使用时却按long类型来加载入本地变量表中。
4. 符号引用验证			
	最后一个阶段的校验发生再虚拟机将符号引用转换为直接引用的时候，这个转化动作将在连接的第三个阶段-解析阶段发生。符号引用验证可以看做是对类自身以外（常量池中的各种符号引用）的信息进行匹配性校验，例如符号引用中通过字符串描述的全限定名是否能找到对应的类，在指定类中是否存在符合方法的字段描述以及简单名称所描述的方法和字段等等。
	
### 准备
准备阶段是正式为类变量分配内存并设置类变量初始值的阶段，这些变量所使用的内存都将在方法区中分配。这个时候进行内存分配仅包括类变量（static），而不包括实例变量。注意初始值是指分配零值

	public static int value = 123;
变量value在准备阶段过后的初始值是0而不是123，因为这时候尚未开始执行任何Java方法，而把value赋值为123的putstatic指令是程序被编译后，存放于类构造器<clinit>()方法之中，所以把value赋值为123的动作将在初始化阶段才会执行。
**加了final的常量除外，这个放在方法区常量池中的数据将会在准备阶段被赋值**

### 解析
解析阶段是虚拟机将常量池内的符号引用替换为直接引用的过程。[符号引用](http://sail-y.github.io/2016/11/04/JVM7/#ref)就是那些我们用javap命令看到的Methodref，Fieldref一类的。		
解析动作主要针对类或接口、字段、类方法、接口方法、方法类型、方法句柄和调用点限定符7类符号引用进行。

### 初始化
类初始化阶段是类加载过程的最后一步，前面的类加载过程中，除了在加载阶段用户应用程序可以通过自定义类加载器之外，其余动作完全由虚拟机主导和控制。到了初始化阶段，才真正开始执行类中定义的Java程序代码。		
在准备阶段，变量已经赋过一次系统要求的初始值，而在初始化阶段，则根据程序员通过程序制定的主观计划去初始化类变量和其他资源。初始化阶段就是执行类构造器<clinit>()方法的过程。<clinit>()方法就是由编译器收集类中所有的类变量的赋值动作和静态语句（static{}块）。

## 类加载器
虚拟机设计团队把类加载阶段中的“通过一个类的全限定名来获取描述此类的二进制字节流”这个动作放到Java虚拟机外部去实现，以便让应用程序自己决定如何去获取所需要的类。实现这个动作的代码模块称为“类加载器”。类加载器虽然只用于实现类的加载动作，但它在Java程序中起到的作用却远远不限于类加载阶段。对于任意一个类，都需要由加载它的类加载器和这个类本身一同确立其再Java虚拟机中的唯一性。意思就是比较两个类相等的前提是这两个类由同一个类加载器加载。

```java

/**
 * Created by YangFan on 2016/11/15 下午3:37.
 * <p/>
 *  相等是指类的.class对象的equals()方法、isAssignableFrom()方法、isInstance()方法的返回结果，也包括使用instanceof关键字做对象所属关系判定等情况。
 */

public class ClassLoaderTest {
    public static void main(String[] args) throws ClassNotFoundException, IllegalAccessException, InstantiationException {
        ClassLoader myLoader = new ClassLoader() {
            @Override
            public Class<?> loadClass(String name) throws ClassNotFoundException {
                try {
                    String fileName = name.substring(name.lastIndexOf(".") + 1) + ".class";
                    InputStream is = getClass().getResourceAsStream(fileName);
                    if (is == null) {
                        return super.loadClass(name);
                    }


                    byte[] b = new byte[is.available()];
                    is.read(b);
                    return defineClass(name, b, 0, b.length);
                } catch (IOException e) {
                    throw new ClassNotFoundException();
                }
            }
        };

        Object obj = myLoader.loadClass("clazzloader.ClassLoaderTest").newInstance();
        System.out.println(obj.getClass());
        System.out.println(obj instanceof ClassLoader);


    }
}

```
运行结果：

```plain
class clazzloader.ClassLoaderTest
false
```

### 双亲委派模型（重要）
从Java虚拟机的角度来将，只存在两种不同的类加载器：一种是启动类加载器（Bootstrap ClassLoader），这个类加载器使用C++语言实现，是虚拟机自身的一部分；另一种就是其他的类加载器，这些类加载器由Java语言实现，独立于虚拟机外部，并且全都继承自抽象类java.lang.ClassLoader。从开发人员角度来看，还可以划分得更细致一些：

* 启动类加载器			
前面介绍过，它负责加载的是JAVA_HOME/lib下的类库，系统类加载器无法被Java程序直接应用。
* 扩展类加载器		
这个类加载器由sun.misc.Launcher$ExtClassLoader实现，它负责用于加载JAVA_HOME/lib/ext目录中的，或者被java.ext.dirs系统变量指定所指定的路径中所有类库，开发者可以直接使用扩展类加载器。
* 应用程序类加载器		
这个类加载器由sun.misc.Launcher$AppClassLoader实现。这个类加载器是ClassLoader.getSystemClassLoader()方法的返回值，所以一般也称它为系统类加载器，如果应用程序中没有自定义过自己的类加载器，一般情况下这个就是程序中默认的类加载器。


![](http://images2015.cnblogs.com/blog/801753/201509/801753-20150928224102605-1436171001.png)

这个图展示的类加载器之间的这种层次关系，称为双亲委派模型。双亲委派模型要求除了顶层的启动类加载器外，其余的类加载都应当有自己的父类加载器。这里的类加载器之间的父子关系一般不会以继承的关系来实现，而是都使用组合关系来复用父加载器代码。

双亲委派模型的工作过程是:**如果一个类加载器收到了类加载请求，它首先不会自己去尝试加载这个类，而是把这个请求委派给父类加载器去完成，每一个层次的类加载器都是如此，因此所有的加载请求最终都应该传送到顶层的启动类加载器中，只有当父加载器反馈自己无法完成这个加载请求（它的搜索范围中没有找到所需的类）时，子加载器才会尝试自己去加载。**
这样做能保证一个类始终是被同一个类加载器加载。

```java
/**
 * Created by YangFan on 2016/11/15 下午4:17.
 * <p/>
 * 我们可以打印一下各种加载器看看是否复合图上描述
 */
public class Loader {
    public static void main(String[] args) {
        // 应用程序类加载器
        System.out.println(ClassLoader.getSystemClassLoader());
        // 扩展类加载器
        System.out.println(ClassLoader.getSystemClassLoader().getParent());
        // 启动类加载器
        System.out.println(ClassLoader.getSystemClassLoader().getParent().getParent());
        // 应用程序类加载器加载的路径
        System.out.println(System.getProperty("java.class.path"));
    }
}

```
运行结果：

```plain
sun.misc.Launcher$AppClassLoader@330bedb4
sun.misc.Launcher$ExtClassLoader@5cad8086
null
/Users/xiaomai/code/IdeaProjects/jvm/out/production/jvm:/Applications/IntelliJ IDEA.app/Contents/lib/idea_rt.jar
```
这里说到一个实践，就是有时候我们想覆盖第三方jar包中的某个类，除了替换jar包中的class文件的方式，还可以直接在项目中编写一个一样包名的类。上面打印在前面的`/Users/xiaomai/code/IdeaProjects/jvm/out/production/jvm`（相当于web项目里WEB-INF下的class文件夹）目录下的class会优先于第三方jar包中的class加载。但是却没有办法写一个同样包名的类来覆盖lib和ext下面的库的类。		
上面的null，表示ClassLoader就是Bootstrap ClassLoader。