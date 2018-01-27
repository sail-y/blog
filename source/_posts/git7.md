---
title: Git-cherry-pick、rebase
date: 2017-11-30 09:04:20
tags: [git]
categories: git
---

## cherry-pick

cherry-pick可以将你对某个分支的修改信息应用到另外一个分支上。

### 应用场景

在现有一个文件在master分支上，但是却不小心在develop分支上做了修改并新增了两次提交，也就是提交错了分支。

传统方式是我们备份好已经修改的文件然后切换分支再复制过去，这样做太低效了，而且容易出错。

我们可以用cherry-pick来解决这个问题。

<!--more-->

```bash
➜  git_cherry_pick git:(develop) git log
commit 9b7651337815b3697283c38a2cde43a17edf622b (HEAD -> develop)
Author: yangfan <hyyangfan@gmail.com>
Date:   Thu Nov 30 09:19:01 2017 +0800

    hello2

commit 0947abad01c529e1b14d0a364df55c295ae21896
Author: yangfan <hyyangfan@gmail.com>
Date:   Thu Nov 30 09:18:50 2017 +0800

    hello1

commit aa53a19826d28c9f795efd901c386e4c6267594d
Author: yangfan <hyyangfan@gmail.com>
Date:   Thu Nov 30 09:18:23 2017 +0800

    initial commit
(END)

```

```bash
➜  git_cherry_pick git:(master) git cherry-pick 0947ab
[master 264078d] hello1
 Date: Thu Nov 30 09:18:50 2017 +0800
 1 file changed, 1 insertion(+)
➜  git_cherry_pick git:(master) 
```

git自动的将commit应用到了另外一个分支上。现在在develop上再新增一次提交，如果我们直接在master上应用跨越2次的提交会怎么样呢？

```bash
commit 0318ff6fd8b6f7696701227ba6f260cbf4633524 (HEAD -> develop)
Author: yangfan <hyyangfan@gmail.com>
Date:   Thu Nov 30 09:24:12 2017 +0800

    hello4

commit d071b32aaabcd1ea0f5551b66605c5ac5ee6d464
Author: yangfan <hyyangfan@gmail.com>
Date:   Thu Nov 30 09:22:32 2017 +0800

    hello3

commit 9b7651337815b3697283c38a2cde43a17edf622b
Author: yangfan <hyyangfan@gmail.com>
Date:   Thu Nov 30 09:19:01 2017 +0800

    hello2
```

执行命令后，出现了冲突

```bash
➜  git_cherry_pick git:(master) git cherry-pick 0318ff6fd8b6f76
error: could not apply 0318ff6... hello4
hint: after resolving the conflicts, mark the corrected paths
hint: with 'git add <paths>' or 'git rm <paths>'
hint: and commit the result with 'git commit'
➜  git_cherry_pick git:(master) ✗ cat test.txt 
hello
hello1
<<<<<<< HEAD
=======
hello2
hello3
hello4
>>>>>>> 0318ff6... hello4
```

我们把冲突处理掉就可以了。

## rebase

rebase我们可以翻译成变基或者是衍合，它的功能是类似于merge的。不同的是merge在合并后是两条线合并，rebase是把另外一个分支的新的提交直接嫁接过来，我觉得有点像cherry-pick。

* rebase过程中也会出现冲突，解决冲突后，使用git add添加，然后执行`git rebase --continue`
* 接下来Git会继续应用余下的补丁
* 任何时候都可以通过如下命令终止rebase，分支会恢复到rebase开始前的状态。`git rebase --abort`
* 不要对master分支执行reabase，否则会引起很多问题
* 一般来说，执行reabse的分支都是自己的本地分支，没有推送到远程版本库。



因为rebase会修改分支的提交历史，所以不要在与其他人共享的分支上执行这个命令，否则会造成非常麻烦的结果。

### 实战

要演示rebase的命令，首先遵从最佳实践，不要在master上做操作，所以创建两个分支，分别进行两次提交。


develop分支：

