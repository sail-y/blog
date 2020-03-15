---
title: 高可用缓存架构实战5-缓存预热
date: 2018-02-22 20:16:59
tags: [多级缓存架构]
categories: 高可用缓存架构实战
---

此为龙果学院课程笔记，记录以供以后翻看

## 缓存预热

系统刚上线的时候，redis里面是没有数据的，如果这个时候高并发的流量过来全部跑到mysql，那么mysql肯定就挂掉了。所以我们需要缓存预热
<!--more-->

1. 提前给redis中灌入部分数据，再提供服务
2. 肯定不可能将所有数据都写入redis，因为数据量太大了，第一耗费的时间太长了，第二根本redis容纳不下所有的数据
3. 需要根据当天的具体访问情况，实时统计出访问频率较高的热数据
4. 然后将访问频率较高的热数据写入redis中，肯定是热数据也比较多，我们也得多个服务并行读取数据去写，并行的分布式的缓存预热
5. 然后将灌入了热数据的redis对外提供服务，这样就不至于冷启动，直接让数据库裸奔了



缓存预热的方案和流程：

1、 nginx+lua将访问流量上报到kafka中

要统计出来当前最新的实时的热数据是哪些，我们就得将商品详情页访问的请求对应的流量，日志，实时上报到kafka中。

2、 storm从kafka中消费数据，实时统计出每个商品的访问次数，访问次数基于LRU内存数据结构的存储方案

