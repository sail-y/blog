---
title: JDK集合源码-Map
date: 2020-10-16 14:00:37
tags: [java,JDK源码]
categories: JDK源码
---

# Map源码

Map是集合里一个非常重要的数据结构，面试也是会经常问到源码的。

## HashMap

简单描述一下HashMap的原理，它的结构就是数组+链表+红黑树。

put的时候，对key进行hash，找到对应的数组位置放在里面，然后hash冲突了就组成链表往后追加。查询的时候也是一样，对key进行hash，然后用equals去比较链表上key的值。

JDK1.8优化了hashmap的数据结构，如果链表过长，达到8以后，就会转变成红黑树。

### 数据结构

这个数组的初始化长度，是16，和ArrayList不一样。

```java
// 数组变量
transient Node<K,V>[] table;
static final int DEFAULT_INITIAL_CAPACITY = 1 << 4; // aka 16	
// 初始数组大小，默认是16
int threshold;
// 数组长度
transient int size;
```

<!-- more -->

然后他有个，负载因子是0.75，意思就是默认情况下，如果数组占用达到了`16 * 0.75 = 12`，就会开始执行扩容操作了。 

```java
static final float DEFAULT_LOAD_FACTOR = 0.75f;
// 这个就是负载因子值了，默认就是上边这个0.75
final float loadFactor;
```

```java
Node(int hash, K key, V value, Node<K,V> next) {
    this.hash = hash;
    this.key = key;
    this.value = value;
    // next指针，就形成了链表
    this.next = next;
}

```
### put

看这个put方法的源码，就是有一个hash(key)的方法，用来做key做hash计算，然后定位数组索引用的。

```java
public V put(K key, V value) {
    return putVal(hash(key), key, value, false, true);
}
```

#### hash算法

这个hash(key)，并不是简单对hashCode取模得到的一个值，它这里是一个非常高性能的操作。

```java
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
```

首先，key.hashCode()，直接获取到了key的hash值，然后和 h >>> 16做了一个异或的运算。

h >>> 16，就是二进制右移16位，举例，下面是一个hash值的2进制

`1111 1111 1111 1111 1111 1010 0111 1100`

右移16位后，高位补0，他就变成了

`0000 0000 0000 0000 1111 1111 1111 1111`

然后再做异或操作，也就是`h ^ (h >>> 16)`

> 异或：如果a、b两个值不相同，则异或结果为1。如果a、b两个值相同，异或结果为0。

所以异或之后的结果是

```text
1111 1111 1111 1111 1111 1010 0111 1100
0000 0000 0000 0000 1111 1111 1111 1111
1111 1111 1111 1111 0000 0101 1000 0011
```

发现没有，这么做，就实现了int值的，高16位和低16位异或运算，为什么要这么做呢，是跟后面的代码有关系。

在定位数组索引的时候，也用到了一个位运算，代码如下：

```java
tab[i = (n - 1) & hash]
```

n就是数组的长度，这个值一般情况下，是比较小的，比如n=16的二进制

`0000 0000 0000 0000 0000 0000 0001 0000`

这个值如果去和原始的hash值做位运算，肯定始终都是只会在低16位做运算，高16位，就用不上了。所以提前用hash()方法将高16位和低16位做了位运算后，就能保证在定位数组索引的时候，无论这个n值的大小，也能让hash的高低16位都参与到运算中。

为什么要这样做呢？因为这样做可以**降低hash冲突的概率**，如果说老是用低16位去做运算定位数组索引的话，就会导致一定的hash冲突。

继续看put的源码。

```java
Node<K,V>[] tab; Node<K,V> p; int n, i;
// 刚开始，数组都是空的，这里就分配一个默认的大小，也就是16
if ((tab = table) == null || (n = tab.length) == 0)
    n = (tab = resize()).length;
// (n - 1) & hash 通过位运算，来实现了一个取模的效果，而且每次扩容，都是2的n次方，只要保证数组的大小是2的n次方，就能保证(n - 1) & hash和 hash % 数组.length取模是一样的效果
// 比直接取模，效率高很多
if ((p = tab[i = (n - 1) & hash]) == null)
    tab[i] = newNode(hash, key, value, null);
```

