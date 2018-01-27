---
title: Netty-Apache Thrift介绍和使用
date: 2017-07-09 10:58:58
tags: [Netty,java]
categories: Netty
---

# Thrift

* Thrift最初由Facebook研发，主要用于各个服务之间的RPC通信，**支持跨语言**，常用的语言比如C++，Java，Python，PHP，Ruby，Erlang，Perl，Haskell，C#，Cocoa，JavaScript，Node.js，SmallTalk and OCaml都支持。
* Thrift是一个典型的CS（客户端/服务端）结构，客户端和服务端可以使用不同语言开发。既然客户端和服务端能使用不同的语言开发，那么一定就要有一种中间语言来关联客户端和服务端的语言，这种语言就是**IDL（Interface Description L anguage）**。
* Thrift不支持无符号类型，因为很多变成语言不存在无符号类型，比如Java

## Thrift数据类型

* byte：有符号字节
* i16：16位有符号整数
* i32：32位有符号整数
* i64：64位有符号整数
* double：64位有符号整数
* double：64位浮点数
* string：字符串

<!--more-->

## Thrift容器类型

* 集合中的元素可以是除了service之外的任何类型，包括exception
* list：一些列由T类型的数据组成的有序列表，元素可以重复
* set：一系列由T类型的数据组成的无序集合，元素不可重复
* map：一个字典结构，key为K类型，value为V类型，相当于Java中的HashMap


## Thrift工作原理

* 如何实现多语言之间的通信？
	* 数据传输使用socket（多重语言均支持），数据再已特定的格式（string等）发送，接受方语言进行解析。
	* 定义thrift的文件，由thrift文件（IDL）生成双方语言的接口、model，在生成的model以及接口中会有解码编码的代码
	

### 结构体（struct）

* 就像C语言一样，Thrift支持struct类型，目的就是将一些数据聚合在一起，方便传输管理。struct的定义形式如下：

	```
	struct Prople {
		1:string name;
		2:i32 age;
		3:string gender;
	}
	```

### 枚举

* 枚举的定义形式和Java的Enum定义累死：
	
	```
	enum Gender {
		MALE,
		FEMALE
	}
	```
	
### 异常（exception）

* Thrift支持自定义exception，规则与struct一样
 
	```
	exception RequestException {
		1:i32 code;
		2:string reasone;
	}
	```

### 服务（service）

* Thrift定义服务相当于Java中创建Interface一样，创建的service经过代码生成命令之后就会生成客户端和服务端的框架代码。定义形式如下：

	```
	service HelloWorldService {
	 //service中定义的函数，相当于Java interface中定义的方法
	 string doAction(1:string name, 2:i32 age);
	}
	```
	
### 类型定义

* Thrift支持类似C++一样的typedef定义：

	```
	typedef i32 int
	typedef i64 long
	```
	
###  常量（const）

* thrift也支持常量定义，使用const关键字：
	
	```
	const i32 MAX_RETRIES_TIME = 10
	const string MY_WEBSIZE = "http://facebook.com"
	```
	
### 命名空间

* Thrift的命名空间相当于Java中的package的意思，主要目的是组织代码。thrift使用关键`namespace` 定义命名空间：

	`namespace java com.test.thrift.demo`
* 格式是：namespace 语言名 路径


### 文件包含

* Thrift支持文件包含，相当于C/C++中的include，Java中的import。使用关键字include定义：
	
	`include "global.thrift"`

### 注释

* Thrift注释方式支持shell风格的注释，支持C/C++风格的注释，即#和//开头的语句都当作注释，/**/包裹的语句也是注释。


### 可选与必选

* Thrift提供两个关键字required，optional，分别用于表示对应的字段是必填的还是可以选的

	```
	struct People {
		1:required string name;
		2:optional i32 age;
	}
	```
	
### 生成代码

* 了解了如何定义thrift文件之后，我们需要用定义好的thrift文件生成我们需要的目标语言的源码
* 首先需要定义thrift接口描述文件
* 参见data.thrift

**data.thrift**

```thrift
namespace java thrift.generated

typedef i16 short
typedef i32 int
typedef i64 long
typedef bool boolean
typedef string String

struct Person {
    1: optional String username,
    2: optional int age,
    3: optional boolean married
}

exception DataException {
    1: optional String message,
    2: optional String callStack,
    3: optional String date
}

service PersonService {
    Person getPersonByUsername(1: required String username) throws (1: DataException dataException),

    void savePerson(1: required Person person) throws (1: DataException dataException)
}
```

执行生成代码命令

`thrift --gen java src/thrift/data.thrift`


记得导入`'org.apache.thrift:libthrift:0.10.0'`


生成了3个类，分别是`Person`，`DataException`，`PersonService`。

然后我们来写一个service的实现类

`PersonServiceImpl`

```java
package com.sail.thrift;

import thrift.generated.DataException;
import thrift.generated.Person;
import thrift.generated.PersonService;

/**
 * @author yangfan
 * @date 2017/07/09
 */
public class PersonServiceImpl implements PersonService.Iface {
    @Override
    public Person getPersonByUsername(String username) throws DataException, org.apache.thrift.TException {

        Person person = new Person();

        person.setUsername(username);
        person.setAge(20);
        person.setMarried(false);

        return person;
    }

    @Override
    public void savePerson(Person person) throws DataException, org.apache.thrift.TException {
        System.out.println("Got Client Param: ");

        System.out.println(person.getUsername());
        System.out.println(person.getAge());
        System.out.println(person.isMarried());
    }
}

```

## 测试

