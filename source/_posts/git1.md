---
title: Git-简介基本操作
date: 2017-08-28 21:04:37
tags: [git]
categories: git
---

用git已经差不多3年了，回顾一下。

https://git-scm.com/

这个是Git的官网，Git是一款免费、开源的分布式版本控制系统，用于敏捷高效地处理任何或小或大的项目。 Git的读音为/gɪt/。

Git是一个开源的分布式版本控制系统，可以有效、高速的处理从很小到非常大的项目版本管理。Git 是 Linus Torvalds 为了帮助管理 Linux 内核开发而开发的一个开放源码的版本控制软件。

Torvalds 开始着手开发 Git 是为了作为一种过渡方案来替代 BitKeeper，后者之前一直是 Linux 内核开发人员在全球使用的主要源代码工具。开放源码社区中的有些人觉得BitKeeper 的许可证并不适合开放源码社区的工作，因此 Torvalds 决定着手研究许可证更为灵活的版本控制系统。尽管最初 Git 的开发是为了辅助 Linux 内核开发的过程，但是我们已经发现在很多其他自由软件项目中也使用了 Git。例如 很多 Freedesktop 的项目迁移到了 Git 上。

<!--more-->


## github

github是一个面向开源及私有软件项目的托管平台，因为只支持git 作为唯一的版本库格式进行托管，故名github。
github于2008年4月10日正式上线，除了git代码仓库托管及基本的 Web管理界面以外，还提供了订阅、讨论组、文本渲染、在线文件编辑器、协作图谱（报表）、代码片段分享（Gist）等功能。目前，其注册用户已经超过350万，托管版本数量也是非常之多，其中不乏知名开源项目 Ruby on Rails、jQuery、python 等。


## gitlab

GitLab是一个利用Ruby on Rails开发的开源应用程序，实现一个自托管的Git项目仓库，可通过Web界面进行访问公开的或者私人项目。
它拥有与GitHub类似的功能，能够浏览源代码，管理缺陷和注释。可以管理团队对仓库的访问，它非常易于浏览提交过的版本并提供一个文件历史库。团队成员可以利用内置的简单聊天程序（Wall）进行交流。它还提供一个代码片段收集功能可以轻松实现代码复用，便于日后有需要的时候进行查找。
GitLab要求服务器端采用Gitolite搭建（为了方便安装，现已经用gitlab-shell代替Gitolite）


## Git常用命令

* 获得版本库
	* git init
	* git clone
	
* 版本管理	
	* git add
	* git commit
	* git rm
	
* 查看信息
	* git help
	* git log
	* git diff
	
* 远程协作
	* git pull
	* git push

执行`git init`，初始化一个空的git仓库，目录下会生成一个***.git***目录，用`ls -al`可查看。

创建一个文件：`touch test.txt`

## git status

执行`git status`

```bash
➜  mygit git:(master) ✗ git status
On branch master

Initial commit

Untracked files:
  (use "git add <file>..." to include in what will be committed)

	test.txt

nothing added to commit but untracked files present (use "git add" to track)
```

表示当前处于master分支上，并且还没有提交过，test.txt没有被追踪（意思test.txt没有纳入到git的版本控制系统中），然后执行`git add test.txt`加入到暂存区中。

## git add

```bash
➜  mygit git:(master) ✗ git add test.txt 
➜  mygit git:(master) ✗ git status 
On branch master

Initial commit

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)

	new file:   test.txt
```

## git rm --cached

现在test.txt文件就已经被添加到git暂存区了，可以被提交。根据上面的输出提示，我们可以执行`git rm --cached <file>`将文件还原到被修改的状态，现在来试一下。

```bash
➜  mygit git:(master) ✗ git rm --cached test.txt 
rm 'test.txt'
➜  mygit git:(master) ✗ git status 
On branch master

Initial commit

Untracked files:
  (use "git add <file>..." to include in what will be committed)

	test.txt

nothing added to commit but untracked files present (use "git add" to track)
```
现在文件又从暂存区恢复到了被修改的状态，接下来我们添加后来测试一下git的提交,git的commit是要求提交必须填写注释的。

## git commit

