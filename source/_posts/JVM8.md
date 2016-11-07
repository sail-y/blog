title: JVM8-类加载机制
date: 2016-11-07 16:30:13
tags: [java,JVM]
categories: JVM
---

编译后的.class文件，虚拟机把描述类的数据从Class文件加载到内存，并对数据进行校验、转换解析和初始化，最终形成可以被虚拟机直接使用的Java类型，这就是虚拟机的类加载机制。
