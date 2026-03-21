title: Java URL参数解析方法
date: 2016-07-21 11:18:24
tags: [Java, Guava]
categories: Java
description: 本文讲解相关技术要点和实践经验。
---


最近遇到一个需求需要在获取URL字符串上的kv键值对，我们都知道Java Web在请求是直接用request来获取值的。如果是字符串呢，就需要正则表达式来自己截取了。		
自己写代码是比较麻烦的，下面推荐用Guava工具包，2行代码就可以解决这个需求了。


```
private String getPara(String url, String name) {
    String params = url.substring(url.indexOf("?") + 1, url.length());
    Map<String, String> split = Splitter.on("&").withKeyValueSeparator("=").split(params);
    return split.get(name);
}

```

先截取到?后面的字符串，然后再用`Splitter.on("&").withKeyValueSeparator("=").split(params);`就轻松的解决了~
## 总结

本文系统讲解了技术要点，通过学习掌握核心知识和实践方法。