``` bash
mygit git:(master) ✗ git commit
```

```
# Please enter the commit message for your changes. Lines starting
# with '#' will be ignored, and an empty message aborts the commit.
# On branch master
#
# Initial commit
#
# Changes to be committed:
#       new file:   test.txt
#
```

这里出来一个vi的界面填写注释，如果直接保存退出会终止提交并提示以下内容。

```bash
➜  mygit git:(master) ✗ git commit
Aborting commit due to empty commit message.
```
现在输入注释后进行提交：

```bash
➜  mygit git:(master) ✗ git commit
[master (root-commit) db19d2d] initial commit
 1 file changed, 1 insertion(+)
 create mode 100644 test.txt
➜  mygit git:(master) git status 
On branch master
nothing to commit, working tree clean
```

还有一种更加简便的方式：将当前目录下有修改的文件进行`add`操作并提交：
`git commit -am 'add another line'`

# git log

如果要查看之前的提交，可以用`git log`命令进行查看。

```bash
➜  mygit git:(master) git log
commit db19d2de7917bc55dc8a7d05545e12f7e00c8325 (HEAD -> master)
Author: yangfan <hyyangfan@gmail.com>
Date:   Fri Sep 15 10:58:10 2017 +0800

    initial commit
(END)
```

## git config

Git的提交id（commit id）是一个摘要值，这个摘要值实际上是个sha1计算出来的。

对于user.name和user.email来说，有3个地方可以设置

1. /etc/gitconfig (几乎不会使用) `git config --system`
2. ~/.gitconfig (很常用) `git config --global`
3. 针对于特定项目的，.git/config文件中 `git config --local`

```bash
➜  mygit git:(master) git config
usage: git config [<options>]

Config file location
    --global              use global config file
    --system              use system config file
    --local               use repository config file
```

设置一下:

```bash
➜  .git git:(master) git config --local user.name '帆'
➜  .git git:(master) git config --local user.email 'test@test.com'
➜  .git git:(master) git config --list
user.name=yangfan
user.email=hyyangfan@gmail.com
commit.template=/Users/xiaomai/.stCommitMsg
core.repositoryformatversion=0
core.filemode=true
core.bare=false
core.logallrefupdates=true
core.ignorecase=true
core.precomposeunicode=true
user.name=帆
user.email=test@test.com
```

`git config --list`展示了设置的属性，现在再来看**.git/config**文件，就发生了变化。

```bash
➜  .git git:(master) cat config
[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
	logallrefupdates = true
	ignorecase = true
	precomposeunicode = true
[user]
	name = 帆
	email = test@test.com
```

现在再改一下test.txt文件：

## git checkout

```bash
➜  mygit git:(master) vi test.txt 
➜  mygit git:(master) ✗ git status 
On branch master
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	modified:   test.txt

no changes added to commit (use "git add" and/or "git commit -a")
➜  mygit git:(master) ✗ git checkout -- test.txt 
➜  mygit git:(master) git status 
On branch master
nothing to commit, working tree clean
```

`git checkout -- test.txt`可以恢复文件的修改，这个命令要慎用，没有提交的话用了这个命令修改的找不回来了。

```bash
➜  mygit git:(master) vi test.txt 
➜  mygit git:(master) ✗ git add test.txt 
➜  mygit git:(master) ✗ git commit -m "second commit"
[master 112c95f] second commit
 1 file changed, 1 insertion(+)
```
`git commit -m` 后面的**-m**是填写注释的简便方式。

现在多提交了一次，查看一下提交日志。

```bash
➜  mygit git:(master) git log
commit 112c95fdbf9e8361e68b99d8bc9f658923461dc1 (HEAD -> master)
Author: 帆 <test@test.com>
Date:   Fri Sep 15 11:30:05 2017 +0800

    second commit

commit db19d2de7917bc55dc8a7d05545e12f7e00c8325
Author: yangfan <hyyangfan@gmail.com>
Date:   Fri Sep 15 10:58:10 2017 +0800

    initial commit
(END)
```

## git rm

现在新创建一个**test2.txt**并提交，那我们将这个文件从已经提交的库里删除应该怎么做呢？

