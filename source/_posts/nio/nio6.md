---
title: Java 编码和解码
date: 2017-08-27 15:35:41
tags: [java,io]
categories: io
---

做过web开发的人一定遇到过中文乱码的问题，一般情况下我们都是直接把所有的编码都设置成UTF-8，可是并没有真正的去理解为什么会导致乱码的问题，这里一起研究一下编码和解码究竟是怎么一回事。


这段代码很简单，就是读取一个文件的内容，然后输出到另外一个文件里面。

<!--more-->

```java
/**
 * Java的编解码
 * @author yangfan
 * @date 2017/08/27
 */
public class NioTest13 {
    public static void main(String[] args) throws IOException {
        String inputFile = "NioTest13_In.txt";
        String outputFile = "NioTest13_Out.txt";

        // 把一个文件拷贝到另一个文件

        RandomAccessFile inputRandomAccessFile = new RandomAccessFile(inputFile, "r");
        RandomAccessFile outputRandomAccessFile = new RandomAccessFile(outputFile, "rw");

        long inputLength = new File(inputFile).length();

        FileChannel inputFileChannel = inputRandomAccessFile.getChannel();
        FileChannel outputFileChannel = outputRandomAccessFile.getChannel();

        MappedByteBuffer inputData = inputFileChannel.map(FileChannel.MapMode.READ_ONLY, 0, inputLength);

        Charset charset = Charset.forName("utf-8");
        CharsetDecoder decoder = charset.newDecoder();
        CharsetEncoder encoder = charset.newEncoder();

        CharBuffer charBuffer = decoder.decode(inputData);

        ByteBuffer outputData = encoder.encode(charBuffer);

        outputFileChannel.write(outputData);

        inputRandomAccessFile.close();
        outputRandomAccessFile.close();

    }
}

```



但这里有很关键的几行代码。

```java
Charset charset = Charset.forName("utf-8");
CharsetDecoder decoder = charset.newDecoder();
CharsetEncoder encoder = charset.newEncoder();
```

`NioTest13_In.txt `读取的内容为：

```plain
hello,world
你好
```

程序执行后，得到了正确的结果。


无论是用程序还是用工具保存的文件，最后都是以字节的形式保存在硬盘上的，那么在保存的时候，是有一个字符编码。我们可以用一些工具查看某个文件的编码是什么，比如mac上有一个叫enca的工具，可以执行`brew install enca`进行安装。

```bash
enca NioTest13_In.txt 
Universal transformation format 8 bits; UTF-8
```

我们之前的代码`Charset.forName("utf-8");`表示用utf8来对文件编解码，读取的文件和输出的文件，都是utf8格式的。

现在对代码进行一点改动，把编码格式改成`Charset charset = Charset.forName("iso-8859-1");`,查看输出的文件内容，发现竟然没有乱码，而且用工具查看编码格式依然是utf8，这是怎么回事呢?

下面分别解释一下我们常见的几种编码:

1. ASCII (American Standard Code for Information Interchange, 美国信息交换标准代码)

	7 bit表示一个字符，共计可以表示128种字符。
	
2. IOS-8859-1，基于ASCII的扩展

	8 bit表示一个字符，即用一个字节（byte）(8 bit)来表示一个字符，共计可以表示256个字符。
	
3. gb2312，常见汉字编码

	2个字节表示1个汉字
	
4. GBK，包括生僻字的编码
5. GB18030，最完整的汉字编码
6. 	BIG5，台湾繁体字编码
7. unicode，包括全球所有编码的字符节。

	采用2个字节表示一个字符。
8. utf-Unicode Translation Format. 

	因为unicode太占存储空间了，所以又诞生了utf8,utf16等格式，unicode本身是一种编码方式，而utf是一种存储方式；utf-8是unicode的实现方式之一。
	
	utf-16LE(little endian), utf16-be(big endian)
	
	>大端和小端：unicode编码的文件开头有一个Zero Width No-break Space。如果是0xFEFF (BE), 0xFFFE(LE)，表示大端还是小端。
	
	utf-8，变长字节表示形式，一般来说，utf-8会通过3个字节来表示一个中文。
	
	utf8有个概念：BOM(Byte Order Mark)，就是文件头，在windows里用16进制打开文件能看到，但是mac和linux里是没有的。
	
	

那么刚才用`ios-8859-1`来读取，读取英文的部分没有问题，那么为什么中文也是正确的呢？`你好`，因为utf8是用3个字节表示一个中文，这2个字的字节表示为`E4 BD A0 E5 A5 BD`。那么用`ios-8859-1`解码的时候，先读取一个字节**E4**，这个肯定是乱码，但是在解码完成后，再进行编码的时候完整了放入了6个字节的数据，而输出的文件又是`utf-8`格式，所以我们查看文件的时候，又把字节进行了正确的解析。
	
	
如果我们解码和编码用的不同的字符集，那么肯定就会出错了。
	
	

	

