---
title: Git-checkout、stash等命令
date: 2017-09-28 16:40:00
tags: [git]
categories: git
---

前面的文章讲解了分支的操作和原理，接下来接着看一下git的**checkout、stash、blame、diff**等命令的一些使用方法。

## git checkout

修改一下文件，看看`git status`会提示什么？

```bash
➜  mygit git:(master) vim test.txt 
➜  mygit git:(master) ✗ git status
On branch master
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	modified:   test.txt

no changes added to commit (use "git add" and/or "git commit -a")
```

Git提示到：修改没有暂存，请用`git add`或者`git checkout --`，我们试一下

```bash
➜  mygit git:(master) ✗ git checkout -- test.txt
```

<!--more-->

文件就已经恢复了，之前我们一直用checkout来切换分支。那么这个命令到底是什么意思呢？

`git checkout -- test.txt`：丢弃掉相对于**暂存区**中最后一次添加的文件内容所做的变更。

意思是第一次修改，然后用`git add test.txt`，将文件添加到暂存区，然后再修改，这个时候执行`git checkout -- test.txt`，文件就会恢复到暂存区的状态。


```bash
➜  mygit git:(master) vim test.txt 
➜  mygit git:(master) ✗ git add test.txt 
➜  mygit git:(master) ✗ git status
On branch master
Changes to be committed:
  (use "git reset HEAD <file>..." to unstage)

	modified:   test.txt

➜  mygit git:(master) ✗ git reset HEAD test.txt 
Unstaged changes after reset:
M	test.txt
```

这次编辑完后将文件添加到暂存区，`git status`其实我们可以执行`git reset HEAD <file>`将文件从暂存区移除。

那么`git reset HEAD test.txt`的作用是：

>将之前添加到暂存区（stage,index)的内容从暂存区移除到工作区。

我们要注意这2个命令的区别，一个是从工作区恢复到暂存区，一个是从暂存区移除到工作区。

### 切换到某一个提交

我们都知道分支其实就是指向了某一个提交，那么实际上切换分支，也就是切换到某一个提交上，所以我们也可以直接`git checkout commit id`来切换提交。

```bash
➜  mygit git:(master) git checkout ca07f7b
Note: checking out 'ca07f7b'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by performing another checkout.

If you want to create a new branch to retain commits you create, you may
do so (now or later) by using -b with the checkout command again. Example:

  git checkout -b <new-branch-name>

HEAD is now at ca07f7b... add another line
```

切换成功了，但是给了一串提示：你当前在一个游离的状态，你可以随便看看，改一些东西并提交，也切换到其他分支丢弃刚才的修改。如果想保留刚才的提交，就必须基于当前提交新创建一个分支。


```bash
➜  mygit git:(ca07f7b) vi test.txt 
➜  mygit git:(ca07f7b) ✗ git status
HEAD detached at ca07f7b
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	modified:   test.txt

no changes added to commit (use "git add" and/or "git commit -a")
➜  mygit git:(ca07f7b) ✗ git checkout master
error: Your local changes to the following files would be overwritten by checkout:
	test.txt
Please commit your changes or stash them before you switch branches.
Aborting
```

切换到**ca07f7b**提交后，对文件进行修改，然后在切换到master分支，被拒绝了，说我们的修改没有提交或者暂存，如果这样做，那么修改就丢失了。

```bash
➜  mygit git:(ca07f7b) ✗ git add .
➜  mygit git:(ca07f7b) ✗ git commit -m 'my commit'
[detached HEAD 7d01a11] my commit
 1 file changed, 1 insertion(+)
➜  mygit git:(7d01a11) git checkout master
Warning: you are leaving 1 commit behind, not connected to
any of your branches:

  7d01a11 my commit

If you want to keep it by creating a new branch, this may be a good time
to do so with:

 git branch <new-branch-name> 7d01a11

Switched to branch 'master'
```

我们提交以后再切换到master，成功了，但是又给了提示，说我们有一个提交被落下了，这个提交没有在任何的分支上面。如果你想要创建一个分支来保存提交，那么现在就是一个好的时机

```bash
➜  mygit git:(master) git branch mycommit 7d01a11
➜  mygit git:(master) git branch
* master
  mycommit
➜  mygit git:(master) git checkout mycommit  
Switched to branch 'mycommit'
```
用`git log`也查看到了**7d01a11**是最新一次的提交。

顺道提一下分支改名的命令：`git branch -m master master2`，把master改名为master2。

## stash

现在模拟一种情况，新建了一个分支**test**，**master**分支上的提交比**test**要领先一次。

```bash
➜  mygit git:(test) vi test.txt 
➜  mygit git:(test) ✗ git status
On branch test
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	modified:   test.txt

no changes added to commit (use "git add" and/or "git commit -a")
➜  mygit git:(test) ✗ git checkout master
error: Your local changes to the following files would be overwritten by checkout:
	test.txt
Please commit your changes or stash them before you switch branches.
Aborting
```

现在在两个分支上的文件不一样，然后在test分支上修改**test.txt**的内容，随后执行切换分支的操作，git报错了不允许提交：当前的修改会被丢弃，请提交或者暂存。

那这个时候我们工作只是进行了一点，又不想提交怎么办呢，git提供了一个`stash`命令。

```bash
➜  mygit git:(test) ✗ git stash
Saved working directory and index state WIP on test: c96bc8f commit
```

将当前的工作区保存，现在再切换分支，就没有问题了。

