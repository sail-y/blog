title: gitlab替换nginx服务
date: 2015-10-29 16:29:10
tags: [gitlab]
categories: gitlab
---

之前在自己服务器上搭建服务器，这是之前的文章
[gitlab安装需要注意的问题](http://sail-y.github.io/2015/02/06/centos-6-5-%E5%AE%89%E8%A3%85gitlab%E5%AE%89%E8%A3%85%E9%9C%80%E6%B3%A8%E6%84%8F%E7%9A%84%E9%97%AE%E9%A2%98/)

后来在按照官网上替换自带服务器上的nginx的时候出现了一点问题。也是找了很久才找到这么一篇帖子，我在这里把nginx的部分转载过来一下。
<!-- more -->
[原文地址](https://www.owent.net/2014/10/gitlab%E7%8E%AF%E5%A2%83%E6%90%AD%E5%BB%BA%E5%B0%8F%E8%AE%A1.html)


>其次，我替换自己的nginx服务器的时候，nginx官方提供的包并不带gitlab要求的passenger模块，所以不能直接用官方提供的方法。我是用gitlab-ctl reconfigure生成了nginx的配置以后复制到自己的nginx里去的。生成的配置在 /var/opt/gitlab/nginx/conf/gitlab-http.conf

>还是nginx，我的nginx的启动账户不是gitlab的（默认是gitlab-www），所以会出现502错误。日志里内容是访问fastcgi权限不足。所以还要chmod 755 /var/opt/gitlab/gitlab-rails/sockets