这个取模的优化，是hashmap非常重要的优化点

#### putVal

接着看源码

```java
final V putVal(int hash, K key, V value, boolean onlyIfAbsent,
               boolean evict) {
    Node<K,V>[] tab; Node<K,V> p; int n, i;
    if ((tab = table) == null || (n = tab.length) == 0)
        n = (tab = resize()).length;
    // 这个 (n - 1) & hash 很重要
    if ((p = tab[i = (n - 1) & hash]) == null)
        tab[i] = newNode(hash, key, value, null);
    else {
        Node<K,V> e; K k;
        // 满足这个条件，说明是相同的key，覆盖旧的值就好
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            e = p;
        else if (p instanceof TreeNode)
            // 处理红黑树的情况
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
        else {
            for (int binCount = 0; ; ++binCount) {
                if ((e = p.next) == null) {
                    p.next = newNode(hash, key, value, null);
                    // 如果链表的总长度达到了8，那么链表就要转变成红黑树了
                    if (binCount >= TREEIFY_THRESHOLD - 1) // -1 for 1st
                        treeifyBin(tab, hash);
                    break;
                }
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    break;
                p = e;
            }
        }
        // 相同的key，替换新的值
        if (e != null) { // existing mapping for key
            V oldValue = e.value;
            if (!onlyIfAbsent || oldValue == null)
                e.value = value;
            afterNodeAccess(e);
            return oldValue;
        }
    }
    ++modCount;
    if (++size > threshold)
        resize();
    afterNodeInsertion(evict);
    return null;
}
```

#### 红黑树

这个红黑树的具体算法，非常复杂，有什么翻转，变色什么的，就当成黑盒来看吧

```java
/**
 * Replaces all linked nodes in bin at index for given hash unless
 * table is too small, in which case resizes instead.
 */
final void treeifyBin(Node<K,V>[] tab, int hash) {
    int n, index; Node<K,V> e;
    if (tab == null || (n = tab.length) < MIN_TREEIFY_CAPACITY)
        resize();
    else if ((e = tab[index = (n - 1) & hash]) != null) {
        TreeNode<K,V> hd = null, tl = null;
        // 循环的方式，先转成双向链表，然后转成成一棵树
        do {
            TreeNode<K,V> p = replacementTreeNode(e, null);
            if (tl == null)
                hd = p;
            else {
                p.prev = tl;
                tl.next = p;
            }
            tl = p;
        } while ((e = e.next) != null);
        if ((tab[index] = hd) != null)
            hd.treeify(tab);
    }
}
```

结合前面的源码看，如果put的时候发现一家是一个红黑树了，那么就是直接往红黑树上挂节点了。

`e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);`

#### 数组扩容

HashMap基于数组的数据结构，那么必然会有扩容的问题，它的原理就是，达到负载因子的的数量后，就进行2倍扩容，然后rehash，每一个key-value对，都会基于key的hash值重新寻址找到新数组的新的位置。

比如他之前的长度是16，新的数组长度是32

之前那些key的hash可能之前对16取模的位置是5，那么对32取模后，他的位置就变成了11，位置发生了变化。

这是1.7之前的原理，1.8以后，他就不是直接取模了，用的是与运算的位操作来实现高性能的取模操作，但是这个就要求数组的长度必须是2的n次方。

举一个扩容的例子。

还记得寻址的算法么：`tab[i = (n - 1) & hash]`

此时，n=16

第一个key

n - 1    0000 0000 0000 0000 0000 0000 0000 1111

hash1 1111 1111 1111 1111 0000 1111 0000 0101

&结果  0000 0000 0000 0000 0000 0000 0000 0101  = 5（index = 5的位置）

第二个key

n - 1 0000 0000 0000 0000 0000 0000 0000 1111

hash2 1111 1111 1111 1111 0000 1111 0001 0101

