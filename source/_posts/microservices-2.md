---
title: Spring Cloud微服务-2-SpringBoot起步
tags: [Spring Cloud, 微服务]
date: 2019-04-12 14:16:21
categories: 微服务
---

微服务学习笔记

# Spring Boot

https://spring.io/projects/spring-boot#learn


要创建一个Spring Boot项目，可以去https://start.spring.io/，一键创建。


![](/imgs/spring-cloud/sc02-1.png)

依赖中加入Web，然后点击`Generate Project`，就会下载一个压缩包。
<!--more-->
解压后看看目录结构：

```
spring-lecture tree
.
├── HELP.md
├── build.gradle
├── gradle
│   └── wrapper
│       ├── gradle-wrapper.jar
│       └── gradle-wrapper.properties
├── gradlew
├── gradlew.bat
├── settings.gradle
└── src
    ├── main
    │   ├── java
    │   │   └── com
    │   │       └── test
    │   │           └── springlecture
    │   │               └── SpringLectureApplication.java
    │   └── resources
    │       ├── application.properties
    │       ├── static
    │       └── templates
    └── test
        └── java
            └── com
                └── test
                    └── springlecture
                        └── SpringLectureApplicationTests.java

16 directories, 10 files
```

在build.gradle中包含了依赖的配置。

```java
plugins {
	id 'org.springframework.boot' version '2.1.4.RELEASE'
	id 'java'
}

apply plugin: 'io.spring.dependency-management'

group = 'com.test'
version = '0.0.1-SNAPSHOT'
sourceCompatibility = '1.8'

repositories {
	mavenCentral()
}

dependencies {
	implementation 'org.springframework.boot:spring-boot-starter-web'
	testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

可以看到引入了spring-boot-starter-web的依赖，因为`io.spring.dependency-management`插件的关系，所以在配置文件里不需要写版本号，就像maven里的dependencyManagement一样。



源码地址：

https://github.com/sail-y/spring-cloud-lecture

执行命令`gradle bootRun`，就能启动，访问 http://127.0.0.1:9090/api/test

返回

```json
{
  id: 18,
  name: "zhangsan",
  birthday: "2019-04-10T12:15:53.666+0000"
}
```

几乎所有的配置都可以在`application.properties`文件里完成，这里用`server.port`配置了一个端口号，Spring Boot也支持yml格式的配置文件。这也是我自己在项目中一直使用的格式。



