title: fastjson序列化枚举属性
date: 2015-01-30 23:19:19
tags: [fastjson,java,枚举]
categories: Java
---
# fastjson序列化枚举属性 #

我的实体类里面有一个属性是枚举类型的，但是我在转换的时候我不希望取它的name，而是它的索引值0,1,2,3,搜索一番后发现这个回答

> [fastjson enum 枚举 反序列化](http://zhidao.baidu.com/link?url=5_N_6oaQaN6s-JLAZzwy-Fdbt93qC7VmzIfLvifZk463bKCwh7xBweUgBlJLczgHF9y7kjqNktsJmEVUuPlNkCw4sjfLaXq9ITfz9ieQH5u)
> 为了方便大家查看，我把内容贴过来
> 看fastjson源码，SerializeWriter
> {% codeblock lang:java %}
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
{% endcodeblock %}
<!-- more -->
> 可以看出SerializeWriter在初始化的时候，features不要设置SerializerFeature.WriteEnumUsingToString
> 因为JSON.DEFAULT_PARSER_FEATURE是enable了SerializerFeature.WriteEnumUsingToString，也就是说是读枚举的value值而不是int值
> {% codeblock lang:java %}
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
{% endcodeblock %}
> 所以，解决你这个问题的方法就是之前调用
> {% codeblock  lang:java %}
JSONSerializer.config(SerializerFeature.WriteEnumUsingToString,false);
{% endcodeblock %}