接下来编写客户端和服务端代码进行测试。

`ThriftServer.java`

```java
public class ThriftServer {
    public static void main(String[] args) throws Exception {
        TNonblockingServerSocket socket = new TNonblockingServerSocket(8899);
        THsHaServer.Args arg = new THsHaServer.Args(socket).minWorkerThreads(2).maxWorkerThreads(4);
        PersonService.Processor<PersonServiceImpl> processor = new PersonService.Processor<>(new PersonServiceImpl());

        arg.protocolFactory(new TCompactProtocol.Factory());
        arg.transportFactory(new TFramedTransport.Factory());
        arg.processorFactory(new TProcessorFactory(processor));

        TServer server = new THsHaServer(arg);

        System.out.println("Thrift Server Started");

        server.serve();
    }
}
```


`ThriftClient.java`

```java
public class ThriftClient {

    public static void main(String[] args) {
        TTransport transport = new TFramedTransport(new TSocket("localhost", 8899), 600);

        TProtocol protocol = new TCompactProtocol(transport);
        PersonService.Client client = new PersonService.Client(protocol);

        try {
            transport.open();

            Person person = client.getPersonByUsername("张三");

            System.out.println(person.getUsername());
            System.out.println(person.getAge());
            System.out.println(person.isMarried());


            Person person2 = new Person();
            person2.setUsername("李四");
            person2.setAge(30);
            person2.setMarried(true);

            client.savePerson(person2);

        } catch (Exception e) {
            throw new RuntimeException(e.getMessage(), e);
        } finally {
            transport.close();
        }

    }
}
```


然后分别启动服务端和客户端


服务端输出：

```
Thrift Server Started
Got Client Param: 
李四
30
true
```

客户端输出:

```
Received 1
张三
20
false
Received 2
```


## Thrift传输格式

* TBinaryProtocol-二进制格式
* TCompactProtocal-压缩格式
* TJSONProtocol-JSON格式
* TSimpleJSONProtocol-提供JSON只写协议，生成的文件很容易通过脚本语言解析。
* TDebugProtocol-使用易懂的可读的文本格式，以便于debug


## Thrift数据传输方式

* TSocket-阻塞式Socket
* TFramedTransport-以frame为单位进行传输，非阻塞式服务中使用。
* TFileTransport-以文件形式进行传输。
* TMemortyTransport-将内存用于I/O，Java实现时内部实际使用了简单的ByteArrayOuputStream。
* TZlibTransport-使用zlib进行压缩，与其他传输方式联合使用。当前无Java实现。

## Thrift支持的服务模型

* TSimpleServer-简单的单线程服务模型，常用于测试
* TThreadPoolServer-多线程服务模型，使用标准的阻塞式IO
* TNonblockingServer-多线程服务模型，使用非阻塞式IO（需使用TFramedTransport数据传输方式）
* THsHaServer-ThsHa引入了线程池去处理，其模型把读写任务房到线程池去处理；Half-sync/Half-async的处理模式，Half-aysnc是在处理IO时间上（accpect/read/write io），Half-sync是用于handler对rpc的同步处理


## Thrift对多语言的支持

### Python作为Client

在`data.thrift`中增加一行代码

```code
namespace java thrift.generated
namespace py py.thrift.generated
```

然后执行命令生成python代码			
`thrift --gen py src/thrift/data.thrift`

在Java项目中，我们的依赖是通过gradle引入的，这里python我们需要下载thrift的包，然后进入lib/py目录，执行里面的python脚本。


`sudo python setup.py install`


生成的依赖位于：**/Library/Python/2.7/site-packages/thrift-0.10.0-py2.7-macosx-10.12-intel.egg**

然后编写客户端的代码

```python
# coding=utf-8
__author__ = 'sail'

from py.thrift.generated import PersonService
from py.thrift.generated import ttypes

from thrift import Thrift
from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TCompactProtocol
import sys

reload(sys)
sys.setdefaultencoding('utf8')

try:
    tSocket = TSocket.TSocket("localhost", 8899)
    tSocket.setTimeout(600)

    transport = TTransport.TFramedTransport(tSocket)
    protocol = TCompactProtocol.TCompactProtocol(transport)
    client = PersonService.Client(protocol)

    transport.open()

    person = client.getPersonByUsername("张三")

    print person.username
    print person.age
    print person.married

    print '----------------'

    newPerson = ttypes.Person()
    newPerson.username = "lisi"
    newPerson.age = 30
    newPerson.married = True

    client.savePerson(newPerson)


except Thrift.TException, tx:
    print '%s' % tx.message
```

运行后输出以下结果

```code
张三
20
False
```

### Python作为Server

编写`py_server.py`代码:

```python
# coding=utf-8


from py.thrift.generated import PersonService
from PersonServiceImpl import PersonServiceImpl
from thrift import Thrift
from thrift.transport import TTransport
from thrift.transport import TSocket
from thrift.protocol import TCompactProtocol
from thrift.server import TServer

try:
    personServiceHandler = PersonServiceImpl()
    processor = PersonService.Processor(personServiceHandler)

    serverSocket = TSocket.TServerSocket(port=8899)
    transportFactory = TTransport.TFramedTransportFactory()
    protocolFactory = TCompactProtocol.TCompactProtocolFactory()

    server = TServer.TSimpleServer(processor, serverSocket, transportFactory, protocolFactory)
    server.serve()

except Thrift.TException, ex:
    print '%s' % ex.message
```

然后启动python的服务端，再分别执行Java和Python的客户端，都得到了正确的响应。