&结果 0000 0000 0000 0000 0000 0000 0000 0101 = 5（index = 5的位置）

他们就是在同一个位置，然后数组扩容，变成了32

此时，n=32

第一个key

n-1 0000 0000 0000 0000 0000 0000 0001 1111

hash1 1111 1111 1111 1111 0000 1111 0000 0101

&结果 0000 0000 0000 0000 0000 0000 0000 0101 = 5（index = 5的位置）

 第二个key

n-1      0000 0000 0000 0000 0000 0000 0001 1111

hash2 1111 1111 1111 1111 0000 1111 0001 0101

&结果 0000 0000 0000 0000 0000 0000 0001 0101 = 21（index = 21的位置）

第一个位置没有变，但是第二个就变成了21。

所以规律是什么？

1. 首先，数组的长度肯定是2的倍数，16->32->64->128
2. 扩容之后，key要么在之前的index位置，要么就变成了之前的index（5） + oldCap（16） = 21的位置

贴下扩容的代码

```java
final Node<K,V>[] resize() {
    Node<K,V>[] oldTab = table;
    int oldCap = (oldTab == null) ? 0 : oldTab.length;
    int oldThr = threshold;
    int newCap, newThr = 0;
    if (oldCap > 0) {
        if (oldCap >= MAXIMUM_CAPACITY) {
            threshold = Integer.MAX_VALUE;
            return oldTab;
        }
        else if ((newCap = oldCap << 1) < MAXIMUM_CAPACITY &&
                 oldCap >= DEFAULT_INITIAL_CAPACITY)
            // 这就是数组2倍扩容了
            newThr = oldThr << 1; // double threshold
    }
    else if (oldThr > 0) // initial capacity was placed in threshold
        newCap = oldThr;
    else {               // zero initial threshold signifies using defaults
        newCap = DEFAULT_INITIAL_CAPACITY;
        newThr = (int)(DEFAULT_LOAD_FACTOR * DEFAULT_INITIAL_CAPACITY);
    }
    if (newThr == 0) {
        float ft = (float)newCap * loadFactor;
        newThr = (newCap < MAXIMUM_CAPACITY && ft < (float)MAXIMUM_CAPACITY ?
                  (int)ft : Integer.MAX_VALUE);
    }
    threshold = newThr;
    @SuppressWarnings({"rawtypes","unchecked"})
        Node<K,V>[] newTab = (Node<K,V>[])new Node[newCap];
    table = newTab;
    if (oldTab != null) {
        for (int j = 0; j < oldCap; ++j) {
            Node<K,V> e;
            if ((e = oldTab[j]) != null) {
                oldTab[j] = null;
                // e.next是null，说明就是一个单节点，直接重新计算一下hash放过去就好了
                if (e.next == null)
                    newTab[e.hash & (newCap - 1)] = e;
                // 如果是红黑树，就基于红黑树的算法讲每一个节点都重新hash寻址，找到各自的新数组位置
                else if (e instanceof TreeNode)
                    ((TreeNode<K,V>)e).split(this, newTab, j, oldCap);
                else { // preserve order
                    // 这里就是链表了
                    Node<K,V> loHead = null, loTail = null;
                    Node<K,V> hiHead = null, hiTail = null;
                    Node<K,V> next;
                    do {
                        next = e.next;
                        if ((e.hash & oldCap) == 0) {
                            if (loTail == null)
                                loHead = e;
                            else
                                loTail.next = e;
                            loTail = e;
                        }
                        else {
                            if (hiTail == null)
                                hiHead = e;
                            else
                                hiTail.next = e;
                            hiTail = e;
                        }
                    } while ((e = next) != null);
                    if (loTail != null) {
                        // 还是在之前的位置
                        loTail.next = null;
                        newTab[j] = loHead;
                    }
                    if (hiTail != null) {
                        hiTail.next = null;
                        // 如果是链表，它在新数组的位置就是之前的index+oldCap 
                        newTab[j + oldCap] = hiHead;
                    }
                }
            }
        }
    }
    return newTab;
}
```



