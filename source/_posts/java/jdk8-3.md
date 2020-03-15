---
title: JDK8-方法引用
date: 2017-02-05 19:00:56
tags: [java,jdk8]
categories: jdk8
---
# 方法引用

方法引用：method reference		
方法引用实际上是个Lambda表达式的一种语法糖。

我们可以将方法引用看作是一个`函数指针`，function pointer。

方法引用共分为4类：
<!--more-->

1. 类名::静态方法名
	
	```java
	public class MethodReferenceTest {
	    public static void main(String[] args) {
	        Student student1 = new Student("zhangsan", 10);
	        Student student2 = new Student("lisi", 90);
	        Student student3 = new Student("wangwu", 50);
	        Student student4 = new Student("zhaoliu", 40);
	
	        List<Student> students = Arrays.asList(student1, student2, student3, student4);
	
	        // 这是常规的lambda表达式写法
	        students.sort((o1, o2) -> Student.compareStudentByScore(o1, o2));
	        students.forEach(student -> System.out.println(student.getScore()));
	
	        System.out.println("-----------");
	
	        // 下面展示方法引用的写法，这就是上面的代码的语法糖，更简洁
	        students.sort(Student::compareStudentByName);
	        students.forEach(student -> System.out.println(student.getName()));
	    }
	}
	```
2. 引用名::实例方法名
	
	```java
	public class StudentComparator {
	
	public int compareStudentByScore(Student student1, Student student2) {
        return student1.getScore() - student2.getScore();
   }

   public int compareStudentByName(Student student1, Student student2) {
       return student1.getName().compareToIgnoreCase(student2.getName());
   }
}
	```
	这里演示了如何使用
	
	```java	
	StudentComparator studentComparator = new StudentComparator();
   students.sort((o1, o2) -> studentComparator.compareStudentByScore(o1, o2));
   students.sort(studentComparator::compareStudentByScore);
	```
3. 类名::实例方法名
	新增2个方法
	
	```java
	public int compareByScore(Student student) {
        return this.getScore() - student.getScore();
   }

   public int comparByeName(Student student) {
       return this.getName().compareToIgnoreCase(student.getName());
   }
	```
	然后演示
	
	```java
	//使用lambda表达式和类型对象的实例方法
   students.sort((o1, o2) -> o1.compareByScore(o2));
   // 使用方法引用
	// 引用的是类型对象的实例方法
	// 这种方式的调用，lambda表达式的第一个参数是作为调用方，然后其他的lambda表达式参数都作为实例方法的参数传入
   students.sort(Student::compareByScore);
	```
4. 构造方法引用：类名::new
	
	```java
	Supplier<Student> supplier = () -> new Student();
   // 构造方法引用
   Supplier<Student> supplier2 = Student::new;
	```
	