[如何使用storm？](http://www.saily.top/2018/02/22/cache04-3/)

优先用内存中的一个LRUMap去存放，这样做性能高，而且没有外部依赖。否则依赖redis的话，我们本就是要防止redis挂掉数据丢失的情况，就不合适了; 用mysql，扛不住高并发读写; 用hbase，hadoop生态系统，维护麻烦，太重了。其实我们只要统计出最近一段时间访问最频繁的商品，然后对它们进行访问计数，同时维护出一个前N个访问最多的商品list即可。计算好每个task大致要存放的商品访问次数的数量，计算出大小。然后构建一个LRUMap，apache commons collections有开源的实现，设定好map的最大大小，就会自动根据LRU算法去剔除多余的数据，保证内存使用限制。即使有部分数据被干掉了，然后下次来重新开始计数，也没关系，因为如果它被LRU算法干掉，那么它就不是热数据，说明最近一段时间都很少访问了。
	
3、每个storm task启动的时候，基于zk分布式锁，将自己的id写入zk同一个节点中

4、每个storm task负责完成自己这里的热数据的统计，每隔一段时间，就遍历一下这个map，然后维护一个前3个商品的list，更新这个list

5、写一个后台线程，每隔一段时间，比如1分钟，都将排名前3的热数据list，同步到zk中去，存储到这个storm task对应的一个znode中去

6、我们需要一个服务，比如说，代码可以跟缓存数据生产服务放一起，但是也可以放单独的服务，这个服务可能部署了很多个实例。每次服务启动的时候，就会去拿到一个storm task的列表，然后根据taskid，一个一个的去尝试获取taskid对应的znode的zk分布式锁。如果能获取到分布式锁的话，那么就将那个storm task对应的热数据的list取出来，然后将数据从mysql中查询出来，写入缓存中，进行缓存的预热。因为是多个服务实例，分布式的并行的去做，都基于zk分布式锁做了协调（没有并发冲突问题），分布式并行缓存的预热，效率很高。


## 基于nginx+lua完成商品详情页访问流量实时上报kafka的开发

在nginx这一层，接收到访问请求的时候，就把请求的流量上报发送给kafka。这样的话，storm才能去消费kafka中的实时的访问日志，然后去进行缓存热数据的统计。用的技术方案非常简单，从lua脚本直接创建一个kafka producer，发送数据到kafka。

```bash
cd /usr/local
wget https://github.com/doujiang24/lua-resty-kafka/archive/master.zip
yum install -y unzip
unzip master.zip
cp -rf /usr/local/lua-resty-kafka-master/lib/resty /usr/hello/lualib
```

接着修改脚本，开始写记录日志并发送到kafka：

```lua
local cjson = require("cjson")
local producer = require("resty.kafka.producer")

local broker_list = {
	{host="192.168.2.201", port=9092},
	{host="192.168.2.202", port=9092},
	{host="192.168.2.203", port=9092}
}

local log_json = {}
-- 商品详情页
log_json["request_module"] = "product_detail_info"
log_json["headers"] = ngx.req.get_headers()
log_json["uri_args"] = ngx.req.get_uri_args()
log_json["body"] = ngx.req.read_body()  
log_json["http_version"] = ngx.req.http_version()  
log_json["method"] =ngx.req.get_method() 
log_json["raw_reader"] = ngx.req.raw_header()  
log_json["body_data"] = ngx.req.get_body_data()  

local message = cjson.encode(log_json);  

local uri_args = ngx.req.get_uri_args()
local productId = uri_args["productId"]
local shopId = uri_args["shopId"]

-- 向kafka发送请求的记录
local async_producer = producer:new(broker_list, {producer_type="async"})
local ok, err = async_producer:send("access-log", productId, message)

local cache_ngx = ngx.shared.my_cache

-- 拼接商品和缓存的key
local productCacheKey = "product_info_"..productId
local shopCacheKey = "shop_info_"..shopId

-- 获取cache
local productCache = cache_ngx:get(productCacheKey)
local shopCache = cache_ngx:get(shopCacheKey)

-- 没有就从后端查询
if productCache ==  "" or productCache == nil then
    local http = require("resty.http")
    local httpc = http.new()

    local resp, err = httpc:request_uri("http://192.168.2.171:8080",{
	method = "GET",
	path = "/getProductInfo?productId="..productId
    })
    productCache = resp.body
    cache_ngx:set(productCacheKey, productCache, 10 * 60)
end 

if shopCache == "" or shopCache == nil then 
    local http = require("resty.http")
    local httpc = http.new()

    local resp, err = httpc:request_uri("http://192.168.2.171:8080",{
	method = "GET",
	path = "/getShopInfo?shopId="..shopId
    })

    shopCache = resp.body
    cache_ngx:set(shopCacheKey, shopCache, 10 * 60)
end


local productCacheJSON = cjson.decode(productCache)
local shopCacheJSON = cjson.decode(shopCache)

local context = {
	productId = productCacheJSON.id,
	productName = productCacheJSON.name,
	productPrice = productCacheJSON.price,
	productPictureList = productCacheJSON.pictureList,
	productSpecification = productCacheJSON.specification,
	productService = productCacheJSON.service,
	productColor = productCacheJSON.color,
	productSize = productCacheJSON.size,
	shopId = shopCacheJSON.id,
	shopName = shopCacheJSON.name,
	shopLevel = shopCacheJSON.level,
	shopGoodCommentRate = shopCacheJSON.goodCommentRate
}

-- 渲染模板
local template = require("resty.template")
template.render("product.html", context)
```

两台机器上都这样做，才能统一上报流量到kafka

修改配置：

1. 在nginx.conf中，http部分，加入resolver 8.8.8.8;
2. 在`/usr/local/kafka/config/server.properties`中加入`advertised.host.name = 192.168.2.201`(各kafka实例的ip)，杀掉并重启三个kafka进程。`nohup bin/kafka-server-start.sh config/server.properties &`
3. 启动eshop-cache缓存服务，因为nginx中的本地缓存可能不在了


下面试试消息是否上报成功，先创建kafka topic。

```bash
bin/kafka-topics.sh --zookeeper 192.168.2.201:2181,192.168.2.202:2181,192.168.2.203:2181 --topic access-log --replication-factor 1 --partitions 1 --create
```

访问：http://192.168.2.203/product?productId=1&requestPath=product&shopId=1

启动consumer，订阅access-log主题可以看到消息已经发送过来了。

```bash
bin/kafka-console-consumer.sh --zookeeper 192.168.2.201:2181,192.168.2.202:2181,192.168.2.203:2181 --topic access-log --from-beginning
```



![cache05_1.png](/img/cache/cache05_1.png)


## 基于Storm统计热数据

1. 用Spout从kafka读取消息
2. Bolt提取productId发射到下一个Bolt
3. 基于LRUMap统计热点访问的productId
4. 将热点数据存入zookeeper


https://github.com/sail-y/eshop-storm


预热逻辑：

1. 服务启动的时候，进行缓存预热
2. 从zk中读取taskid列表
3. 依次遍历每个taskid，尝试获取分布式锁，如果获取不到，快速报错，不要等待，因为说明已经有其他服务实例在预热了
4. 直接尝试获取下一个taskid的分布式锁
5. 即使获取到了分布式锁，也要检查一下这个taskid的预热状态，如果已经被预热过了，就不再预热了
6. 执行预热操作，遍历productid列表，查询数据，然后写ehcache和redis
7. 预热完成后，设置taskid对应的预热状态

https://github.com/sail-y/eshop-cache


## 基于nginx+lua+storm的热点缓存的流量分发策略自动降级解决方案

如果因为秒杀等或者抢购等原因，某一个商品访问量瞬间飙升，就算做了流量分发和缓存，因为hash策略所以同一个productId会被分发到同一个nginx服务器中。那么这就可能会导致nginx服务挂掉，这一台挂掉后别的服务上，然后也陆陆续续挂掉，导致整个系统不可用。


---

**解决办法：**

**在storm中实时的计算出瞬间出现的热点**

我们可以基于storm来计算热点数据，比如我们将访问的次数排序，将后面95%的数据访问量取一个平均值。这个时候要设定一个阈值，如果超出95%平均值的n倍，例如5倍，我们就认为是瞬间出现的热点数据，判断其可能在短时间内继续扩大的访问量，甚至达到平均值几十倍，或者几百倍，当发现第一个商品的访问次数，小于平均值的5倍，就安全了，就break掉这个循环。

**流量分发nginx的分发策略降级**

流量分发nginx加一个逻辑：每次访问一个商品详情页的时候，如果发现它是个热点，那么立即做流量分发策略的降级。降级成对这个热点商品，流量分发采取随机负载均衡发送到所有的后端应用nginx服务器上去。瞬间将热点缓存数据的访问从hash分发全部到一台nginx，变成了负载均衡发送到多台nginx上。

**storm还需要保存下来上次识别出来的热点list**

保存上次的热点数据，跟这次计算出的热点数据进行比较，那么就需要对某些数据进行热点取消，删除nginx本地缓存。

### 代码实战

https://github.com/sail-y/eshop-storm

	HotProductFindThread.java
	
新增的逻辑：

1. 将LRUMap中的数据按照访问次数进行全局的排序
2. 计算95%的商品访问次数的平均值
3. 遍历排序后的商品访问次数，降序
4. 如果某个商品是平均访问量的10倍以上，就认为是缓存的热点
5. 将缓存热点数据推送到流量分发的nginx中
6. 将获取到的换成你数据推送到nginx服务上

### lua接口开发

**将热点数据进行标记接口开发**

之前流量分发的nginx服务是部署在192.168.2.203上面的，所以`vi /usr/hello/hello.conf`

```lua
server {
    listen       80;
    server_name  _;

    location /hello {
        default_type 'text/html';
        content_by_lua_file /usr/hello/lua/hello.lua;
    }

    location /product {
        default_type 'text/html';
        content_by_lua_file /usr/hello/lua/distribute.lua;
    }

    location /hot {
        default_type 'text/html';
        content_by_lua_file /usr/hello/lua/hot.lua;
    }
}
```
               
```bash
vi /usr/hello/lua/hot.lua

local uri_args = ngx.req.get_uri_args()
local product_id = uri_args["productId"]

local cache_ngx = ngx.shared.my_cache

local hot_product_cache_key = "hot_product_"..product_id
cache_ngx:set(hot_product_cache_key, "true", 60*60)


/usr/servers/nginx/sbin/nginx -s reload
```

---

**设置缓存数据接口开发**

**分别在201和201的nginx应用增加一个hot的配置**

```bash
vi /usr/hello/hello.conf
location /hot {
	default_type 'text/html';
	content_by_lua_file /usr/hello/lua/hot.lua;
}

vi /usr/hello/lua/hot.lua

local uri_args = ngx.req.get_uri_args()
local product_id = uri_args["productId"]
local product_info = uri_args["productInfo"]

local product_cache_key = "product_info_"..product_id
local cache_ngx = ngx.shared.my_cache

cache_ngx:set(product_cache_key, product_info, 60*60)
```


### 自动降级代码开发


下面在distribute.lua里面开发自动降级的逻辑

1. 取出之前在hot.lua中缓存的hot_product_cache_key
2. 如果为`true`就不走hash算法进行流量分发了，走随机负载均衡算法。

```lua
local hosts = {"192.168.2.201", "192.168.2.202"}
local backend = ""
local hot_product_key = "hot_product_"..productId
local cache_ngx = ngx.shared.my_cache
local hot_product_flag = cache_ngx:get(hot_product_key)

if hot_product_flag == "true" then
  math.randomseed(tostring(os.time()):reverse():sub(1, 7))
  local index = math.random(1, 2)
  backend = "http://"..hosts[index]
else
  local hash = ngx.crc32_long(productId)
  local index = (hash % 2) + 1
  backend = "http://"..hosts[index]
end
```


### 热点缓存消失自动识别和感知逻辑开发

https://github.com/sail-y/eshop-cache

**HotProductFindThread.java**	
	
```
// 缓存热点消失，发送一个一个http请求到nginx取消热点缓存的标识
String url = "http://192.168.2.203/cancelHot?productId=" + productId;
HttpClientUtils.sendGetRequest(url);
```
	
**203上nginx的lua接口开发**

```bash
vi hello.conf 
location /cancelHot {
    default_type 'text/html';
    content_by_lua_file /usr/hello/lua/cancelHot.lua;
}

cp lua/hot.lua lua/cancelHot.lua

vi lua/cancelHot.lua

local uri_args = ngx.req.get_uri_args()
local product_id = uri_args["productId"]

local cache_ngx = ngx.shared.my_cache

local hot_product_cache_key = "hot_product_"..product_id

cache_ngx:set(hot_product_cache_key, "false", 60)
```


### 测试

手动将某个热点设置为热点：

```
http://192.168.2.203/hot?productId=1
```

然后访问：

```
http://192.168.2.203/product?productId=1&requestPath=product&shopId=1
```

可以看到当缓存变成热点以后，访问的服务是随机变化的。


因为代码里用了缓存，所以记得在203的上面`vi conf/nginx.conf`，在http模块下新增`lua_shared_dict my_cache 128m;`。

1. 多访问几次不同的商品ID
2. 用storm运行topology，观察日志是否正确
3. 观察zookeeper里面的数据是否正确

```bash
zkCli.sh
get /task-hot-product-list-4
[5,1,3]
```


storm日志：

```bash
2018-03-03 21:12:56.627 c.r.e.s.b.ProductCountBolt Thread-17 [INFO] 【HotProductFindThread计算出一份排序后的商品访问次数列表】 productCountListJSON=[{1:11},{3:1},{5:1},{9:1},{7:1}]
2018-03-03 21:12:56.637 c.r.e.s.b.ProductCountBolt Thread-16 [INFO] 【ProductCountThread计算出一份top3热门商品列表】zk path=/task-hot-product-list-4, topnProductListJSON=[1,3,5]
2018-03-03 21:12:56.677 c.r.e.s.b.ProductCountBolt Thread-17 [INFO] 【HotProductFindThread】计算出后95%访问次数的平均值 avgCount=1.0
2018-03-03 21:12:56.821 c.r.e.s.b.ProductCountBolt Thread-17 [INFO] 【HotProductFindThread】 发现一个新的热点 productId=1
2018-03-03 21:12:58.754 c.r.e.s.b.ProductCountBolt Thread-17 [INFO] http://192.168.2.201/hot?productId=1&productInfo=%7B%22id%22%3A1%2C%22name%22%3A%22iphone7%E6%89%8B%E6%9C%BA%22%2C%22price%22%3A5599.0%2C%22pictureList%22%3A%22a.jpg%2Cb.jpg%22%2C%22specification%22%3A%22iphone7%E7%9A%84%E8%A7%84%E6%A0%BC%22%2C%22service%22%3A%22iphone7%E7%9A%84%E5%94%AE%E5%90%8E%E6%9C%8D%E5%8A%A1%22%2C%22color%22%3A%22%E7%BA%A2%E8%89%B2%2C%E7%99%BD%E8%89%B2%2C%E9%BB%91%E8%89%B2%22%2C%22size%22%3A%225.5%22%2C%22shopId%22%3A1%2C%22modifiedTime%22%3A%222017-01-01+12%3A00%3A00%22%7D%0A
2018-03-03 21:12:58.787 c.r.e.s.b.ProductCountBolt Thread-17 [INFO] http://192.168.2.202/hot?productId=1&productInfo=%7B%22id%22%3A1%2C%22name%22%3A%22iphone7%E6%89%8B%E6%9C%BA%22%2C%22price%22%3A5599.0%2C%22pictureList%22%3A%22a.jpg%2Cb.jpg%22%2C%22specification%22%3A%22iphone7%E7%9A%84%E8%A7%84%E6%A0%BC%22%2C%22service%22%3A%22iphone7%E7%9A%84%E5%94%AE%E5%90%8E%E6%9C%8D%E5%8A%A1%22%2C%22color%22%3A%22%E7%BA%A2%E8%89%B2%2C%E7%99%BD%E8%89%B2%2C%E9%BB%91%E8%89%B2%22%2C%22size%22%3A%225.5%22%2C%22shopId%22%3A1%2C%22modifiedTime%22%3A%222017-01-01+12%3A00%3A00%22%7D%0A
2018-03-03 21:12:58.807 c.r.e.s.b.ProductCountBolt Thread-17 [INFO] 【HotProductFindThread】 保存上次热点数据 lastTimeHotProductList=[1]
2018-03-03 21:13:01.637 c.r.e.s.b.ProductCountBolt Thread-16 [INFO] 【ProductCountThread打印productCountMap的长度】size=5
```

然后访问几次别的商品，把平均数提高。

```bash
2018-03-03 21:15:01.948 c.r.e.s.b.ProductCountBolt Thread-16 [INFO] 【ProductCountThread计算出一份top3热门商品列表】zk path=/task-hot-product-list-4, topnProductListJSON=[1,3,5]
2018-03-03 21:15:03.839 c.r.e.s.b.ProductCountBolt Thread-17 [INFO] 【ProductCountThread打印productCountMap的长度】size=5
2018-03-03 21:15:03.839 c.r.e.s.b.ProductCountBolt Thread-17 [INFO] 【HotProductFindThread计算出一份排序后的商品访问次数列表】 productCountListJSON=[{1:12},{3:3},{5:1},{9:1},{7:1}]
2018-03-03 21:15:03.839 c.r.e.s.b.ProductCountBolt Thread-17 [INFO] 【HotProductFindThread】计算出后95%访问次数的平均值 avgCount=1.5
2018-03-03 21:15:03.866 c.r.e.s.b.ProductCountBolt Thread-17 [INFO] 【HotProductFindThread】 发现一个热点消失了 productId=1
2018-03-03 21:15:03.866 c.r.e.s.b.ProductCountBolt Thread-17 [INFO] 【HotProductFindThread】 保存上次热点数据 lastTimeHotProductList=[]
2018-03-03 21:15:06.949 c.r.e.s.b.ProductCountBolt Thread-16 [INFO] 【ProductCountThread打印productCountMap的长度】size=5
```

