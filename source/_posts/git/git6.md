---
title: Git-裸库和submodule、substree
date: 2017-11-21 08:46:13
tags: [git]
categories: git
---


## 裸库

通常我们在本地初始化仓库的时候，都是用`git init`。如果我们不借助github，如何自己建立一个中心仓库呢，这个就是裸库的概念。


`git init --bare <repo>`

这个命令执行后，将在本地创建一个名为 repo 的文件夹， 里面包含着 Git 的基本目录， 我们一般会将这个文件夹命名为后面加 .git 的形式，如 repo.git （这也是为什么我们从 GitHub clone 仓库的时候，地址都是 xxx.git 这样的形式的原因）.使用 --bare 参数初始化的仓库，我们一般称之为裸仓库， 因为这样创建的仓库并不包含 工作区 ， 也就是说，我们并不能在这个目录下执行我们一般使用的 Git 命令。

<!--more-->

## submodule

有种情况我们经常会遇到：某个工作中的项目需要包含并使用另一个项目。 也许是第三方库，或者你独立开发的，用于多个父项目的库。 现在问题来了：你想要把它们当做两个独立的项目，同时又想在一个项目中使用另一个。

一般在Java中，我们会打包成jar包放入nexus中，可是如果是频繁更新的库，这样做会比较麻烦。那么如果我们将代码直接包含在项目中呢，这里就可以使用submodule。Git 通过子模块来解决这个问题。 子模块允许你将一个 Git 仓库作为另一个 Git 仓库的子目录。 它能让你将另一个仓库克隆到自己的项目中，同时还保持提交的独立。

先在github上创建2个仓库：

https://github.com/sail-y/git_parent.git		
https://github.com/sail-y/git\_child.git		


在本地也分别创建2个仓库并与之关联。

那么我们如何在一个仓库中包含另外一个仓库呢？

命令如下：

```bash
➜  git_parent git:(master) git submodule add git@github.com:sail-y/git_child.git mymodule
Cloning into '/Users/xiaomai/code/zhanglong/git/git_parent/mymodule'...
remote: Counting objects: 6, done.
remote: Compressing objects: 100% (3/3), done.
remote: Total 6 (delta 0), reused 6 (delta 0), pack-reused 0
Receiving objects: 100% (6/6), done.
```

我们在git_parent仓库中执行这个命令，表示将git_child作为submodule拉取到mymodule目录中，注意这里mymodule是不能事先存在的，否则会报错。

```bash
➜  git_parent git:(master) ✗ git st
On branch master
Your branch is up-to-date with 'origin/master'.
Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

	new file:   .gitmodules
	new file:   mymodule
```

多出来一个文件和一个目录，目录里面就包含了另一个仓库里的文件

```bash
➜  git_parent git:(master) ✗ cd mymodule 
➜  mymodule git:(master) ls
hello.txt     submodule.txt
```

如果子仓库更新了，只需要在mymodule中执行`git pull`就可以拉取变更。

```bash
➜  git_parent git:(master) cd mymodule 
➜  mymodule git:(master) git pull
remote: Counting objects: 3, done.
remote: Compressing objects: 100% (2/2), done.
remote: Total 3 (delta 0), reused 3 (delta 0), pack-reused 0
Unpacking objects: 100% (3/3), done.
From github.com:sail-y/git_child
   5fc54e6..5adf3e0  master     -> origin/master
Updating 5fc54e6..5adf3e0
Fast-forward
 hello.txt | 1 +
 1 file changed, 1 insertion(+)
```

如果包含的submodule比较多的话，也可以使用命令将仓库包含的所有submodule都进行更新。

```bash
➜  git_parent git:(master) ✗ git submodule foreach git pull
Entering 'mymodule'
remote: Counting objects: 3, done.
remote: Compressing objects: 100% (2/2), done.
remote: Total 3 (delta 0), reused 3 (delta 0), pack-reused 0
Unpacking objects: 100% (3/3), done.
From github.com:sail-y/git_child
   5adf3e0..19a2793  master     -> origin/master
Updating 5adf3e0..19a2793
Fast-forward
 welcome.txt | 1 +
 1 file changed, 1 insertion(+)
 create mode 100644 welcome.txt
```

当子模块发生变更的时候，父模块也会检测到，需要重新提交。

