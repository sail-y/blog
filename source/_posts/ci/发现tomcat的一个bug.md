title: Tomcat配置Bug分析与解决方案
date: 2015-03-10 14:01:15
tags: [tomcat]
categories: Java
description: 本文讲解发现tomcat的一个bug技术要点和实践经验。
---
在做项目的时候出现一个错误，看了半天没看出来是什么问题
```
root cause
java.util.NoSuchElementException
	java.util.ArrayList$Itr.next(ArrayList.java:834)
	org.apache.jasper.compiler.Validator$ValidateVisitor.getJspAttribute(Validator.java:1385)
	org.apache.jasper.compiler.Validator$ValidateVisitor.visit(Validator.java:772)
	org.apache.jasper.compiler.Node$UninterpretedTag.accept(Node.java:1251)
	org.apache.jasper.compiler.Node$Nodes.visit(Node.java:2377)
	org.apache.jasper.compiler.Node$Visitor.visitBody(Node.java:2429)
	org.apache.jasper.compiler.Validator$ValidateVisitor.visit(Validator.java:779)
	org.apache.jasper.compiler.Node$UninterpretedTag.accept(Node.java:1251)
	org.apache.jasper.compiler.Node$Nodes.visit(Node.java:2377)
	org.apache.jasper.compiler.Node$Visitor.visitBody(Node.java:2429)
	org.apache.jasper.compiler.Validator$ValidateVisitor.visit(Validator.java:529)
	org.apache.jasper.compiler.Node$JspRoot.accept(Node.java:564)
	org.apache.jasper.compiler.Node$Nodes.visit(Node.java:2377)
	org.apache.jasper.compiler.Node$Visitor.visitBody(Node.java:2429)
	org.apache.jasper.compiler.Node$Visitor.visit(Node.java:2435)
	org.apache.jasper.compiler.Node$Root.accept(Node.java:474)
	org.apache.jasper.compiler.Node$Nodes.visit(Node.java:2377)
	org.apache.jasper.compiler.Validator.validateExDirectives(Validator.java:1841)
	org.apache.jasper.compiler.Compiler.generateJava(Compiler.java:217)
	org.apache.jasper.compiler.Compiler.compile(Compiler.java:373)
	org.apache.jasper.compiler.Compiler.compile(Compiler.java:353)
	org.apache.jasper.compiler.Compiler.compile(Compiler.java:340)
	org.apache.jasper.JspCompilationContext.compile(JspCompilationContext.java:657)
	org.apache.jasper.servlet.JspServletWrapper.service(JspServletWrapper.java:357)
	org.apache.jasper.servlet.JspServlet.serviceJspFile(JspServlet.java:390)
	org.apache.jasper.servlet.JspServlet.service(JspServlet.java:334)
	javax.servlet.http.HttpServlet.service(HttpServlet.java:727)
```
找了半天才发现是tomcat的一个bug，换了一个tomcat版本就好了
导致这个错误的原因如下
```
<jsp:param name="test" value="" />
```
如果是value是空值，在某些tomcat版本下就会出现这个情况，如果你遇见了，不妨换个版本试试。


## 总结

本文系统讲解了相关技术要点。通过学习掌握核心概念和实践方法，提升技术能力。

### 关键要点

- 理解核心技术原理
- 掌握实际应用方法
- 学习最佳实践和注意事项

### 实践建议

1. 结合实际项目练习
2. 深入研究官方文档
3. 持续学习和实践