```bash
➜  mygit git:(master) git rm test2.txt 
rm 'test2.txt'
➜  mygit git:(master) ✗ git status
On branch master
Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

	deleted:    test2.txt

➜  mygit git:(master) ✗ ls
test.txt
```

执行上面的命令，我们可以看到，不光是`git status`显示文件已经被删除，`ls`命令也看不到了。

```bash
➜  mygit git:(master) ✗ git reset HEAD test2.txt
Unstaged changes after reset:
D	test2.txt
➜  mygit git:(master) ✗ git status
On branch master
Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	deleted:    test2.txt

no changes added to commit (use "git add" and/or "git commit -a")
➜  mygit git:(master) ✗ ls
test.txt
➜  mygit git:(master) ✗ git checkout -- test2.txt
➜  mygit git:(master) git status
On branch master
nothing to commit, working tree clean
➜  mygit git:(master) ls
test.txt  test2.txt
```

上面又测试一系列命令，用reset和checkout命令恢复了删除的文件。

下面进行真正的删除，并提交。

```bash
➜  mygit git:(master) git rm test2.txt 
rm 'test2.txt'
➜  mygit git:(master) ✗ git status
On branch master
Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

	deleted:    test2.txt

➜  mygit git:(master) ✗ git commit -m "delete test2.txt"
[master 5f69c8b] delete test2.txt
 1 file changed, 1 deletion(-)
 delete mode 100644 test2.txt
➜  mygit git:(master) ls        
test.txt
```

再演示系统使用系统命令rm删除文件的情况，不再需要调用reset就可以用checkout恢复。

```bash
➜  mygit git:(master) echo 'hello world' > test2.txt
➜  mygit git:(master) ✗ ls
test.txt  test2.txt
➜  mygit git:(master) ✗ git add test2.txt 
➜  mygit git:(master) ✗ git commit -m 'create a file'
[master 1a7fc91] create a file
 1 file changed, 1 insertion(+)
 create mode 100644 test2.txt
➜  mygit git:(master) rm test2.txt 
➜  mygit git:(master) ✗ git status
On branch master
Changes not staged for commit:
  (use "git add/rm <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	deleted:    test2.txt

no changes added to commit (use "git add" and/or "git commit -a")
➜  mygit git:(master) ✗ git checkout -- test2.txt
➜  mygit git:(master) git status
On branch master
nothing to commit, working tree clean
➜  mygit git:(master) ls
test.txt  test2.txt
```

不过也可以由此看出，使用`git rm`，可以直接提交删除文件。而使用系统命令`rm`，需要调用`git add`将删除文件的动作纳入到暂存区才能提交。


* git rm：
	1. 删除了一个文件
	2. 将被删除的文件纳入到暂存区（stage，index）
	
	若想恢复被删除的文件，需要进行两个动作：
	
	1. `git reset HEAD test2.txt`，将待删除的问价你从暂存区恢复到工作区
	2. `git checkout -- test2.txt`，将工作区中的修改丢弃掉
	
* rm：
	将test2.txt删除，这时被删除的文件并未纳入暂存区中。
	
## git mv

重命名

```bash
➜  mygit git:(master)  git mv test.txt test2.txt
➜  mygit git:(master) ✗ git status
On branch master
Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

	renamed:    test.txt -> test2.txt
➜  mygit git:(master) ✗ git commit -m 'rename a file'
[master 7030bca] rename a file
 1 file changed, 0 insertions(+), 0 deletions(-)
 rename test.txt => test2.txt (100%)
```
	
## git add .

如果一次修改了多个文件，可以使用`git add .`命令将所有修改纳入到暂存区。


## git commit --amend

如果不小心写错了提交消息怎么办？

```bash
➜  mygit git:(master) ✗ git commit -m "不小心写错了这条消息"
On branch master
Changes not staged for commit:
	modified:   test2.txt

no changes added to commit
➜  mygit git:(master) ✗ git commit --amend -m '再次修正'
[master 021a9de] 再次修正
 Date: Wed Sep 20 16:48:51 2017 +0800
 2 files changed, 1 insertion(+), 2 deletions(-)
 delete mode 100644 test.txt
➜  mygit git:(master) ✗ git log
```