---
title: Git-分支
date: 2017-09-21 21:35:29
tags: [git]
categories: git
---

先介绍一下**.gitignore**

## .gitignore

项目里面经常有一些文件是不需要纳入版本控制的，例如我编译后的class文件，或者idea产生的一些配置文件等。

```blank
.gradle
/build/
!gradle/wrapper/gradle-wrapper.jar

### STS ###
.apt_generated
.classpath
.factorypath
.project
.settings
.springBeans

### IntelliJ IDEA ###
.idea
*.iws
*.iml
*.ipr

### NetBeans ###
nbproject/private/
build/
nbbuild/
dist/
nbdist/
.nb-gradle/

rebel.xml

/out
```

上面是我的一个项目的配置，看得出来是有一些规则的，使用起来很简单，将这些规则保存到一个`.gitignore`中后，在项目里面这些文件或者文件夹里面的所有修改操作都不会被纳入到git版本控制中，也不会提交。

<!--more-->

### 规则

* ***.a** 忽略所有.a结尾的文件
* **!lib.a** 但lib.a除外
* **/TODO** 仅仅忽略项目根目录下的TODO文件，但不包括subdir/TODO
* **build/** 忽略build/目录下的所有文件
* **doc/*.txt** 会忽略doc/notes.txt但不包括doc/server/arch.txt

## Git分支

分支就是当你正在开发的时候，你可以基于当前的工作副本新开一条开发线，2边都可以进行单独的开发，当开发到某一个阶段的时候，可以合并到一起，这样2个分支的修改内容都能保留。


--------------- master		
--------------- new_branch


### git branch

```bash
➜  mygit git:(master) git branch
* master
```
这个命令可以显示当前所在分支，当使用`git init`创建仓库的时候，git默认会为我们创建一个master分支。

#### 创建分支

创建一个新的分支并切换到新的分支上

```bash
➜  mygit git:(master) git branch new_branch
➜  mygit git:(master) git branch
* master
  new_branch
➜  mygit git:(master) git checkout new_branch
Switched to branch 'new_branch'
```
这个时候2个分支上的文件还是一模一样的。


#### 切换分支

在**new_branch**分支上创建一个文件并提交，切换到master上查看，是没有这个文件的，这也说明2个不同分支上的文件是独立的，修改是互不影响的。


切换分支的命令：`git checkout`


```bash
➜  mygit git:(new_branch) echo 'test new branch' > test4.txt
➜  mygit git:(new_branch) ✗ git add test4.txt 
➜  mygit git:(new_branch) ✗ git commit -m 'add a new file'
[new_branch 8013cc2] add a new file
 1 file changed, 1 insertion(+)
 create mode 100644 test4.txt
➜  mygit git:(new_branch) git status
On branch new_branch
nothing to commit, working tree clean
➜  mygit git:(new_branch) ls
mydir               settings.properties test.txt            test4.txt
➜  mygit git:(new_branch) git checkout master
Switched to branch 'master'
➜  mygit git:(master) ls
mydir               settings.properties test.txt
```

如果想在2个分支之间来回切换，可以使用`git checkout -`

```bash
➜  mygit git:(new_branch) git checkout -
Switched to branch 'master'
➜  mygit git:(master) git checkout -
Switched to branch 'new_branch'
➜  mygit git:(new_branch) git checkout -
Switched to branch 'master'
➜  mygit git:(master) git checkout -
Switched to branch 'new_branch'
```
#### 删除分支

分支一样可以删除，命令：`git branch -d new_branch`

```bash
➜  mygit git:(new_branch) git branch -d new_branch
error: Cannot delete branch 'new_branch' checked out at '/Users/xiaomai/code/zhanglong/git/mygit
```
报错了，为什么呢？因为你当前本来就在**new_branch**上，就好比你坐到一个凳子上怎么能把凳子挪走呢。

```bash
➜  mygit git:(new_branch) git checkout -
Switched to branch 'master'
➜  mygit git:(master) git branch -d new_branch
error: The branch 'new_branch' is not fully merged.
If you are sure you want to delete it, run 'git branch -D new_branch'.
```

又出错了，说**new_branch**并没有合并过，不能删除，如果要删除要使用`git branch -D new_branch`。

因为我们之前创建了test4.txt这个文件，它是存在于new_branch分支上的，如果直接删除这个分支，那么在这个分支上所做的修改就会丢失了，也就是test4.txt这个文件就没了。

现在来测试一下：

```bash
➜  mygit git:(master) git branch -D new_branch
Deleted branch new_branch (was 8013cc2).
```

下面的新创建了一个new_branch2分支，但是这次却可以直接删除，因为这2个分支是一样的，没有区别，不需要合并。 

```
➜  mygit git:(master) git branch new_branch2
➜  mygit git:(master) git checkout new_branch2  
Switched to branch 'new_branch2'
➜  mygit git:(new_branch2) git checkout -
Switched to branch 'master'
➜  mygit git:(master) git branch -d new_branch2  
Deleted branch new_branch2 (was c7a801e).
```

#### 创建并切换

创建分支并切换，我们之前是用了2个命令，Git也提供了简便的方式，用一条命令来完成这个操作。

```bash
➜  mygit git:(master) git checkout -b new_branch4
Switched to a new branch 'new_branch4'
```

#### 合并

刚才创建分支后删除，有提示到说没有合并，我们再创建一个分支，并对文件做一些修改。

```bash
➜  mygit git:(new_branch4) vi test.txt 
➜  mygit git:(new_branch4) ✗ git status
On branch new_branch4
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git checkout -- <file>..." to discard changes in working directory)

	modified:   test.txt

no changes added to commit (use "git add" and/or "git commit -a")
➜  mygit git:(new_branch4) ✗ git add .
➜  mygit git:(new_branch4) ✗ git commit -m 'add a new line in test'
[new_branch4 41c3327] add a new line in test
 1 file changed, 1 insertion(+)
➜  mygit git:(new_branch4) git checkout -
Switched to branch 'master'
➜  mygit git:(master) git branch
* master
  new_branch4
```

Git里合并的命令是`git merge`

```bash
➜  mygit git:(master) git merge new_branch4  
Updating c7a801e..41c3327
Fast-forward
 test.txt | 1 +
 1 file changed, 1 insertion(+)
```

这个命令的意思是，将**new_branch4**分支上的修改合并到**master**上。

现在查看test.txt的文件内容，和我们在**new_branch4**上修改的内容一样了。

再验证一下合并之后能不能成功删除。

```bash
➜  mygit git:(master) git branch -d new_branch4  
Deleted branch new_branch4 (was 41c3327).
```

因为**new_branch4**分支上的修改已经合并（merge）到master上了，所以可以正常删除。


### 分支的原理

![](/img/git/git2-1.png)

分支到底是什么呢，分支指的是一个commit对象链，它就像是一条***工作记录线***（或者时间线），这张图有4个commit，这4个commit共同组成了一个branch。

每一次提交都会记录上一次的commit id，我们看第一个提交的commit id是10dc7...，而第二次提交的parent属性正好是10dc7。而这也就把所有的commit连接起来了，在版本库只有一个分支的情况下，这些连接起来的线也就组成了分支的信息。

### HEAD

之前我们在使用`git rest HEAD`的时候，这个HEAD到底是什么意思呢？

HEAD指向的是当前分支，master指向提交，什么意思呢，如下图所示，master是指向第3个提交，而HEAD是指向的master分支。

![](/img/git/git2-2.png)

下图就相当于在master分支上执行`git checkout -b dev`，创建并切换到dev分支：创建了一个叫dev的指针，它和master一样也指向同一个提交，并且HEAD指向当前分支上，也就是dev。

![](/img/git/git2-3.png)

这个我们可以通过命令来实战验证一下。

```bash
➜  mygit git:(master) git checkout -b dev
Switched to a new branch 'dev'
➜  mygit git:(dev) cat .git/HEAD 
ref: refs/heads/dev
```

这张图又什么意思呢，相信很容易猜到了，就是在dev分支上产生了一次提交。

![](/img/git/git2-4.png)

```
➜  mygit git:(dev) vi test.txt 
➜  mygit git:(dev) ✗ git add .
➜  mygit git:(dev) ✗ git commit -m 'add a new line in test.txt'
[dev bd1bf5d] add a new line in test.txt
 1 file changed, 1 insertion(+)
```

下面的图意思是将dev合并到master分支上，因为master没有修改，所以这里不会产生冲突，直接将master的指针指向了第4个提交（这种没有冲突的提交也叫Fast-Forward）

![](/img/git/git2-5.png)

`git log -3`

先看一下dev分支的提交日志：

```text
commit bd1bf5d33911594452c43f990904f393f6037607 (HEAD -> dev)
Author: 帆 <test@test.com>
Date:   Thu Sep 21 15:14:45 2017 +0800

    add a new line in test.txt

commit 41c3327a9cf94bcb85799f0253fba0707036292c (master)
Author: 帆 <test@test.com>
Date:   Thu Sep 21 14:29:37 2017 +0800

    add a new line in test
```
---
再看一下master分支的提交日志：

```text
commit 41c3327a9cf94bcb85799f0253fba0707036292c (HEAD -> master)
Author: 帆 <test@test.com>
Date:   Thu Sep 21 14:29:37 2017 +0800

    add a new line in test

commit c7a801e2d02195a49d6741d61f1e6b471664b3f6
Author: 帆 <test@test.com>
Date:   Thu Sep 21 11:06:54 2017 +0800
```

可以看到dev的第二个提交正好是master分支的第一个提交。

```bash
➜  mygit git:(master) git merge dev
Updating 41c3327..bd1bf5d
Fast-forward
 test.txt | 1 +
 1 file changed, 1 insertion(+)
```
现在执行merge操作，可以看到update 41c3327，也就是dev的第一条提交，正好是master没有的，结合刚才的图来看，也就是把master指向了41c3327。

---
看一下merge之后master分支上的`git log -3`

```text
commit bd1bf5d33911594452c43f990904f393f6037607 (HEAD -> master, dev)
Author: 帆 <test@test.com>
Date:   Thu Sep 21 15:14:45 2017 +0800

    add a new line in test.txt

commit 41c3327a9cf94bcb85799f0253fba0707036292c
Author: 帆 <test@test.com>
Date:   Thu Sep 21 14:29:37 2017 +0800

    add a new line in test

commit c7a801e2d02195a49d6741d61f1e6b471664b3f6
Author: 帆 <test@test.com>
Date:   Thu Sep 21 11:06:54 2017 +0800

    gitignore
(END)
```

---

下面再看看我们在master和dev分支上都作一些修改，然后合并。

```bash
➜  mygit git:(master) echo 'hello java' > test2.txt 
➜  mygit git:(master) ✗ git add .
➜  mygit git:(master) ✗ git commit -m 'create a file test2.txxt'
[master bc84a7f] create a file test2.txxt
 1 file changed, 1 insertion(+)
 create mode 100644 test2.txt
➜  mygit git:(master) git checkout dev
Switched to branch 'dev'
➜  mygit git:(dev) ✗ echo 'hello kotlin' > test2.txt 
➜  mygit git:(dev) ✗ git add .
➜  mygit git:(dev) ✗ git commit -m 'create file test2.txt'
[dev def3afc] create file test2.txt
 1 file changed, 1 insertion(+)
 create mode 100644 test2.txt
```
现在我们在master和dev上都创建了一个`test2.txt`，并且内容不一样。

现在master和dev指向的commit都不一样，现在合并：

```bash
➜  mygit git:(master) git merge dev
Auto-merging test2.txt
CONFLICT (add/add): Merge conflict in test2.txt
Automatic merge failed; fix conflicts and then commit the result.
```

出现了冲突，git不知道如何处理这种冲突，需要我们自己解决，我们现在看一下**test2.txt**的内容是什么
`vi test2.txt`

```text
<<<<<<< HEAD
hello java
=======
hello kotlin
>>>>>>> dev
```

上面是HEAD（当前分支master）的内容，下面的dev分支的内容，现在我们手动处理一下冲突，编辑保留我们需要留下的内容。

```bash
➜  mygit git:(master) ✗ vi test2.txt 
➜  mygit git:(master) ✗ git status
On branch master
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)

	both added:      test2.txt

no changes added to commit (use "git add" and/or "git commit -a")
```

现在执行`git add test2.txt`表示冲突已经解决，可以提交

```bash
➜  mygit git:(master) ✗ git add test2.txt 
➜  mygit git:(master) ✗ git status
On branch master
All conflicts fixed but you are still merging.
  (use "git commit" to conclude merge)

Changes to be committed:

	modified:   test2.txt

➜  mygit git:(master) ✗ git commit
[master b4bd64b] Merge branch 'dev'
➜  mygit git:(master) git status
On branch master
nothing to commit, working tree clean
➜  mygit git:(master) cat test2.txt 
hello java
hello kotlin
```

现在再回过头来看看dev分支下test2.txt的内容：

```bash
➜  mygit git:(master) git checkout dev
Switched to branch 'dev'
➜  mygit git:(dev) cat test2.txt 
hello kotlin
```

内容还是跟之前的一样，如果这个时候我们执行`git merge master`，还会产生冲突吗？

```bash
➜  mygit git:(dev) git merge master
Updating def3afc..b4bd64b
Fast-forward
 test2.txt | 1 +
 1 file changed, 1 insertion(+)
➜  mygit git:(dev) cat test2.txt 
hello java
hello kotlin
```

没有冲突，fast-forward直接成功，为什么呢？

因为在master上合并后，指针移动了2次，一次是dev的提交，一次是合并的提交。

现在在dev上再将master合并过来的时候，master的提交里已经包含了dev这次的提交，git检测到没有冲突，直接将指针指向了master的提交就可以了。

## fast-forward

* 如果可能，合并分支时Git会使用fast-forward模式
* 在这种模式下，删除分支时会丢掉分支信息
* 合并时加上--no-ff参数会禁用fast-forward，这样会多出一个commit id （Merge branch 'dev'）
	* `git merge --no-ff dev`
* 查看log
	* `git log --graph`

## 版本回退

刚才已经讲解了分支的原理，那么现在再来理解一下版本回退，应该就很容易想到了，无非就是移动分支的指针某到一个提交上。

* 回退到上一版本
	* `git reset --hard HEAD^`这个命令表示回退到`HEAD`的上一个版本，多一个`^`就多回退一个版本。
	* `git reset --hard HEAD~2`表示回退到`HEAD`的某一个版本之前，后面的数字就是回退的数量。
	* `git reset --hard commit id`
* 返回到某一个版本
	* `git reflog`

如果现在已经在历史的某一个提交上，用`git log`是看不到之后的commit id的。那么就可以使用`git reflog`查看，`git reflog`显示的是操作日志。

```bash
ca07f7b (HEAD -> master) HEAD@{0}: reset: moving to ca07f7b
0d2246f HEAD@{1}: reset: moving to HEAD
0d2246f HEAD@{2}: reset: moving to HEAD
0d2246f HEAD@{3}: reset: moving to HEAD^^
3240097 HEAD@{4}: reset: moving to HEAD^
ca07f7b (HEAD -> master) HEAD@{5}: commit: add another line
3240097 HEAD@{6}: commit: add another line
d8f57a9 HEAD@{7}: commit: add a new line
0d2246f HEAD@{8}: commit (initial): initial commit
(END)
```