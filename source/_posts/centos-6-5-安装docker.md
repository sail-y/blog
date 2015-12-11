title: centos 6.5 安装docker
date: 2015-12-08 12:33:43
tags: [centos,docker]
categories: docker
---
先试试把开环境用docker来部署。

http://docs.docker.com/engine/installation/centos/  
直接按照这里安装就可以了，不过我在这里遇到了一点问题。  
我是centos6.5，内核在 3.8 以上   
通过以下命令查看您的 CentOS 内核：  

	uname -r

如果执行以上命令后，输出的内核版本号低于 3.8，请参考下面的方法来来升级您的 Linux 内核。  

对于 CentOS 6.5 而言，内核版本默认是 2.6。首先，可通过以下命令安装最新内核：  

	rpm --import https://www.elrepo.org/RPM-GPG-KEY-elrepo.org
	rpm -ivh http://www.elrepo.org/elrepo-release-6-5.el6.elrepo.noarch.rpm
	yum -y --enablerepo=elrepo-kernel install kernel-lt

随后，编辑以下配置文件：  
	
	vi /etc/grub.conf

将`default=1`修改为`default=0`。
<!--more-->
最后，通过`reboot`命令重启操作系统。

重启后如果不出意外的话，再次查看内核，您的 CentOS 内核将会显示为 3.10。

如果到这里，您和我们所期望的结果是一致的。恭喜您！下面我们就一起来安装 Docker 了。

接下来按照官网文档的步骤安装  
```
sudo yum update
sudo tee /etc/yum.repos.d/docker.repo <<-'EOF'
[dockerrepo]
name=Docker Repository
baseurl=https://yum.dockerproject.org/repo/main/centos/$releasever/
enabled=1
gpgcheck=1
gpgkey=https://yum.dockerproject.org/gpg
EOF
sudo yum install docker-engine
```  
我在这里遇到了下面的一个问题：

	Error: docker-engine conflicts with docker-io-1.7.1-2.el6.x86_64
	

查了一会发现是因为docker-io改名为docker-engine，所以造成冲突了，我这台服务器还安装过以前版本的，执行以下命令来删除老的版本。 
	
	yum remove docker-io

然后再来安装

	sudo yum install docker-engine

就可以安装成功了，继续下一步。我试着部署一个tomcat，执行以下命令下载一个centos镜像

	docker pull centos

然后我发现每次命令都要用sudo，很不方便

原来默认安装完 docker 后，每次执行 docker 都需要运行 sudo 命令，非常浪费时间影响效率。如果不跟 sudo，直接执行 `docker images` 命令会有如下问题：

	FATA[0000] Get http:///var/run/docker.sock/v1.18/images/json: dial unix /var/run/docker.sock: permission denied. Are you trying to connect to a TLS-enabled daemon without TLS?  

参考这里 http://bsaunder.github.io/2014/12/21/running-docker-without-sudo/     
执行以下命令来解决

	sudo groupadd docker
	
将用户加入该 group 内。

	sudo gpasswd -a ${USER} docker

重启docker
	
	sudo service docker restart
	
**切换当前会话到新group** (如果想立即生效此步不可少，因为 `groups` 命令获取到的是缓存的组信息，刚添加的组信息未能生效，所以 docker images 执行时同样有错。)
	
	newgrp - docker
	
还有就是docker的官方镜像下载实在是太慢了，找到一个国内提供加速服务的[daocloud](https://dashboard.daocloud.io/)

注册登录后使用加速器功能就可以了

docker默认的images存放路径是/var/lib/docker  
我的服务器系统硬盘自带的容量很小  
所以我要修改他的存放路径，修改下面文件里的other_args参数，重启docker。

	sudo vim /etc/sysconfig/docker

	other_args="--graph=yourpath"
	
下面还有一个私库的问题，不用localhost访问出现了：

```
unable to ping registry endpoint https://10.168.248.36:5000/v0/
v2 ping attempt failed with error: Get https://10.168.248.36:5000/v2/: tls: oversized record received with length 20527
 v1 ping attempt failed with error: Get https://10.168.248.36:5000/v1/_ping: tls: oversized record received with length 20527

```
依然是修改`/etc/sysconfig/docker`里面的other_args，加上部署私库的机器的IP。

	 --insecure-registry=yourip:5000
这样就可以正常的push和pull了