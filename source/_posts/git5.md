---
title: Git-远程仓库2
date: 2017-11-12 20:15:46
tags: [git]
categories: git
---

### refspec

Reference Specification简称refspec。		
在执行push或fetch操作时，refspec用以给出本地Ref和远程Ref之间的映射关系，通常是本地分支或本地tag与远程库中的分支或tag之间的映射关系。

refspec格式：		
+<src_ref>:<dst_refs>
其中的+是可选的，表示强制更新
典型的push refspec为HEAD:refs/heads/master
典型的fetch refspec为refs/heads/*:refs/remotes/origin/*
<!--more-->

1. 在缺省情况下，refspec会被git remote add命令所自动生成，Git会获取远端上refs/heads下的所有引用，并将它们写到本地的refs/remotes/origin目录下，这些信息我们都可以在**.git/config**文件里面可以看到。所以，如果远端上有一个master分支，你在本地就可以通过下面几种方式来访问它们的历史记录：
	
	```bash
	➜  mygit2 git:(develop) git log origin/master
	➜  mygit2 git:(develop) git log remotes/origin/master
	➜  mygit2 git:(develop) git log refs/remotes/origin/master
	```
	

#### 推送新的分支

表示本地分支和远程分支的关联，我们在创建好分支以后直接执行push是无法推送的，因为git并不知道你要推送到远程的哪一个分支上。



```bash
➜  mygit git:(master) git co -b develop
Switched to a new branch 'develop'
➜  mygit git:(develop) git br test
➜  mygit git:(develop) git br -av
* develop               93cd003 git gui test
  master                93cd003 git gui test
  test                  93cd003 git gui test
  remotes/origin/master 93cd003 git gui test
➜  mygit git:(develop) git push
fatal: The current branch develop has no upstream branch.
To push the current branch and set the remote as upstream, use

    git push --set-upstream origin develop
```

`git push --set-upstream origin develop` 就表示推送到远程，并在远程创建一个叫develop的分支，和本地develop分支关联。

```bash
➜  mygit git:(develop) git push --set-upstream origin develop
Total 0 (delta 0), reused 0 (delta 0)
To github.com:sail-y/git_demo.git
 * [new branch]      develop -> develop
Branch develop set up to track remote branch develop from origin.
```


这个时候如果我们在另外一台机器想拉取这个远程分支怎么办呢？

```bash
➜  mygit2 git:(master) git checkout -b develop origin/develop 
Branch develop set up to track remote branch develop from origin.
Switched to a new branch 'develop'
➜  mygit2 git:(develop) git br -av 
* develop                93cd003 git gui test
  master                 f7b8c54 [ahead 2] Merge branch 'master' of github.com:sail-y/git_demo
  remotes/origin/HEAD    -> origin/master
  remotes/origin/develop 93cd003 git gui test
  remotes/origin/master  93cd003 git gui test
```

只需在checkout的时候最后面跟上远程分支的名称**origin/develop**。

#### 另一种推送分支的方式

```bash
➜  mygit2 git:(develop) git co test
Switched to branch 'test'
➜  mygit2 git:(test) git push -u origin test
Total 0 (delta 0), reused 0 (delta 0)
To github.com:sail-y/git_demo.git
 * [new branch]      test -> test
Branch test set up to track remote branch test from origin.
```

注意`git push -u`和`git push --set-upstream`的作用，是一样的。


```bash
➜  mygit git:(develop) git fetch
From github.com:sail-y/git_demo
 * [new branch]      test       -> origin/test
➜  mygit git:(develop) git br -av                
* develop                93cd003 git gui test
  master                 93cd003 git gui test
  remotes/origin/develop 93cd003 git gui test
  remotes/origin/master  93cd003 git gui test
  remotes/origin/test    93cd003 git gui test
➜  mygit git:(develop) git checkout --track origin/test
Branch test set up to track remote branch test from origin.
Switched to a new branch 'test'
➜  mygit git:(test) git br -av
  develop                93cd003 git gui test
  master                 93cd003 git gui test
* test                   93cd003 git gui test
  remotes/origin/develop 93cd003 git gui test
  remotes/origin/master  93cd003 git gui test
  remotes/origin/test    93cd003 git gui test
```

这里用另外一种方式拉取远程分支，`git checkout --track origin/test`实际上就是`git checkout -b test origin/test`的一种特殊简写，为什么说特殊呢，因为它并没有指定本地分支的名称，而是直接使用了远程分支的名称。

#### 如何删除远程分支

##### 第一种方式

git push的完整写法：git push origin src:dest

将本地的分支推送到远程分支，名称可以不一样，那么删除远程分支，就是传递一个空分支到远程。

```bash
➜  mygit git:(develop) git push origin :develop
To github.com:sail-y/git_demo.git
 - [deleted]         develop
```

##### 第二种方式

```bash
➜  mygit git:(develop) git push --delete origin develop
To github.com:sail-y/git_demo.git
 - [deleted]         develop
```


推送的时候可以设置远程分支不同的名字：

```bash
➜  mygit git:(develop) git push --set-upstream origin develop:develop2
Total 0 (delta 0), reused 0 (delta 0)
To github.com:sail-y/git_demo.git
 * [new branch]      develop -> develop2
Branch develop set up to track remote branch develop2 from origin.
```

### 详解
 
1. push操作的完整命令是：git push origin srcBrnach:destBranch
2. pull操作的完整命令是：git poll origin srcBranch:destBranch
3. HEAD标记：HEAD文件是一个指向你当前所在分支的引用标识符，该文件内部并不包含SHA-1值，而是一个指向另外一个引用的指针。(可以在**.git/HEAD**中查看)

	```bash
	➜  mygit git:(develop) git co test
	Switched to branch 'test'
	Your branch is up-to-date with 'origin/test'.
	➜  mygit git:(test) cat .git/HEAD
	ref: refs/heads/test
	```

4. 当执行`git commit`命令时，git会创建一个commit对象，并且将这个commit对象的parent指针设置为HEAD所指向的引用的SHA-1值。
5. 我们对于HEAD修改的任何操作，都会被`git reflog`完整记录下来。
6. 实际上我们可以通过git底层命令symbolic-ref来实现对HEAD文件内容的修改。
	
	```bash
	➜  mygit2 git:(develop) git symbolic-ref HEAD                   
	refs/heads/develop
	➜  mygit2 git:(develop) git symbolic-ref HEAD refs/heads/test   
	➜  mygit2 git:(test) 
	```



### 推送标签

先回顾一下创建标签的知识。

`git tag v1.0`创建了一个轻量级标签，只包含了对commit的引用。

`git tag -a v2.0 -m 'v2.0 released'`创建了一个重量级标签，他不光包含了引用，还包含了自身的注释信息。可以用`git show v2.0`查看。

```bash
tag v2.0
Tagger: 七七 <qiqi@gmail.com>
Date:   Sun Nov 12 20:47:55 2017 +0800

v2.0 released
```


推送标签也是用push命令：


```bash
➜  mygit git:(test) git push origin v2.0
Counting objects: 1, done.
Writing objects: 100% (1/1), 160 bytes | 0 bytes/s, done.
Total 1 (delta 0), reused 0 (delta 0)
To github.com:sail-y/git_demo.git
 * [new tag]         v2.0 -> v2.0
```


如果标签比较多的话，可以一次性推送所有标签。

```bash
➜  mygit git:(test) git push origin --tags
Counting objects: 1, done.
Writing objects: 100% (1/1), 159 bytes | 0 bytes/s, done.
Total 1 (delta 0), reused 0 (delta 0)
To github.com:sail-y/git_demo.git
 * [new tag]         v1.0 -> v1.0
 * [new tag]         v3.0 -> v3.0
```

#### 完整命令

`git push origin refs/tags/v4.0:refs/tags/v4.0`

#### 拉取标签

`git fetch origin tag v4.0`

### 删除远程标签

跟删除分支是类似的，是将一个空的标签推送到远程。

```bash
➜  mygit git:(develop) git push origin :refs/tags/v3.0
To github.com:sail-y/git_demo.git
 - [deleted]         v3.0
```

另一种方式

```bash
➜  mygit git:(test) git push origin --delete tag v2.0
To github.com:sail-y/git_demo.git
 - [deleted]         v2.0
```


### git prune

当我们有一边删除了远程分支后：

```bash
➜  mygit git:(test) git push --delete origin develop
To github.com:sail-y/git_demo.git
 - [deleted]         develop
```

如何在另外一个仓库同步这个信息呢，先查看远程分支的状态。


```bash
➜  mygit2 git:(develop) git remote show origin
* remote origin
  Fetch URL: git@github.com:sail-y/git_demo.git
  Push  URL: git@github.com:sail-y/git_demo.git
  HEAD branch: master
  Remote branches:
    master                      tracked
    refs/remotes/origin/develop stale (use 'git remote prune' to remove)
    test                        tracked
  Local branches configured for 'git pull':
    develop merges with remote develop
    master  merges with remote master
    test    merges with remote test
  Local refs configured for 'git push':
    master pushes to master (fast-forwardable)
    test   pushes to test   (up to date)
```

注意这里是另外一个用户，这里git给了提示：**refs/remotes/origin/develop stale (use 'git remote prune' to remove)**

如果我们pull，会得到一个错误，因为远程的develop已经被删除了。

```bash
➜  mygit2 git:(develop) git pull origin develop:develop
fatal: Couldn't find remote ref develop
```

我们试试`git remote prune`的命令，本地和远程分支develop之间的关联，就已经没有了。

```bash
➜  mygit2 git:(develop) git remote prune origin
Pruning origin
URL: git@github.com:sail-y/git_demo.git
 * [pruned] origin/develop
```



