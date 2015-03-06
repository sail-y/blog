title: CentOS Jenkins + Sonar + Nexus 环境搭建
date: 2015-03-06 21:43:05
tags: [centos]
categories: 持续集成
---
# Nexus篇 
在Centos上安装

如果机器上是JDK1.6的话，nexus-2.5.1是最后一个支持JDK1.6的版本。

下载地址：http://www.sonatype.org/nexus/archived

我这里使用FTP工具上传到服务器上。执行命令的时候如果遇到没有权限的地方用chmod改变文件权限。

设置为系统自启动服务（使用root用户）
```bash
cd /etc/init.d/
cp /usr/local/jdk/nexus-2.5.1-01/bin/jsw/linux-x86-64/nexus nexus
```

编辑`/etc/init.d/nexus`文件，添加以下变量定义：
```bash
NEXUS_HOME=/usr/local/jdk/nexus-2.5.1-01
PLATFORM=linux-x86-64
PLATFORM_DIR="${NEXUS_HOME}/bin/jsw/${PLATFORM}"
```
<!--more-->

修改如下变量，设置启动用户为ycftp(这里用你自己的用户)
```bash
RUN_AS_USER=ycftp
```
执行命令添加nexus自启动服务
```bash
chkconfig –add nexus
chkconfig –levels 345 nexus on
```
执行如下命令启动、停止nexus服务
```bash
service nexus start
service nexus stop
```
启动后可通过http://yourip:8081/nexus访问

