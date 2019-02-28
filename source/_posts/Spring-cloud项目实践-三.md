title: Spring cloud项目实践(三)
date: 2016-03-22 08:22:18
tags: [spring-cloud,微服务]
categories: spring boot/cloud
---
# 持续集成

配置jenkins构建项目，自动build出docker镜像，发布到docker私库中，或者从目标服务器中启动容器。
## Maven的Docker插件
http://www.cnblogs.com/skyblog/p/5163691.html 有讲到如何用Dockerfile构建，下面是采用Maven插件的方式构建，插件的文档在[这里](https://github.com/spotify/docker-maven-plugin)
<!--more-->
```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <executions>
                <execution>
                    <goals>
                        <goal>repackage</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
        <plugin>
            <groupId>com.spotify</groupId>
            <artifactId>docker-maven-plugin</artifactId>
            <version>${docker.plugin.version}</version>
            <executions>
                <!--绑定build命令到mvn package中-->
                <execution>
                    <phase>package</phase>
                    <goals>
                        <goal>build</goal>
                    </goals>
                </execution>
                <!--绑定push命令到mvn deploy中-->
                <execution>
                    <id>push-image</id>
                    <phase>deploy</phase>
                    <goals>
                        <goal>push</goal>
                    </goals>
                    <configuration>
                        <imageName>${docker.image.prefix}/${project.artifactId}:${project.version}</imageName>
                    </configuration>
                </execution>
            </executions>
            <configuration>
                <imageName>${docker.image.prefix}/${project.artifactId}</imageName>
                <forceTags>true</forceTags>
                <imageTags>
                    <!--<imageTag>${project.version}</imageTag>-->
                    <imageTag>latest</imageTag>
                </imageTags>
                <dockerDirectory>${project.basedir}/src/main/docker</dockerDirectory>
                <resources>
                    <resource>
                        <targetPath>/</targetPath>
                        <directory>${project.build.directory}</directory>
                        <include>${project.build.finalName}.jar</include>
                    </resource>
                </resources>
            </configuration>
        </plugin>
    </plugins>
</build>

```

Dockerfile文件在src/main/docker/Dockerfile
内容如下

