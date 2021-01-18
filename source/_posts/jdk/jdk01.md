---
title: JDK集合源码-List
date: 2020-10-13 14:00:37
tags: [java,JDK源码]
categories: JDK源码
---

# JDK集合源码

准备写一些文章，把集合、并发、网络相关的JDK工具的使用和源码都在这里记录一下。首先从简单的集合源码开始。

## List

### ArrayList

基于数组的集合，默认的构造函数，给了一个空数组，Object[]， {}，默认的初始化大小为10。

```java
/**
 * Constructs an empty list with an initial capacity of ten.
 */
public ArrayList() {
    this.elementData = DEFAULTCAPACITY_EMPTY_ELEMENTDATA;
}
```

> 一般在构造ArrayList，建议指定一个大小，避免频繁扩容带来的开销。

每次往ArrayList中插入数据的时候，都会判断当前数组的元素是否塞满了，如果塞满的话，此时就会扩容这个数组，然后将老数组中的元素拷贝到新数组中去，确保说数组一定是可以承受足够多的元素的。

<!-- more -->

#### add()方法的源码

```java
public boolean add(E e) {
    // 如果已经满了，会扩容大约1.5倍
    // int newCapacity = oldCapacity + (oldCapacity >> 1);
    // 然后利用Arrays.copyOf，将老数据复制到新数组中
    ensureCapacityInternal(size + 1);  // Increments modCount!!
    elementData[size++] = e;
    return true;
}
```

扩容的代码：

```java
private void grow(int minCapacity) {
  // overflow-conscious code
  int oldCapacity = elementData.length;
  // 大约是1.5倍
  int newCapacity = oldCapacity + (oldCapacity >> 1);
  if (newCapacity - minCapacity < 0)
    newCapacity = minCapacity;
  if (newCapacity - MAX_ARRAY_SIZE > 0)
    newCapacity = hugeCapacity(minCapacity);
  // minCapacity is usually close to size, so this is a win:
  // 将老数据的数据复制到新的数组里
  elementData = Arrays.copyOf(elementData, newCapacity);
}
```



#### set()方法的源码

set源码比较简单，就是检查索引是否超出边界，然后做一个值的替换。

```java
public E set(int index, E element) {
  rangeCheck(index);

  E oldValue = elementData(index);
  elementData[index] = element;
  return oldValue;
}
```

#### add(index, element)方法的源码

```java
public void add(int index, E element) {
  // 检查索引是否越界
  rangeCheckForAdd(index);
  // 检查容量是否够了
  ensureCapacityInternal(size + 1);  // Increments modCount!!
  // 关键代码，将某个索引后的数据往数组后面复制，也就是相当于数据往后移动一位
  System.arraycopy(elementData, index, elementData, index + 1,
                   size - index);
  elementData[index] = element;
  size++;
}
```

#### get()方法的源码

这个简单，就是直接根据索引返回数组里的数据。

```java
public E get(int index) {
  rangeCheck(index);

  return elementData(index);
}
```

#### remove()方法的源码

删除某一个元素，就是从某一个元素开始往前移动一位，然后将最后一位重置为null

```java
public E remove(int index) {
  rangeCheck(index);

  modCount++;
  E oldValue = elementData(index);

  int numMoved = size - index - 1;
  if (numMoved > 0)
    // 往前移动
    System.arraycopy(elementData, index+1, elementData, index,
                     numMoved);
  elementData[--size] = null; // clear to let GC do its work

  return oldValue;
}
```

#### 总结

remove()
add(index, element)

这个两个方法，都会导致数组的拷贝，大量元素的挪动，性能都不是太高，基于数组来做这种随机位置的插入和删除，其实性能真的不是太高

add()、add(index, element)，这两个方法，都可能会导致数组需要扩容，数组长度是固定的，默认初始大小是10个元素，如果不停的往数组里塞入数据，可能会导致瞬间数组不停的扩容，影响系统的性能