```bash
➜  git_parent git:(master) ✗ git st
On branch master
Your branch is up-to-date with 'origin/master'.
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	modified:   mymodule (new commits)

no changes added to commit (use "git add" and/or "git commit -a")
➜  git_parent git:(master) ✗ git add .
➜  git_parent git:(master) ✗ git cm 'update submodule' 
[master a5cec07] update submodule
 1 file changed, 1 insertion(+), 1 deletion(-)
➜  git_parent git:(master) git push
Counting objects: 2, done.
Delta compression using up to 4 threads.
Compressing objects: 100% (2/2), done.
Writing objects: 100% (2/2), 311 bytes | 0 bytes/s, done.
Total 2 (delta 0), reused 0 (delta 0)
To github.com:sail-y/git_parent.git
   d0bc606..a5cec07  master -> master
```

### 拉取submodule

如果我们拉取了一个新的项目，它包含了submodule，直接clone仓库的时候，submodule里面是没有内容的。

```bash
➜  git git clone git@github.com:sail-y/git_parent.git git_parent2
Cloning into 'git_parent2'...
remote: Counting objects: 8, done.
remote: Compressing objects: 100% (6/6), done.
remote: Total 8 (delta 0), reused 8 (delta 0), pack-reused 0
Receiving objects: 100% (8/8), done.
➜  git cd git_parent2/mymodule 
➜  mymodule git:(master) ls
➜  mymodule git:(master) 
```

我们需要执行2个命令来更新submodule的内容。

```bash
➜  mymodule git:(master) git submodule init
Submodule 'mymodule' (git@github.com:sail-y/git_child.git) registered for path './'
➜  mymodule git:(master) git submodule update --recursive 
Cloning into '/Users/xiaomai/code/zhanglong/git/git_parent2/mymodule'...
Submodule path './': checked out '19a2793acc723c501f7422a9fdd810e46a528381'
```

这样做有3步操作，稍微麻烦了一点，实际上clone有一个参数可以一键完成。

```bash
➜  git git clone git@github.com:sail-y/git_parent.git git_parent3 --recursive          
Cloning into 'git_parent3'...
remote: Counting objects: 8, done.
remote: Compressing objects: 100% (6/6), done.
Receiving objects: 100% (8/8), done.
remote: Total 8 (delta 0), reused 8 (delta 0), pack-reused 0
Submodule 'mymodule' (git@github.com:sail-y/git_child.git) registered for path 'mymodule'
Cloning into '/Users/xiaomai/code/zhanglong/git/git_parent3/mymodule'...
remote: Counting objects: 12, done.        
remote: Compressing objects: 100% (7/7), done.        
remote: Total 12 (delta 1), reused 11 (delta 0), pack-reused 0        
Receiving objects: 100% (12/12), done.
Resolving deltas: 100% (1/1), done.
Submodule path 'mymodule': checked out '19a2793acc723c501f7422a9fdd810e46a528381'
```

## subtree

因为submodule在使用过程存在一些弊端，比如在父工程中修改了被依赖的项目的代码（因为代码就在项目中），然后推送后，在子模块本身的项目再拉取，实际上这样是有很多问题的。所以就出现了subtree这么一个开源功能，被git团队纳入了git中，它更加优秀，使用起来也很简单。

官方也是建议用substree来替代submodule。

下面开始演示，在github新建两个仓库。

https://github.com/sail-y/git\_substree\_parent.git	

https://github.com/sail-y/git\_substree\_child.git


准备工作需要在父项目里先添加一个远程

```bash
➜  git_substree_parent git:(master) git remote add subtree-origin git@github.com:sail-y/git_substree_child.git
➜  git_substree_parent git:(master) git remote show 
origin
subtree-origin
```

然后再添加subtree

```bash
➜  git_substree_parent git:(master) git subtree add --prefix=substree subtree-origin master --squash
git fetch subtree-origin master
warning: no common commits
remote: Counting objects: 6, done.
remote: Compressing objects: 100% (3/3), done.
remote: Total 6 (delta 0), reused 6 (delta 0), pack-reused 0
Unpacking objects: 100% (6/6), done.
From github.com:sail-y/git_substree_child
 * branch            master     -> FETCH_HEAD
 * [new branch]      master     -> subtree-origin/master
Added dir 'substree'
```

`git subtree add`这个命令将subtree-origin的master分支拉取到了substree这个目录下。

```bash
➜  git_substree_parent git:(master) ls
parent.txt substree
```

实际上这个命令会将child的commit合并过来，并将作者改了。

```bash
commit 8f08b4edbb537806f4a34feb8f773b97aa898d10 (HEAD -> master, origin/master)
Merge: 3c75631 5090ac2
Author: 张三 <zhangsan@git.com>
Date:   Thu Nov 23 09:16:59 2017 +0800

    Merge commit '5090ac20e7c71524697e762276f924343c0bed54' as 'substree'

commit 5090ac20e7c71524697e762276f924343c0bed54
Author: 张三 <zhangsan@git.com>
Date:   Thu Nov 23 09:16:59 2017 +0800

    Squashed 'substree/' content from commit 1112351
    
    git-subtree-dir: substree
    git-subtree-split: 1112351e504917e6fed1c6decee6bb81e931d647

commit 3c75631cda4535d854e9ff7629aab2c9afcdebe6
Author: 张三 <zhangsan@git.com>
Date:   Thu Nov 23 09:01:28 2017 +0800

    initial commit
(END)
```

