---
title: spring-boot-admin
date: 2017-08-12 14:18:20
tags: [spring, java]
categories: spring
---

# Spring Boot Admin


[Kotlin版本](https://github.com/sail-y/spring-boot-admin-kotlin)

[Java版本](https://github.com/sail-y/spring-boot-admin)



## 简介


简单的后台开发模板框架，具备用户管理，菜单管理和角色管理3个功能，权限控制到按钮层级。       


采用JWT+Spring Security进行权限验证和会话保持
项目基于Spring Boot+Mybatis+BootStrap+DataTables

前端代码不是我自己写的，后端有Kotlin和Java两个版本，Kotlin对Java生态的兼容比较好，我是先做的Java版，只花了一点时间就把Java版本'**复制**'成了Kotlin版本。
<!--more-->

## 相关框架
* [Spring boot](http://projects.spring.io/spring-boot/)
* [Mybatis](http://www.mybatis.org/mybatis-3/zh/index.html)
* [druid](https://github.com/alibaba/druid)
* [lombok](https://projectlombok.org/)
* [backbone.js](http://backbonejs.org/)
* [bootstrap](http://getbootstrap.com/)
* [datatables](https://datatables.net/)




## 修改application-dev.yml里的数据库连接

执行`mysql -uroot -p 数据库 < dmc.sql`导入数据库脚本。

直接Run`DMCApplication`启动后访问：http://localhost:10000

帐号：admin            
密码：111111




## 页面展示

![](img/login.png)
![](img/page1.png)
![](img/page2.png)
