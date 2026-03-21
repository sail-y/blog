---
title: "Git教程 04：远程仓库操作"
date: 2017-09-29 15:07:22
tags: [git]
categories: git
description: 本文讲解相关技术要点和实践经验。
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


上面命令输出表示当前fetch（拉取）的地址是**git@github.com:sail-y/git_demo.git**，推送的地址是**git@github.com:sail-y/git_demo.git**，当前分支是master，远程关联的分支是master。`git pull`默认拉取的是master分支，`git push`默认推送的是master分支，并且已经是最新的了。


```bash
➜  mygit git:(master) ✗ git branch -av
* master                460b082 add fifth line
  remotes/origin/master 460b082 add fifth line
```

加上`-a`参数可以看到远程分支。

```bash
➜  mygit git:(master) ✗ git commit -am 'update test.txt'
[master d04325a] update test.txt
 1 file changed, 1 insertion(+)
➜  mygit git:(master) git status
On branch master
Your branch is ahead of 'origin/master' by 1 commit.
  (use "git push" to publish your local commits)
nothing to commit, working tree clean
➜  mygit git:(master) git branch -av
* master                d04325a [ahead 1] update test.txt
  remotes/origin/master 460b082 add fifth line
```

接着进行一次提交，`git status`提示本地的分支是超前了远程master分支的1个提交。`git branch -av`显示的结果也是2个分支最后一次提交的id，现在也不一样了。

```bash
➜  mygit git:(master) git push
Counting objects: 3, done.
Delta compression using up to 4 threads.
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 323 bytes | 0 bytes/s, done.
Total 3 (delta 1), reused 0 (delta 0)
remote: Resolving deltas: 100% (1/1), completed with 1 local object.
To github.com:sail-y/git_demo.git
   460b082..d04325a  master -> master
➜  mygit git:(master) git branch -av
* master                d04325a update test.txt
  remotes/origin/master d04325a update test.txt
```

执行`git push`，将本地的推送到远程，再执行`git branch -av`,origin/master显示的最后一次提交发生了一次改变，我们可以理解为origin/master就是保存了一份远程分支的提交信息，是只读的。


### 处理冲突

当另外两个用户同时修改了一个文件，一个人先push，另一个也再push的时候，会被远程拒绝，此时需要处理冲突。


```bash
➜  mygit2 git:(master) git push
To github.com:sail-y/git_demo.git
 ! [rejected]        master -> master (fetch first)
error: failed to push some refs to 'git@github.com:sail-y/git_demo.git'
hint: Updates were rejected because the remote contains work that you do
hint: not have locally. This is usually caused by another repository pushing
hint: to the same ref. You may want to first integrate the remote changes
hint: (e.g., 'git pull ...') before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
➜  mygit2 git:(master) git pull
remote: Counting objects: 3, done.
remote: Compressing objects: 100% (2/2), done.
remote: Total 3 (delta 0), reused 3 (delta 0), pack-reused 0
Unpacking objects: 100% (3/3), done.
From github.com:sail-y/git_demo
   bb880c1..f162a21  master     -> origin/master
Auto-merging hello.txt
CONFLICT (content): Merge conflict in hello.txt
Automatic merge failed; fix conflicts and then commit the result.
```

`bb880c1..f162a21  master     -> origin/master`

这个输出的意思是远程的master的commit同步到本地的origin/master。
然后发现有冲突，需要自己编辑文件来解决冲突，调用`git add`来标记冲突已解决，最后提交并push。

```bash
➜  mygit2 git:(master) ✗ vi hello.txt
➜  mygit2 git:(master) ✗ git status
On branch master
Your branch and 'origin/master' have diverged,
and have 1 and 1 different commits each, respectively.
  (use "git pull" to merge the remote branch into yours)
You have unmerged paths.
  (fix conflicts and run "git commit")
  (use "git merge --abort" to abort the merge)

Unmerged paths:
  (use "git add <file>..." to mark resolution)

	both modified:   hello.txt

no changes added to commit (use "git add" and/or "git commit -a")
➜  mygit2 git:(master) ✗ git add hello.txt 
➜  mygit2 git:(master) git status
On branch master
Your branch and 'origin/master' have diverged,
and have 1 and 1 different commits each, respectively.
  (use "git pull" to merge the remote branch into yours)
All conflicts fixed but you are still merging.
  (use "git commit" to conclude merge)

➜  mygit2 git:(master) git commit
[master 02b63a9] Merge branch 'master' of github.com:sail-y/git_demo
```


git pull == git fetch + git merge

git fetch表示把远程最新的修改拉回到本地，git merge表示将远程的修改合并到代码库里。

我们可以分别测试一下这2个命令，也就是刚才说的先同步远程master信息到本地的origin/master。

```bash
➜  mygit2 git:(master) git branch -av
* master                7660696 [ahead 1] hello23
  remotes/origin/HEAD   -> origin/master
  remotes/origin/master 02b63a9 Merge branch 'master' of github.com:sail-y/git_demo
➜  mygit2 git:(master) git fetch
remote: Counting objects: 3, done.
remote: Compressing objects: 100% (2/2), done.
remote: Total 3 (delta 0), reused 3 (delta 0), pack-reused 0
Unpacking objects: 100% (3/3), done.
From github.com:sail-y/git_demo
   02b63a9..4ba6b0d  master     -> origin/master
➜  mygit2 git:(master) git branch -av
* master                7660696 [ahead 1, behind 1] hello23
  remotes/origin/HEAD   -> origin/master
  remotes/origin/master 4ba6b0d change hello.txt   
```


可以看到在执行`git fetch`之前，remotes/origin/master 的最新commit id是02b63a9，执行以后就变成了4ba6b0d。

接着我们来合并

```bash
➜  mygit2 git:(master) git merge origin/master
Auto-merging hello.txt
CONFLICT (content): Merge conflict in hello.txt
Automatic merge failed; fix conflicts and then commit the result.
```

就跟之前一样，解决冲突并提交。


### 分支设计技巧

1. Gitflow
2. 基于Git分支的开发模型：		
	develop分支（频繁变化的一个分支）	
	test分支（供测试与产品等人员使用的一个分支，变化不是特别频繁）	
	master分支（生产发布分支，变化非常不频繁的一个分支）
	bugfix（hotfix）分支（生产系统中出现了紧急Bug，用于紧急修复的分支）
	
	
### Git命令别名

git可以配置简短的字符串来替代长一些的命令，来方便用户。

这里我们配置几个别名。

```bash
➜  mygit git:(master) git config --global alias.br branch
➜  mygit git:(master) git config --global alias.st status
➜  mygit git:(master) git config --global alias.co checkout
➜  mygit git:(master) git config --global alias.unstage 'reset HEAD'
```
	
这个命令的结果是保存在了`~/.gitconfig`文件中，可以查看到。

执行外部命令需要，也就是非git命令，需要在前面加感叹号。

`➜  mygit git:(master) git config --global alias.ui '!gitk'`



## 总结

本文系统讲解了技术要点，通过学习掌握核心知识和实践方法。
