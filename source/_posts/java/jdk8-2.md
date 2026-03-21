---
title: "JDK8新特性 02：JODA时间API实战"
date: 2017-01-17 14:23:59
tags: [java,jdk8]
categories: jdk8
description: 本文详细讲解JDK8-Optional详解，提供系统化的知识点总结和实战经验。
---

在Java中我们会经常遇到NullPointerException异常，代码里就少不了很多这样的代码

```java
if(null != obj) {
	.......
}
```
Java 8中的Optional<T>是一个可以包含或不可以包含非空值的容器对象，在 Stream API中很多地方也都使用到了Optional。
这是一个可以为null的容器对象。如果值存在则isPresent()方法会返回true，调用get()方法会返回该对象。


我们应该怎么使用Optional这个类呢。
<!--more-->

```java
public class OptionalTest {
    public static void main(String[] args) {
        Optional<String> optional = Optional.of("hello");

        // 这是传统方式的代码书写方式
//        if (optional.isPresent()) {
//            System.out.println(optional.get());
//        }

        // 我们应该用函数式风格来使用Optional
        optional.ifPresent(System.out::println);

        System.out.println("------");
        System.out.println(optional.orElse("world"));


        System.out.println("------");
        System.out.println(optional.orElseGet(() -> "nihao"));
    }
}
```
下面再展示一个具体的应用场景

```java
public class Employee {
    private String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
public class Company {
    private String name;

    private List<Employee> employeeList;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<Employee> getEmployeeList() {
        return employeeList;
    }

    public void setEmployeeList(List<Employee> employeeList) {
        this.employeeList = employeeList;
    }
}
public class OptionalTest2 {
    public static void main(String[] args) {
        Employee employee = new Employee();
        employee.setName("zhangsan");

        Employee employee2 = new Employee();
        employee2.setName("lisi");

        Company company = new Company();
        company.setName("company1");

        List<Employee> employeeList = Arrays.asList(employee, employee2);

        company.setEmployeeList(employeeList);
	    // 下面的代码使用函数式的风格开发，避免了null判断以及条件分支等等代码
        Optional<Company> optional = Optional.ofNullable(company);
        System.out.println(optional.map(theCompany -> theCompany.getEmployeeList()).orElse(Collections.emptyList()));

    }
}
```
## 总结

本文系统讲解了Java核心技术要点，包括语法特性、API使用和最佳实践。通过深入理解这些基础知识，可以更好地进行Java开发工作。

### 关键要点

- 掌握Java核心语法和API
- 理解面向对象编程思想
- 学习实际开发中的最佳实践

### 实践建议

1. 结合实际项目应用所学知识
2. 多阅读官方文档和源码
3. 持续学习和实践新技术特性