## LinkedHashMap

HashMap看完了，LinkedHashMap也就简单了，它就是多了一个功能，它会记录你插入的顺序，如果你去遍历LinkedHashMap，是按照你插入的顺序来遍历的。

如果面试官问，LinkedHashMap和TreeMap，都可以维持key顺序，那区别是什么？LinkedHashMap是基于链表实现的，它的顺序是key的插入顺序，TreeMap的基于红黑树实现的，它的顺序是基于key的某个排序算法来排序的。

LinkedHashMap和HashMap的原理，大致是一样的，区别就是在插入、更新、删除的时候，他会记录一下key的顺序。他的put方法，其实也还是调用的HashMap的put方法，但是在执行结束之后，有一个`afterNodeInsertion(evict);`方法，这个方法在HashMap的实现中是空实现。但是在LinkedHashMap中，他就覆盖了这个方法，其实一共有3个方法在不同的地方会被回调到。

```java
// Callbacks to allow LinkedHashMap post-actions
void afterNodeAccess(Node<K,V> p) { }
void afterNodeInsertion(boolean evict) { }
void afterNodeRemoval(Node<K,V> p) { }
```

他用了一个链表的结构，来存储了key插入的顺序，这个数据结构就是，直接继承了HashMap的Node，然后增加了before和after参数

```java
static class Entry<K,V> extends HashMap.Node<K,V> {
    Entry<K,V> before, after;
    Entry(int hash, K key, V value, Node<K,V> next) {
        super(hash, key, value, next);
    }
}
```

然后每次都会调用linkNodeLast方法， 将这个节点挂在链表的后面

```java
// link at the end of list
private void linkNodeLast(LinkedHashMap.Entry<K,V> p) {
    LinkedHashMap.Entry<K,V> last = tail;
    tail = p;
    if (last == null)
        head = p;
    else {
        p.before = last;
        last.after = p;
    }
}
```

那么覆盖，会不会改变他的顺序呢，默认是不会的，

LInkedHashMap有一个字段，accessOrder，可在构造方法的时候传入，如果为true，则访问后也会刷新位置，否则只是插入才会记录位置。

```java
/**
 * The iteration ordering method for this linked hash map: <tt>true</tt>
 * for access-order, <tt>false</tt> for insertion-order.
 *
 * @serial
 */
final boolean accessOrder;
```

为true，get和put方法，都会导致这个key对应的Entry移动到链表的尾部去，删除元素的时候，也会从链表里删除。

迭代的时候，就会从链表的头部，也就是head节点开始按顺序迭代。

```java
/**
 * The head (eldest) of the doubly linked list.
 */
transient LinkedHashMap.Entry<K,V> head;

/**
 * The tail (youngest) of the doubly linked list.
 */
transient LinkedHashMap.Entry<K,V> tail;
```

![image-20201020131704780](/Users/yangfan/Nutstore Files/code/blog/source/img/jdk/image-20201020131704780.png)

## TreeMap

TreeMap是用红黑树做的数据结构，用红黑树维护了key的顺序，可以按照指定顺序进行迭代。

它有自己的Entry结构

```java
static final class Entry<K,V> implements Map.Entry<K,V> {
    K key;
    V value;
    Entry<K,V> left;
    Entry<K,V> right;
    Entry<K,V> parent;
    boolean color = BLACK;
}
```

默认情况下，TreeMap是按照自然排序，也就是字典序来对key进行排序的。如果想定制排序规则的话，可以在构造方法中参数排序比较器。

```java
public TreeMap(Comparator<? super K> comparator) {
    this.comparator = comparator;
}
```

## HashSet、LinkedHashSet、TreeSet

Set的源码，没什么好说的，他其实就是继承自HashMap，然后只用了key的结构，value都是空值。

比如HashSet，LinkedHashSet，TreeSet都是。

HashSet，就是无序的，LinkedHashSet就是插入顺序，TreeSet就是可排序的，都是不可重复的。

