title: jenkins配合docker持续集成
date: 2015-12-15 12:53:45
tags: [jenkins,docker]
categories: CI
---

我这里用docker来做持续集成的思路和[jenkins和tomcat的持续集成](http://sail-y.github.io/2015/12/14/jenkins%E5%92%8Ctomcat%E7%9A%84%E6%8C%81%E7%BB%AD%E9%9B%86%E6%88%90/)是一样的。都是用jenkins拉取git的代码然后打war包，只不过重启tomcat步骤换成了docker的重启。
直接展示一下docker的脚本吧。
<!--more-->

```
#!/bin/bash
#defined 
export JAVA_HOME=/usr/java/jdk1.8.0_40/
REGISTRY_URL=localhost:5000
WEB_DIR="$WEB_DIR/webapps"
PORT="8080"
IMAGE="$1"
PROJECT="$2"

#param validate
if [ $# -lt 2 ]; then
  echo "you must use like this : ./deploy_docker.sh <image> <project> [war dir] [port]"  
  exit
fi

if [ "$3" != "" ]; then
   WEB_DIR="$3"
fi

if [ "$4" != "" ]; then
   PORT="$4"
fi



#publish project
echo "delete old $PROJECT.war"
rm -rf "$WEB_DIR"/webapps/$PROJECT
echo "copy new $PROJECT.war"
cp $WEB_DIR/$PROJECT.war "$WEB_DIR"/webapps/$PROJECT.war
#bak project
BAK_DIR=$WEB_DIR/bak/$PROJECT/`date +%Y%m%d`
mkdir -p "$BAK_DIR"
cp "$WEB_DIR"/$PROJECT.war "$BAK_DIR"/"$PROJECT"_`date +%H%M%S`.war
#remove tmp
rm -rf $WEB_DIR/$PROJECT.war

echo "build image:" $IMAGE
docker build -t $REGISTRY_URL/$IMAGE $WEB_DIR
echo "push image:" $IMAGE
docker push $REGISTRY_URL/$IMAGE

echo '>>> Get old container id'
CID=`docker ps | grep "dev" | awk '{print $1}'`

if [ -n "$CID" ]; then
        echo "delete container:" $CID
        docker stop $CID
        docker rm -f $CID
fi
echo "delete local image:" $IMAGE
docker rmi -f $REGISTRY_URL/$IMAGE
docker run -d -p $PORT:8080 -v /mnt:/mnt --name dev $REGISTRY_URL/$IMAGE

echo "finished" 
```

上面是步骤是这样：		
1. jenkins将war包上传到$WEB_DIR目录下，然后执行脚本。		
2. 这个目录下有一个webapps目录，用来存放正在运行的项目war包，是从$WEB_DIR拷贝过去的。		
3. 然后build docker的镜像，并push到私库中。`docker build -t $REGISTRY_URL/$IMAGE $WEB_DIR`这里最后一个参数是Dockerfile的路径，我在这个目录下还写了一个docker的配置。		
4. 停止之前正在运行的Container。		
5. 删除本地的镜像。		
6. 启动镜像：`-v /mnt:/mnt`是要映射宿主机的的目录(保存错误日志到宿主机)。`--name dev`是容器的名字，这个自行修改。`docker ps | grep "dev" | awk '{print $1}'`这里的`dev`也需要更换。因为删除了本地的镜像，所以会去私库重新里面下载。


> 这个脚本有一点问题，local的image有时候删除不掉，不影响运行，但是随着编译的次数，存储空间会越用越多（因为我最终没有采用docker，所以没去深究了）。

还有Dockerfile如下：

```
FROM tomcat:8.0.30-jre8
ADD webapps /usr/local/tomcat/webapps
```

基于官方的tomcat8构建，并且把webapps下的文件拷贝到容器中的tomcat webapps下，这个webapps必须是Dockerfile同级目录下的，也就是`$WEB_DIR`这个目录下。


还有另外一种方式操作起来更加简单，就是映射宿主机的路径直接写成`-v $WEB_DIR/webapps:/usr/local/tomcat/webapps`，这样还省去了build时拷贝项目的过程。

但是我觉得都不是很方便，查看日志不太方便，而且docker编译和启动也比较耗时，相比直接kill掉tomcat重启要慢一些。目前没有找到一个更好的实践方式，需要慢慢探索一下，为了不影响开发，我又换回了之前直接kill tomcat的方式。