```
FROM java:8
VOLUME /tmp
ADD pin-user-0.1.0.jar app.jar
RUN bash -c 'touch /app.jar'
EXPOSE 9000
ENTRYPOINT ["java","-Djava.security.egd=file:/dev/./urandom","-jar","/app.jar"]

```
https://spring.io/guides/gs/spring-boot-docker/
![说明](http://7xs4nh.com1.z0.glb.clouddn.com/%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202016-03-22%20%E4%B8%8A%E5%8D%889.08.51.png)

特别解释一下`ENTRYPOINT`指令,`docker run`命令中的参数都会传递给`ENTRYPOINT`指令。
执行`docker run -d pin-user --config.host=localhost`启动容器。
会把--config.host加在`ENTRYPOINT`后面,相当于执行了`java -Djava.security.egd=file:/dev/./urandom -jar /app.jar --config.host=localhost`。有了这个参数后我们就能很方便的控制环境和配置文件了。

## 配置jenkins
jenkins中新建一个项目，配置好git后，执行目标服务器的一个shell脚本来启动容器。
![配置界面](http://7xs4nh.com1.z0.glb.clouddn.com/%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202016-03-22%20%E4%B8%8A%E5%8D%889.24.33.png)

然后开始构建项目，因为在`pom.xml`配置中绑定了`docker:build`到`package`命令中，所以会自动执行`docker:build`，这里遇到了一个docker命令的权限问题，jenkins抛出一个错误。		
```
java.io.IOException: Permission denied
```
在jenkins所在的服务器上执行以下命令查看jenkins用户组	
	
```
id jenkins 
```
将jenkins用户加入到docker组中。		

```
usermod -a -G docker jenkins
```

再构建，权限问题没有了，但是我又得到另外一个错误


>[ERROR] Failed to execute goal com.spotify:docker-maven-plugin:0.3.258:build (default) on project pin-user: Exception caught: Error getting container 1e509efd653d0a3a942bf5ef34601305b7301d64378381614b55d3f5f88c7166 from driver devicemapper: open /dev/mapper/docker-202:33-5767218-1e509efd653d0a3a942bf5ef34601305b7301d64378381614b55d3f5f88c7166: no such file or directory


说是因为docker在centos下的存储驱动原因，我这里试试把devicemapper换成btrfs。在centos下只能选择这2种方式。

需要把docker使用的分区的文件系统换掉。这一步会镜像会被全部清除掉，记得备份镜像，因为我是测试环境，所以镜像全部丢了也无所谓。教程如下。

https://wiki.centos.org/PhilipJensen/CentOS6ConvertToBTRFS#head-c0851e0e7c9205aa8ca5616b85179b96981b24a7

```
umount /dev/xvdc1
```
提示divice busy。下面命令把相关进程kill掉再umount

```
fuser -m -v -i -k /dev/xvdc1
```
再执行这个命令。

```
btrfs-convert /dev/xvdc1
```
完事后再挂载回去 

```
mount /dev/xvdc1 /mnt2
```
还是提示busy，reboot重启下，再mount。
然后在`/etc/sysconfig/docker`加上`--storage-driver btrfs`参数。

```
other_args="--graph=/mnt2/apps/docker --storage-driver btrfs --insecure-registry=10.168.248.36:5000"
```

重启docker，再执行`docker info`就看到docker的存储驱动已经变了

![](http://7xs4nh.com1.z0.glb.clouddn.com/2F11C9E9-193C-445E-86BA-CA76BB259CCA.png)

启动docker容器的时候报错了，把`/var/lib/docker/linkgraph.db`删了
因为我在`/etc/sysconfig/docker`修改了docker的目录。
所以我这里是目录是`/mnt2/apps/docker/linkgraph.db`。
service restart docker
重启下docker即可。
现在再用jenkins构建和发布就没有错误了。

## 启动脚本

```bash
/mnt/web/scripts/docker_run.sh 10.168.248.36:5000/pin-user 9000 "--config.profile=dev --config.host=10.168.248.36"
```

下面我解释一下这个启动docker容器的脚本。
脚本后面跟了3个参数，一个是镜像名称，一个是端口号，一个是启动容器加在`ENTRYPOINT`的项目配置。
先找出之前镜像对应的containerId，把它删除掉，然后再用新的镜像启动容器。
```bash
#!/bin/bash
#defined 
export JAVA_HOME=/usr/java/jdk1.8.0_40/

IMAGE="$1"
OPTIONS=""
PORT="$2"
#param validate
if [ $# -lt 2 ]; then
  echo "you must use like this : ./deploy_run.sh <image> <port> [options]"  
  exit
fi
if [ "$3" != "" ]; then
   OPTIONS="$3"
fi

#拿到容器ID后kill掉并删除。
delete_container(){
    echo "the container id is $1"
    if [ -n "$1" ]; then
        echo "delete container:" $1
        docker stop $1
        docker rm -f $1
    fi
}

echo ">>> Get old image $IMAGE container id"
CID=$(docker ps | grep "${IMAGE}" | awk '{print $1}')
#因为jenkins每次的build的时候，如果镜像的tag没有指定，那么新的镜像build成功后，之前的镜像名称就会变成none。
#所以我们找出为名字为none的就是之前的镜像。
if [ ! -n "$CID" ]; then
        echo "get old image id"
        OLD_IMAGE_IDS=$(docker images --no-trunc| grep none | awk '{print $3}')
        echo $OLD_IMAGE_IDS
        if [ -n "$OLD_IMAGE_IDS" ]; then
          if [ -n ${OLD_IMAGE_IDS[1]} ]; then
                for OLD_IMAGE_ID in $OLD_IMAGE_IDS
                do
                    CID=$(docker ps | grep "${OLD_IMAGE_ID:0:12}" | awk '{print $1}')
                    delete_container $CID
                done
          else
                delete_container $OLD_IMAGE_IDS
          fi
        fi
else
        delete_container $CID
fi
#启动容器
echo "docker run -d -v /mnt:/mnt -p ${PORT}:${PORT} $IMAGE $OPTIONS"
docker run -d -v /mnt:/mnt -p ${PORT}:${PORT} $IMAGE $OPTIONS
echo "clean docker images"
#再次清理名称为none的docker镜像。
docker images --no-trunc| grep none | awk '{print $3}' | xargs -r docker rmi -f
#清理所有已经退出的容器
#docker rm `docker ps -a | grep Exited | awk '{print $1}'`
echo "finished" 
```

可能最好的方式还是每次用不同的tag来build镜像，不过我这里就偷懒了，等到发布到生产环境的时候再指定吧。
注意到`"--config.profile=dev --config.host=10.168.248.36"`这个参数配合`ENTRYPOINT`就可以针对生产环境和测试环境加载不同的配置文件了。
项目中的配置文件:

```yml
spring:
  application:
    name: user
  cloud:
    config:
      uri: http://${config.host:192.168.99.100}:8888
      profile: ${config.profile:dev}
      name: user

encrypt:
  failOnError: false
```

到此我们的一个基本的spring-cloud项目实践就完成了，其他特性和功能自行选择后再添加就可以了。
我接下来要继续加入的模块就是使用API网关构建微服务。概念如下

http://www.infoq.com/cn/articles/construct-micro-service-using-api-gateway/