```bash
➜  mygit git:(test) ✗ git stash
Saved working directory and index state WIP on test: c96bc8f commit
➜  mygit git:(test) git status
On branch test
nothing to commit, working tree clean
➜  mygit git:(test) git checkout -
Switched to branch 'master'
➜  mygit git:(master) git checkout -
Switched to branch 'test'
```

现在我们要恢复之前的修改，可以用`git stash list`查看已经保存的列表。

```bash
➜  mygit git:(test) git stash list
stash@{0}: WIP on test: c96bc8f commit
(END)

```

多保存一次：

```bash
➜  mygit git:(test) vi test.txt 
➜  mygit git:(test) ✗ git stash save 'hello'      
Saved working directory and index state On test: hello
➜  mygit git:(test) git stash list
stash@{0}: On test: hello
stash@{1}: WIP on test: c96bc8f commit
(END)
```

恢复：

```bash
➜  mygit git:(test) git stash pop
➜  mygit git:(test) git stash apply
Auto-merging test.txt
CONFLICT (content): Merge conflict in test.txt
➜  mygit git:(test) ✗ vi test.txt  
➜  mygit git:(test) ✗ git stash drop stash@{1}
stash@{1} is not a valid reference
➜  mygit git:(test) ✗ git stash drop stash@{0}
Dropped stash@{0} (62dec20aca499f2e2660eb106fae481607d3662f)
```

### 保存现场
* git stash
* git stash list 

### 恢复现场

* git statsh apply (stash内容并不删除，需要通过git statsh drop stash@{0}手动删除）
* git stash pop（恢复的同时也将stashn内容删除）
* git stash apply stash@{0}

## 标签

标签是版本库的一个快照，一般我们在发版的时候会用到。

### 新建标签

标签有两种：

1. 轻量级标签（lightweight）`git tag v1.0.1`
2. 带有附注标签（annotated）`git tag -a v1.0.2 0m 'release version'`

```bash
➜  mygit git:(test) git tag v1.0
➜  mygit git:(test) git tag -a v2.0 -m '2.0 released'
➜  mygit git:(test) git tag
v1.0
v2.0
```

### 查找
`git tag -l 'pattern'`

```bash
➜  mygit git:(test) git tag -l 'v1.0'
v1.0
➜  mygit git:(test) git tag -l 'v*'  
v1.0
v2.0
```

### 删除标签

`git tag -d v1.0`


## git blame

这个命令可以查看某一个文件上一次是被谁以及什么时间修改的，非常有用。


```bash
➜  mygit git:(master) git blame test.txt 
^0d2246f (yangfan 2017-09-27 17:19:28 +0800 1) hello
ca07f7b3 (sail    2017-09-27 17:21:57 +0800 2) world
d8f57a90 (sail    2017-09-27 17:20:27 +0800 3) hello world
3240097a (sail    2017-09-27 17:20:59 +0800 4) hello java
c96bc8fc (sail    2017-09-28 17:31:51 +0800 5) hello perl
e7fb783f (sail    2017-09-28 17:02:47 +0800 6) hello python
a5a26e15 (sail    2017-09-28 17:34:41 +0800 7) hello c#
a5a26e15 (sail    2017-09-28 17:34:41 +0800 8) hello scala
(END)
```


## git diff

### 系统自带diff

diff是Git提供比较文件不同的一个命令，实际上linux或者osx系统本身也提供了一个这样的命令。

先测试一下系统自带的命令

```bash
➜  mygit git:(master) ✗ vi test1.txt 
➜  mygit git:(master) ✗ diff -u test.txt test1.txt 
--- test.txt	2017-09-29 10:57:13.000000000 +0800
+++ test1.txt	2017-09-29 11:02:54.000000000 +0800
@@ -1,8 +1,3 @@
 hello
 world
 hello world
-hello java
+hello perl
+hello python
-hello c#
-hello scala
```

`---`表示源文件，`+++`表示要比较的目标文件。

`-1,3`源文件1到3行，`+1,8`目标文件1到8行。

再下面的表示源文件`-`去这一行，就等于目标文件。
目标文件`+`上这一行，就等于源文件。

### git diff命令

`git diff`比较的是暂存区与工作区文件的差别。

```bash
➜  mygit git:(master) echo 'hello world' >> aa
➜  mygit git:(master) ✗ git add aa
➜  mygit git:(master) ✗ git diff aa
```
因为`git add aa`添加到暂存区后，工作区和暂存区的文件是一样的，所以这个命令输出空白，表示没有区别。

接着修改一下工作区的**aa**文件。

```bash
➜  mygit git:(master) ✗ vi aa
➜  mygit git:(master) ✗ git diff aa
diff --git a/aa b/aa
index 3b18e51..585558d 100644
--- a/aa
+++ b/aa
@@ -1 +1,2 @@
 hello world
+hello java
(END)
```
这个输出跟系统自带的命令比较像，文件名都一样，表示原始文件是暂存区文件，目标文件是工作区文件，暂存区文件`+hello java`就等于工作区的**aa**文件。

#### git diff commit id

这个命令可以比较工作区和某一次提交的差别。

```bash
➜  mygit git:(master) ✗ git commit -am 'aa'
[master f6ae6e2] aa
 1 file changed, 2 insertions(+)
 create mode 100644 aa
➜  mygit git:(master) vi aa 
➜  mygit git:(master) ✗ git diff HEAD 
diff --git a/aa b/aa
index 585558d..1274e4d 100644
--- a/aa
+++ b/aa
@@ -1,2 +1,3 @@
 hello world
 hello java
+hello spring
```
`git diff HEAD`比较的是最新的提交与工作区之间的差别。

`git diff --cached`比较的是最新的提交与暂存区之间的差别。