它与submodule最显著的区别就是，submodule是保存的对子模块的一个引用，一个指针，而subtree是直接保存的文件。

在子模块新增一次提交，添加一个**world.txt**文件。

在父模块更新的命令是：		
`git subtree pull --prefix=substree subtree-origin master --squash`

```bash
➜  git_substree_parent git:(master) git subtree pull --prefix=substree subtree-origin master --squash
remote: Counting objects: 3, done.
remote: Compressing objects: 100% (2/2), done.
remote: Total 3 (delta 0), reused 3 (delta 0), pack-reused 0
Unpacking objects: 100% (3/3), done.
From github.com:sail-y/git_substree_child
 * branch            master     -> FETCH_HEAD
   1112351..844d9fd  master     -> subtree-origin/master
Merge made by the 'recursive' strategy.
 substree/world.txt | 1 +
 1 file changed, 1 insertion(+)
 create mode 100644 substree/world.txt
```

看一下`git log`

```bash
➜  git_substree_parent git:(master) git log

commit d7fbb7665c6d1af3cbdd4f5cf1977d682d6aa054 (HEAD -> master)
Merge: 8f08b4e 64dcef5
Author: 张三 <zhangsan@git.com>
Date:   Thu Nov 23 09:29:03 2017 +0800

    Merge commit '64dcef57bc7eea0fda072d53628b9464040a6072'

commit 64dcef57bc7eea0fda072d53628b9464040a6072
Author: 张三 <zhangsan@git.com>
Date:   Thu Nov 23 09:29:03 2017 +0800

    Squashed 'substree/' changes from 1112351..844d9fd
    
    844d9fd add world
    
    git-subtree-dir: substree
    git-subtree-split: 844d9fdb772f8e2c57218176b40b064f618523a4
```

并没有出现李四的提交，844d9fd add world，被修改成了张三。

再child里再提交一个**hellworld.txt**文件，然后更新。

```bash
➜  git_substree_parent git:(master) git subtree pull --prefix=substree subtree-origin master         
remote: Counting objects: 3, done.
remote: Compressing objects: 100% (2/2), done.
remote: Total 3 (delta 0), reused 3 (delta 0), pack-reused 0
Unpacking objects: 100% (3/3), done.
From github.com:sail-y/git_substree_child
 * branch            master     -> FETCH_HEAD
   844d9fd..a940bda  master     -> subtree-origin/master
fatal: refusing to merge unrelated histories
```

注意这次没有**--squash**参数

```bash
➜  git_substree_parent git:(master) git log

commit a940bdaf1c8dd5048782c7179c62d93b1bc03d80 (subtree-origin/master)
Author: 李四 <lisi@git.com>
Date:   Thu Nov 23 09:31:47 2017 +0800

    add helloworld
```

这次就出现了李四的提交信息，**--squash**会将要合并的分支所有的提交全部合并成一个提交信息。

接下来我们在parent的项目里修改child.txt，并push。

```bash
➜  git_substree_parent git:(master) cd subtree 
➜  subtree git:(master) vi child.txt 
```

可以看到github上parent项目中的child.txt是有新增的内容的，但是child项目里面却没有。

![](/img/git/git6-1.png)

![](/img/git/git6-2.png)


实际上在父项目中，还需要单独执行一次push。

```bash
➜  git_substree_parent git:(master) git subtree push --prefix=subtree subtree-origin master
git push using:  subtree-origin master
Counting objects: 3, done.
Delta compression using up to 4 threads.
Compressing objects: 100% (2/2), done.
Writing objects: 100% (3/3), 347 bytes | 0 bytes/s, done.
Total 3 (delta 0), reused 0 (delta 0)
To github.com:sail-y/git_substree_child.git
   a940bda..0c887fa  0c887fa4eb23fe282551d1368e72d31a177182e6 -> master
```

![](/img/git/git6-3.png)


### --squash

`--squash`会将subtree的所有提交信息合并成parent的一个提交，然后会将这一次合并的提交和parent再次合并，那么就产生了2次合并。`--squash`是为了防止主仓库的提交历史被污染，但是它的使用也有一些问题。

所以在使用`--squash`的时候，我们需要保证要么一直使用，要么一直不使用。