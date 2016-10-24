title: jenkins和tomcat的持续集成
date: 2015-12-14 17:26:16
tags: [jenkins,tomcat]
categories: CI
---
今天来说一下如何用jenkins做持续集成。		
jenkins我这里就不介绍了，重点介绍一下如何用jenkins对tomcat进行持续集成。
#思路				
流程是这样的：		
1. jenkins从git(or svn)拉取代码，进行构建。		
2. 将打出来的war包用jenkins的插件(Publish over SSH)传到你要部署的服务器。		
3. 执行一个shell脚本，将正在运行的tomcat进程kill掉，把war包拷到tomcat目录的webapps下。然后在运行${TOMCAT_DIR}/bin/startup.sh。
<!--more-->

![如图](http://7xiqxx.com1.z0.glb.clouddn.com/123123.jpg)

是不是很简单？这样我们在发布应用的时候就再也不需要每次先在本地打包，再手动去删除之前的项目，然后通过ftp工具上传到服务器上，最后再重启tomcat。如果一天要进行几十次类似的操作，其实还是非常耗时的。

#实践

##配置jenkins拉取git代码
		
![jenkins配置](http://7xiqxx.com1.z0.glb.clouddn.com/3807ACD4-7799-45F9-89BF-D67BCC4BD2D3.png)		
首先配置在jenkins中配置好，然后再去gitlab里面配上hook触发点。
![gitlab配置](http://7xiqxx.com1.z0.glb.clouddn.com/B2859F18-E479-401F-AB0C-8C852F7CA54C.png)
我这里是配置的当gitlab中merge的时候触发构建操作。		
##用Maven打包应用
这个很简单：		
![打包](http://7xiqxx.com1.z0.glb.clouddn.com/4B6A6B6C-9D16-4B2B-BC50-46EAA3563AB8.png)

##上传包到服务器并执行脚本

这里需要在jenkins里安装Publish over SSH插件，并在全局配置中配置一下。
![](http://7xiqxx.com1.z0.glb.clouddn.com/B7FAD378-98CD-480D-906B-3657E4A5FEB8.png)

		
然后下面是项目中的配置

![](http://7xiqxx.com1.z0.glb.clouddn.com/F254D9A3-8589-4FE7-9993-BFF799982B7D.png)

上图中的war其实是基于全局配置中的路径，举个例子：
> 全局配置中的Remote Directory是 `/web`，项目配置中的Remote directory是`war`，那么实际上war传送的路径是/web/war	

	

最后就是最重要的脚本		
##脚本

脚本的目的就是kill掉当前tomcat的进程，复制war包，启动tomcat。
脚本如下：

```
#!/bin/bash
#defined 
export JAVA_HOME=/usr/java/jdk1.8.0_40/
TOMCAT_HOME="/mnt/web/apache-tomcat-7.0.54"
TOMCAT_PORT=8080
PROJECT="$1"
#param validate
if [ $# -lt 1 ]; then
  echo "you must use like this : ./deploy.sh <projectname> [tomcat port] [tomcat home dir]"  
  exit
fi
if [ "$2" != "" ]; then
   TOMCAT_PORT=$2
fi
if [ "$3" != "" ]; then
   TOMCAT_HOME="$3"
fi
#shutdown tomcat
#"$TOMCAT_HOME"/bin/shutdown.sh
#echo "tomcat shutdown"

#check tomcat process
tomcat_pid=`/usr/sbin/lsof -n -P -t -i :$TOMCAT_PORT`
echo "current :" $tomcat_pid
while [ -n "$tomcat_pid" ]
do
 sleep 5
 tomcat_pid=`/usr/sbin/lsof -n -P -t -i :$TOMCAT_PORT`
 echo "scan tomcat pid :" $tomcat_pid
 if [ -n "$tomcat_pid" ]; then
   echo "kill tomcat :" $tomcat_pid
   kill -9 $tomcat_pid
 fi

done
#publish project
echo "scan no tomcat pid,$PROJECT publishing"
rm -rf "$TOMCAT_HOME"/webapps/$PROJECT
cp /yourwarpath/$PROJECT.war "$TOMCAT_HOME"/webapps/$PROJECT.war
#bak project
BAK_DIR=/yourwarpath/bak/$PROJECT/`date +%Y%m%d`
mkdir -p "$BAK_DIR"
cp "$TOMCAT_HOME"/webapps/$PROJECT.war "$BAK_DIR"/"$PROJECT"_`date +%H%M%S`.war
#remove tmp
rm -rf /yourwarpath/$PROJECT.war
#start tomcat
"$TOMCAT_HOME"/bin/startup.sh
echo "tomcat is starting,please try to access $PROJECT conslone url" 
```

##PS
还有一种方式是通过jenkins的deploy plugin来部署应用，我最早的时候用过一段时间这种方式。不知道是什么原因，部署多次之后会导致内存溢出，每部署一次服务器被占用的内存就多一点。最终导致服务器崩溃，ssh都连接不上去，所以最后换了shell脚本的方案。