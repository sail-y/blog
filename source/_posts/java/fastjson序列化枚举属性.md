title: fastjson序列化枚举属性
date: 2015-01-30 23:19:19
tags: [fastjson,java,枚举]
categories: Java
---

我的实体类里面有一个属性是枚举类型的，但是我在转换的时候我不希望取它的name，而是它的索引值0,1,2,3,搜索一番后发现这个回答

> [fastjson enum 枚举 反序列化](http://zhidao.baidu.com/link?url=5_N_6oaQaN6s-JLAZzwy-Fdbt93qC7VmzIfLvifZk463bKCwh7xBweUgBlJLczgHF9y7kjqNktsJmEVUuPlNkCw4sjfLaXq9ITfz9ieQH5u)
> 为了方便大家查看，我把内容贴过来
> 看fastjson源码，SerializeWriter
>```java
public void writeEnum( Enum < ?>value, char c )
{
	if ( value == null )
	{
		writeNull(); 　
		write( ',' ); 　
		return; 　
	}

	
	if ( isEnabled( SerializerFeature.WriteEnumUsingToString ) )
	{
		if ( isEnabled( SerializerFeature.UseSingleQuotes ) )
		{
			write( '\'' ); 　
			write( value.name() ); 　
			write( '\'' ); 　
			write( c );
		} else {
			write( '\"' ); 　
			write( value.name() ); 　
			write( '\"' ); 　
			write( c ); 　
		} 　
		return; 　
	}

	writeIntAndChar( value.ordinal(), c ); 　
}
```
<!-- more -->
> 可以看出SerializeWriter在初始化的时候，features不要设置SerializerFeature.WriteEnumUsingToString
> 因为JSON.DEFAULT_PARSER_FEATURE是enable了SerializerFeature.WriteEnumUsingToString，也就是说是读枚举的value值而不是int值
>```java
public static int DEFAULT_GENERATE_FEATURE;　　
static {　　
	int features = 0;　　
	features |= com.alibaba.fastjson.serializer.SerializerFeature.QuoteFieldNames.getMask();　　
	features |= com.alibaba.fastjson.serializer.SerializerFeature.SkipTransientField.getMask();　　
	features |= com.alibaba.fastjson.serializer.SerializerFeature.WriteEnumUsingToString.getMask();　　
	features |= com.alibaba.fastjson.serializer.SerializerFeature.SortField.getMask();　　 
	// features |= com.alibaba.fastjson.serializer.SerializerFeature.WriteSlashAsSpecial.getMask();
	DEFAULT_GENERATE_FEATURE = features;　　
}
```
> 所以，解决你这个问题的方法就是之前调用
> ```java
JSONSerializer.config(SerializerFeature.WriteEnumUsingToString,false);
```

但是`JSONSerializer.config`不是一个**静态方法**，不能直接调用    
而且如果直接调用`JSON.toJSON`把实体类转为`json`，这里还有另外一句代码    
```java
if (clazz.isEnum()) {  
    return ((Enum<?>) javaObject).name();  
}
```    
如果是枚举类型，不管你怎么改配置都不会给你转成索引值的情况，所以我们这里就先想把实体转成`jsonString`，再把`jsonString`转成`JSONObject`。
再继续看`fastjson`的源码
在`JOSN.toJSONString`中

```java
public static final String toJSONString(Object object, SerializerFeature... features) {  
    SerializeWriter out = new SerializeWriter();  

    try {  
        JSONSerializer serializer = new JSONSerializer(out);  
        for (com.alibaba.fastjson.serializer.SerializerFeature feature : features) {  
            serializer.config(feature, true);  
        }  

        serializer.write(object);  

        return out.toString();  
    } finally {  
        out.close();  
    }  
} 
```
他这里也是用的`serializer.config`来配置的，干脆我们自己写个工具方法吧，同时把`WriteEnumUsingToString`禁用掉
```java
private static final SerializerFeature[] CONFIG = new SerializerFeature[]{  
        SerializerFeature.WriteNullBooleanAsFalse,//boolean为null时输出false  
        SerializerFeature.WriteMapNullValue, //输出空置的字段  
        SerializerFeature.WriteNonStringKeyAsString,//如果key不为String 则转换为String 比如Map的key为Integer  
        SerializerFeature.WriteNullListAsEmpty,//list为null时输出[]  
        SerializerFeature.WriteNullNumberAsZero,//number为null时输出0  
        SerializerFeature.WriteNullStringAsEmpty//String为null时输出""  
};  

public static JSONObject toJSON(Object javaObject) {  

    SerializeWriter out = new SerializeWriter();  
    String jsonStr;  
    try {  
        JSONSerializer serializer = new JSONSerializer(out);  

        for (com.alibaba.fastjson.serializer.SerializerFeature feature : CONFIG) {  
            serializer.config(feature, true);  
        }  
        serializer.config(SerializerFeature.WriteEnumUsingToString, false);  
        serializer.write(javaObject);  

        jsonStr =  out.toString();  
    } finally {  
        out.close();  
    }  
    JSONObject jsonObject = JSON.parseObject(jsonStr);  
    return jsonObject;  
}  
```
这样调用我们的工具类方法转换出来的结果，就是我们想要的数字了。