用admin/admin123登陆
登陆后点击左侧Repositories，将下图所示设置为true，就可以搜索了
![](http://img.blog.csdn.net/20140826131253109?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQveWZpc2Fib3k=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast)
![](http://img.blog.csdn.net/20140826131504260?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQveWZpc2Fib3k=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast)
这个时候还搜索不到

需要再右击选项点击 Repair Index如下所示
![](http://img.blog.csdn.net/20140826131615365?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQveWZpc2Fib3k=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast)
修复完成后便可以搜索了。
# Jenkins篇 #
添加Jenkins的源（repository）:
```bash
sudo wget -O/etc/yum.repos.d/jenkins.repo http://jenkins-ci.org/redhat/jenkins.repo
sudo rpm--import http://pkg.jenkins-ci.org/redhat/jenkins-ci.org.key
```
不然你在启动jenkins服务的时候他会说你没有什么key啥的。

安装Jenkins：
```bash
sudo yum installjenkins
```
安装完成后，有如下相关目录：

`/usr/lib/jenkins/`：jenkins安装目录，WAR包会放在这里。

注意修改端口号

`/etc/sysconfig/jenkins`：jenkins配置文件，“端口”，“JENKINS_HOME”等都可以在这里配置。内容如下：
```bash
## Path:        Development/Jenkins
## Description: Configuration for theJenkins continuous build server
## Type:        string
## Default:     "/var/lib/jenkins"
## ServiceRestart: jenkins
#
# Directory where Jenkins store itsconfiguration and working
# files (checkouts, build reports, artifacts,...).
#
JENKINS_HOME="/var/lib/jenkins"
 
## Type:        string
## Default:     ""
## ServiceRestart: jenkins
#
# Java executable to run Jenkins
# When left empty, we'll try to find thesuitable Java.
#
JENKINS_JAVA_CMD=""
 
## Type:        string
## Default:     "jenkins"
## ServiceRestart: jenkins
#
# Unix user account that runs the Jenkinsdaemon
# Be careful when you change this, as youneed to update
# permissions of $JENKINS_HOME and/var/log/jenkins.
#
JENKINS_USER="jenkins"
 
## Type:        string
## Default:     "-Djava.awt.headless=true"
## ServiceRestart: jenkins
#
# Options to pass to java when runningJenkins.
#
JENKINS_JAVA_OPTIONS="-Djava.awt.headless=true"
 
 
## Type:        integer(0:65535)
## Default:     8080
## ServiceRestart: jenkins
#
# Port Jenkins is listening on.
# Set to -1 to disable
#
JENKINS_PORT="8085"
 
## Type:        integer(0:65535)
## Default:     8009
## ServiceRestart: jenkins
#
# Ajp13 Port Jenkins is listening on.
# Set to -1 to disable
#
JENKINS_AJP_PORT="8019"
 
## Type:        integer(1:9)
## Default:     5
## ServiceRestart: jenkins
#
# Debug level for logs -- the higher thevalue, the more verbose.
# 5 is INFO.
#
JENKINS_DEBUG_LEVEL="5"
 
## Type:        yesno
## Default:     no
## ServiceRestart: jenkins
#
# Whether to enable access logging or not.
#
JENKINS_ENABLE_ACCESS_LOG="no"
 
## Type:        integer
## Default:     100
## ServiceRestart: jenkins
#
# Maximum number of HTTP worker threads.
#
JENKINS_HANDLER_MAX="100"
 
## Type:        integer
## Default:     20
## ServiceRestart: jenkins
#
# Maximum number of idle HTTP workerthreads.
#
JENKINS_HANDLER_IDLE="20"
 
## Type:        string
## Default:     ""
## ServiceRestart: jenkins
#
# Pass arbitrary arguments to Jenkins.
# Full option list: java -jar jenkins.war--help
#
JENKINS_ARGS=""
```
我这里修改端口号为8085，避免和本机tomcat冲突

启动Jenkins
```bash
sudo servicejenkins start
```

启动后用 `http://yourip:8085/` 访问
![](http://img.blog.csdn.net/20140826131719653?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQveWZpc2Fib3k=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast)
# Sonar篇 #
首先下载http://www.sonarqube.org/downloads/

我用的ftp工具上传到服务器。

编辑~/.bash_profile，添加环境变量

添加SONAR_RUNNER_HOME(就是sonar-runner-2.4的全路径名，比如/usr/local/sonar-runner-2.4)环境变量，并将SONAR_RUNNER_HOME/bin加入PATH变量中

记得使环境变量生效

source ~/.bash_profile

我这里使用mysql数据库，但不说mysql怎么安装了。

先配置Sonar要用的数据库环境：

## 创建数据库

* 在mysql中执行如下脚本创建数据库及mysql用户
```bash
CREATE DATABASE sonar CHARACTER SET utf8 COLLATE utf8_general_ci;
CREATE USER 'sonar' IDENTIFIED BY 'sonar';
GRANT ALL ON sonar.* TO 'sonar'@'%' IDENTIFIED BY 'sonar';
GRANT ALL ON sonar.* TO 'sonar'@'localhost' IDENTIFIED BY 'sonar';
```

* 编辑${SONAR_HOME}/conf/sonar.properties配置数据库:
```bash
sonar.jdbc.username=sonar
sonar.jdbc.password=sonar

sonar.jdbc.url=jdbc:mysql://localhost:3306/sonar?useUnicode=true&characterEncoding=utf8&rewriteBatchedStatements=true

# Optionalproperties

sonar.jdbc.driverClassName:com.mysql.jdbc.Driver
```

* 配置DB驱动包
如果使用Oracle数据库，必须手动复制驱动类到${SONAR_HOME}/extensions/jdbc-driver/oracle/目录下。其它支持的数据库默认提供了驱动，http://docs.codehaus.org/display/SONAR/Analysis+Parameters 列举了一些常用的配置及默认值.

## 修改sonar配置文件		
编辑sonar所在的目录（比如/usr/local/sonar-4.4）中conf/sonar.properties文件，配置数据库设置，默认已经提供了各类数据库的支持，只要将注释去掉就可以。这里使用mysql，因此取消mysql模块的注释，并将sonar中原有的嵌入式的数据库的jdbc.url注释掉。

```bash
#vi sonar.properties

#需要注释下面这条语句

#sonar.jdbc.url=jdbc:h2:tcp://localhost:9092/sonar

sonar.jdbc.username=sonar

sonar.jdbc.password=sonar

sonar.jdbc.url=jdbc:mysql://localhost:3306/sonar?useUnicode=true&characterEncoding=

utf8&rewriteBatchedStatements=true

# Optional properties

sonar.jdbc.driverClassName=com.mysql.jdbc.Driver
```
## 修改sonar-runner的配置文件
切换至sonar-runner的安装目录下，修改sonar-runner.properties根据实际使用数据库情况取消相应注释，这里需要和sonar.properties中保持一致。
```bash
#Configure here general information about the environment， such as SonarQube DB details for example
#No information about specific project should appear here
#----- Default SonarQube server
sonar.host.url=http://localhost:9000
#----- PostgreSQL
#sonar.jdbc.url=jdbc:postgresql://localhost/sonar
#----- MySQL
sonar.jdbc.url=jdbc:mysql://localhost:3306/sonar?useUnicode=true&characterEncoding=utf8
sonar.jdbc.driverClassName=com.mysql.jdbc.Driver
#----- Oracle
#sonar.jdbc.url=jdbc:oracle:thin:@localhost/XE
#----- Microsoft SQLServer
#sonar.jdbc.url=jdbc:jtds:sqlserver://localhost/sonar;SelectMethod=Cursor
#----- Global database settings
sonar.jdbc.username=sonar
sonar.jdbc.password=sonar
#----- Default source code encoding
sonar.sourceEncoding=UTF-8
#----- Security (when 'sonar.forceAuthentication' is set to 'true')
sonar.login=admin
sonar.password=admin
```
运行如下命令启动sonar，其它操作系统sonar均提供了启动脚本
```bash
${SONAR_HOME}/bin/linux-x86-64/sonar.sh start
```
如果遇到wrapper没有执行权限，用chmod命令赋予权限

如：
```bash
chmod 777 wrapper
```
在浏览器中访问: http://yourip:9000/ ，运行界面如下：
![](http://img.blog.csdn.net/20140826131827217?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQveWZpc2Fib3k=/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast)
配置为自启动服务

使用`root`账户或者开启`sudo`权限操作。

创建自启动脚本文件`/etc/init.d/sonar`

```bash
vi/etc/init.d/sonar
```

添加如下内容
```bash	
#!/bin/sh
#
# rc file for SonarQube
#
# chkconfig: 345 96 10
# description: SonarQube system (www.sonarsource.org)
#
### BEGIN INIT INFO
# Provides: sonar
# Required-Start: $network
# Required-Stop: $network
# Default-Start: 3 4 5
# Default-Stop: 0 1 2 6
# Short-Description: SonarQube system (www.sonarsource.org)
# Description: SonarQube system (www.sonarsource.org)
### END INIT INFO

/usr/bin/sonar $*
```
添加启动服务
```bash
ln -s $SONAR_HOME/bin/linux-x86-64/sonar.sh /usr/bin/sonar
chmod 755 /etc/init.d/sonar
chkconfig --add sonar
```
## 与Jenkins集成

在jenkins的插件管理中选择安装sonar jenkins plugin，该插件可以使项目每次构建都调用sonar进行代码度量。具体配置方式不再叙述。