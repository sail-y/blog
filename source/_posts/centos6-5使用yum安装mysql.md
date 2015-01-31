title: centos6.5使用yum安装mysql
date: 2015-01-31 17:41:07
tags: [mysql,centos]
categories: mysql
---
要使用yum 安装mysql，要使用mysql的yum仓库，先从官网下载适合你系统的仓库
http://dev.mysql.com/downloads/repo/yum/
centos 6.5 对应的是mysql-community-release-el6-5.noarch.rpm
然后安装一下这个仓库列表
```bash
sudo yum localinstall mysql-community-release-el6-5.noarch.rpm 
```
执行这个命令后就能看到可安装的mysql
```bash
yum repolist enabled | grep "mysql.*-community.*"
```
<!--more-->
如果我们是要安装最新的版本，那么可以直接执行
```bash
sudo yum install mysql-community-server
```
如果我们要选择版本，可以先执行下面这个命令查看一下有哪些版本
```bash
yum repolist all | grep mysql
```
如果要选择版本的话，有两种方式，一种是使用命令来
```bash
shell> sudo yum-config-manager --disable mysql56-community
shell> sudo yum-config-manager --enable mysql57-community-dmr
```
这个命令就是在仓库中启用5.7版本的，禁用5.6版本子仓库
或者编辑/etc/yum.repos.d/mysql-community.repo文件
```bash
# Enable to use MySQL 5.6
[mysql56-community]
name=MySQL 5.6 Community Server
baseurl=//repo.mysql.com/yum/mysql-5.6-community/el/5/$basearch/
enabled=1
gpgcheck=1
gpgkey=file:/etc/pki/rpm-gpg/RPM-GPG-KEY-mysql 
```
`enabled=0`表示禁用
比如要安装5.7版本的*mysql*，要确定5.6的`enabled=0`，5.7的`enabled=1`，一次保证只启用一个子仓库
```bash
# Note: MySQL 5.7 is currently in development. For use at your own risk.
# Please read with sub pages: https://dev.mysql.com/doc/relnotes/mysql/5.7/en/
[mysql57-community-dmr]
name=MySQL 5.7 Community Server Development Milestone Release
baseurl=http://repo.mysql.com/yum/mysql-5.7-community/el/6/$basearch/
enabled=1
gpgcheck=1
gpgkey=file:/etc/pki/rpm-gpg/RPM-GPG-KEY-mysql
```
然后我们就可以愉快的安装mysql了
```bash
sudo yum install mysql-community-server
```
安装完成后我们启动mysql
```bash
sudo service mysqld start
```
查看mysql状态
```bash
sudo service mysqld status
```