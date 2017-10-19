---
title: Git-远程仓库
date: 2017-09-29 15:07:22
tags: [git]
categories: git
---

## Git远程仓库

Git本身是一个分布式的版本控制系统，每个用户的机器上都会有一个完整的版本库。之前我们的操作都是在本地机器上操作的，最终别人需要获取我们的修改，需要我们将本地的修改**推送(push)**到远程机器上，然后别人再**拉取(pull)**合并我们的代码。


说到远程仓库呢，就不得不提一下**Github**，全球最大的同性交友社区（😄开个玩笑）。

https://github.com/

**Github**是免费使用的条件就是你在上面创建的代码都是开源的，开源被查看的，如果要想创建私有的仓库，就是需要收费的。那么应运而生的产生了一个叫**Gitlab**的开源产品可以让我们在公司的服务器搭建私有的仓库，让我们可以享受到免费的，私有的，内网的服务。

<!--more-->

先注册一个**Github**的帐号吧，欢迎大家关注我https://github.com/sail-y。

接下来就是要把本地的仓库要推送到远程，**Github**有一个叫**README.md**的文件用来描述项目，它是采用**MarkDown**语法编写的，跟我这篇文章的编写方式是一样的，可以去了解一下，很方便。

现在新建一个仓库，创建几个文件多进行几次提交

```bash
➜  mygit git:(master) ls
README.md test.txt
➜  mygit git:(master) cat test.txt 
hello world
add second line
add a thrid line
➜  mygit git:(master) cat README.md 
## Git示例项目

### 开发者

* 七七
* 灰灰
➜  mygit git:(master) git log
commit ec41fdfefd806965a088cd160d1fe755c263c5a9 (HEAD -> master)
Author: 七七 <qiqi@gmail.com>
Date:   Fri Sep 29 16:07:15 2017 +0800

    add readme

commit ef71fd488241a5276e89dce67681ae923072202e
Author: 七七 <qiqi@gmail.com>
Date:   Fri Sep 29 16:04:36 2017 +0800

    third commit

commit fee1876da354c9bb45d317ae3a9d00d8ffb50fa0
Author: 七七 <qiqi@gmail.com>
Date:   Fri Sep 29 16:04:08 2017 +0800

    second commit

commit e54c3751489948d4c0e3d81d71c9e5c2f02cf11a
Author: 七七 <qiqi@gmail.com>
Date:   Fri Sep 29 16:02:04 2017 +0800
```

接着我们在**Github**上创建一个远程仓库

![](/img/git/git4-1.png)

创建完成后**Github**就提示我们可以推送一个现有的仓库

```bash
git remote add origin git@github.com:sail-y/git_demo.git
git push -u origin master
```

执行完命令后，发现**Github**上已经出现了我们推送的仓库内容：**https://github.com/sail-y/git_demo**

![](/img/git/git4-2.png)

第一次关联远程仓库并推送后，以后只需要执行`git push`就可以将当前分支推送到远程仓库了。

```bash
➜  mygit git:(master) vi test.txt 
➜  mygit git:(master) ✗ git commit -am 'forth commit' 
[master c3b0d8b] forth commit
 1 file changed, 1 insertion(+)
➜  mygit git:(master) git push
Counting objects: 3, done.
Delta compression using up to 4 threads.
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 316 bytes | 0 bytes/s, done.
Total 3 (delta 0), reused 0 (delta 0)
To github.com:sail-y/git_demo.git
   ec41fdf..c3b0d8b  master -> master
```



### 分支设计技巧

1. Gitflow
2. 基于Git分支的开发模型：		
	develop分支（频繁变化的一个分支）	
	test分支（供测试与产品等人员使用的一个分支，变化不是特别频繁）	
	master分支（生产发布分支，变化非常不频繁的一个分支）
	bugfix（hotfix）分支（生产系统中出现了紧急Bug，用于紧急修复的分支）



### 查看远程仓库

前面我们在**github**上创建了一个远程仓库，并且跟本地仓库进行了关联，实际上git本地仓库是可以关联很多个远程仓库的。

可以用`git remote show`查看所有的远程仓库。

```bash
➜  mygit git:(master) git remote show
origin
```

还可以查看详细信息

```bash
➜  mygit git:(master) git remote show origin
* remote origin
  Fetch URL: git@github.com:sail-y/git_demo.git
  Push  URL: git@github.com:sail-y/git_demo.git
  HEAD branch: master
  Remote branch:
    master tracked
  Local branch configured for 'git pull':
    master merges with remote master
  Local ref configured for 'git push':
    master pushes to master (up to date)
```