set()、get()，定位到随机的位置，替换那个元素，或者是获取那个元素，这个其实还是比较靠谱的，基于数组来实现随机位置的定位，性能是很高的

### LinkedList

LinkedList，是一个双向链表。

![image-20201013184959422](/Users/yangfan/Nutstore Files/code/blog/source/img/jdk/image-20201013184959422.png)

add()，默认就是在队列的尾部插入一个元素，在那个双向链表的尾部插入一个元素
add(index, element)，是在队列的中间插入一个元素
addFirst()，在队列的头部插入一个元素
addLast()，跟add()方法是一样的，也是在尾部插入一个元素

#### 插入元素

在往中间插入数据的时候，会根据传入的索引，找到对应的节点，然后设置到节点的before变量中，那么在查找这个节点的过程中，实际上是一个遍历的过程。

```java
Node<E> node(int index) {
    // assert isElementIndex(index);
    // 如果索引在列表的前半部分，则从前往后开始遍历
    if (index < (size >> 1)) {
        Node<E> x = first;
        for (int i = 0; i < index; i++)
            x = x.next;
        return x;
    } else {// 否则从后往前遍历查找
        Node<E> x = last;
        for (int i = size - 1; i > index; i--)
            x = x.prev;
        return x;
    }
}
```

然后通过一些指针的变换操作，来完成插入。

```java
void linkBefore(E e, Node<E> succ) {
  // assert succ != null;
  final Node<E> pred = succ.prev;
  final Node<E> newNode = new Node<>(pred, e, succ);
  succ.prev = newNode;
  if (pred == null)
    first = newNode;
  else
    pred.next = newNode;
  size++;
  modCount++;
}
```

![image-20201013185212959](/Users/yangfan/Nutstore Files/code/blog/source/img/jdk/image-20201013185212959.png)

#### 获取元素

**getFirst() == peek()**：获取头部的元素，直接返回first指针指向的那个Node里面的数据，他们都是返回头部的元素。getFirst()如果是对空list调用，会抛异常；peek()对空list调用，会返回null

**getLast()**：获取尾部的元素



get(int index)，需要用到node(index)方法来定位元素，也就是先判断索引在前半部分还是在后半部分，然后遍历来获得元素，性能较低。

#### 删除元素

**removeLast()**
**removeFirst() == poll()**
**remove(int index)**

删除，也是通过一些指针的替换，将节点脱离出来，item设置为null，然后等待被回收掉。

![image-20201013185444906](/Users/yangfan/Nutstore Files/code/blog/source/img/jdk/image-20201013185444906.png)

### Vector和Stack

Stack是基于数组的栈结构，而Vector是基于数组的有序集合，Stack是继承于Vector。

栈：先进后出

Stack的push方法，几乎和ArrayList的add一样，顺序设置数组的元素

```java
elementData[elementCount++] = obj;
```

但是，ArrayList每次扩容是1.5倍，`capacity + (capacity >> 1) = 1.5`，Vector每次扩容默认是2倍。

pop()方法，从栈顶弹出一个元素，就是返回最后一个元素，然后删除最后一个元数据，这里会涉及到利用System.arraycopy拷贝数组元素。

```java
return elementAt(len - 1);
```



## ConcurrentModificationException

一个最常见的场景，就是在迭代这个集合的时候，对集合进行remove操作，就一定会遇到这个错误。

这个是集合迭代器的fail-fast机制，每一种集合的数据结构，都有一个modCount的字段，新增和删除元素的时候，会对这个字段进行modCount++操作。

然后在初始化迭代器的时候，会记录初始化的会记录modCount的值到expectedModCount中。

```java
private class Itr implements Iterator<E> {
    int cursor;       // index of next element to return
    int lastRet = -1; // index of last element returned; -1 if no such
    // 初始化的时候记录modCount的值
    int expectedModCount = modCount;
```

然后在后面迭代的的回收，会判断值是否发生改变，如果改变了，就直接抛出异常。

```java
final void checkForComodification() {
    if (modCount != expectedModCount)
        throw new ConcurrentModificationException();
}
```