```bash
commit f1e1d6ab0397578a06100772e6e89fffa6f274dc (HEAD -> develop)
Author: 张三 <zhangsan@git.com>
Date:   Tue Dec 5 09:21:57 2017 +0800

    add develop1

commit 88e11d005f5fd66157d165e99be8aca2d6078fff
Author: 张三 <zhangsan@git.com>
Date:   Tue Dec 5 09:21:39 2017 +0800

    add world

commit 31dec318f7cf42e0289228535a89efe0b6c5bb8e (test, master)
Author: 张三 <zhangsan@git.com>
Date:   Tue Dec 5 09:20:26 2017 +0800

    initial commit
(END)
```

test分支：

```bash
commit ca7495957b750285fb6ad32bf0aaff2d3d89b44f (HEAD -> test)
Author: 张三 <zhangsan@git.com>
Date:   Tue Dec 5 09:23:43 2017 +0800

    add test2

commit 6ca36bae9ff45bfd0df6a5f05b26c08d4ac94a52
Author: 张三 <zhangsan@git.com>
Date:   Tue Dec 5 09:23:32 2017 +0800

    add test1

commit 31dec318f7cf42e0289228535a89efe0b6c5bb8e (master)
Author: 张三 <zhangsan@git.com>
Date:   Tue Dec 5 09:20:26 2017 +0800

    initial commit
```

这两个分支都有共同的祖先，也就是31dec318f7cf42e028922这次提交。

下图显示了merge和rebase操作对分支历史的不同区别。

![](/img/git/git7-1.png)


因为我们对文件修改的不一样，那么一定会产生冲突。

```bash
➜  git_rebase git:(test) git rebase develop  
First, rewinding head to replay your work on top of it...
Applying: add test1
Using index info to reconstruct a base tree...
M	test.txt
Falling back to patching base and 3-way merge...
Auto-merging test.txt
CONFLICT (content): Merge conflict in test.txt
error: Failed to merge in the changes.
Patch failed at 0001 add test1
The copy of the patch that failed is found in: .git/rebase-apply/patch

When you have resolved this problem, run "git rebase --continue".
If you prefer to skip this patch, run "git rebase --skip" instead.
To check out the original branch and stop rebasing, run "git rebase --abort".
```

如果执行`git rebase --skip`，就会丢弃掉test分支上提交的修改，直接使用develop上的内容。

```bash
➜  git_rebase git:(f1e1d6a) ✗ git rebase --skip
Applying: add test2
Using index info to reconstruct a base tree...
M	test.txt
Falling back to patching base and 3-way merge...
Auto-merging test.txt
CONFLICT (content): Merge conflict in test.txt
error: Failed to merge in the changes.
Patch failed at 0002 add test2
The copy of the patch that failed is found in: .git/rebase-apply/patch

When you have resolved this problem, run "git rebase --continue".
If you prefer to skip this patch, run "git rebase --skip" instead.
To check out the original branch and stop rebasing, run "git rebase --abort".
```

因为有2次提交，所以忽略第一次后，还有第二次的内容

```bash

➜  git_rebase git:(f1e1d6a) ✗ cat test.txt 
hello
<<<<<<< HEAD
world
develop1
=======
test1
test2
>>>>>>> add test2
```

现在把冲突解决一下，手工编辑一下文件，保留下自己想保留的内容。

```bash
➜  git_rebase git:(f1e1d6a) ✗ git add .
➜  git_rebase git:(f1e1d6a) ✗ git rebase --continue
Applying: add test2
➜  git_rebase git:(test) 
```

```bash
➜  git_rebase git:(test) git log

commit 1b18ea5189f30c5a725b586297a747e46572962a (HEAD -> test)
Author: 张三 <zhangsan@git.com>
Date:   Tue Dec 5 09:23:43 2017 +0800

    add test2

commit f1e1d6ab0397578a06100772e6e89fffa6f274dc (develop)
Author: 张三 <zhangsan@git.com>
Date:   Tue Dec 5 09:21:57 2017 +0800

    add develop1

commit 88e11d005f5fd66157d165e99be8aca2d6078fff
Author: 张三 <zhangsan@git.com>
Date:   Tue Dec 5 09:21:39 2017 +0800

    add world

commit 31dec318f7cf42e0289228535a89efe0b6c5bb8e (master)
Author: 张三 <zhangsan@git.com>
Date:   Tue Dec 5 09:20:26 2017 +0800

    initial commit
```

因为丢弃了一次test的提交，所以很明显的看到，master第一次提交后，是develop的两次提交，然后是`add test2`的一次提交，test分支变基操作执行完毕。






