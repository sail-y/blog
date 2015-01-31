title: "Spring mvc @ResponseBody 返回枚举类型"
date: 2015-01-31 11:36:30
tags: [fastjson,spring mvc,java]
categories: java
---

我们在用`@ResponseBody`返回实体对象可以用`spring mvc`自动帮我们转化成json串  
但是当实体中包含了枚举类型的属性的时候怎么办，我这里使用的是`fastjson`，他默认是转换成了字符串。    
根据我上一篇博文的解决方案，我们这里自定义一个`FastJsonHttpMessageConverter`
<!--more-->
```java
public class FastJsonHttpMessageConverter extends AbstractHttpMessageConverter<Object> {  
  
    public final static Charset UTF8     = Charset.forName("UTF-8");  
  
    private Charset             charset  = UTF8;  
  
    private SerializerFeature[] features = new SerializerFeature[0];  
  
    public FastJsonHttpMessageConverter(){  
        super(new MediaType("application", "json", UTF8), new MediaType("application", "*+json", UTF8));  
    }  
  
    @Override  
    protected boolean supports(Class<?> clazz) {  
        return true;  
    }  
  
    public Charset getCharset() {  
        return this.charset;  
    }  
  
    public void setCharset(Charset charset) {  
        this.charset = charset;  
    }  
  
    public SerializerFeature[] getFeatures() {  
        return features;  
    }  
  
    public void setFeatures(SerializerFeature... features) {  
        this.features = features;  
    }  
  
    @Override  
    protected Object readInternal(Class<? extends Object> clazz, HttpInputMessage inputMessage) throws IOException,  
            HttpMessageNotReadableException {  
  
        ByteArrayOutputStream baos = new ByteArrayOutputStream();  
  
        InputStream in = inputMessage.getBody();  
  
        byte[] buf = new byte[1024];  
        for (;;) {  
            int len = in.read(buf);  
            if (len == -1) {  
                break;  
            }  
  
            if (len > 0) {  
                baos.write(buf, 0, len);  
            }  
        }  
  
        byte[] bytes = baos.toByteArray();  
        return JSON.parseObject(bytes, 0, bytes.length, charset.newDecoder(), clazz);  
    }  
  
    @Override  
    protected void writeInternal(Object obj, HttpOutputMessage outputMessage) throws IOException,  
            HttpMessageNotWritableException {  
  
        OutputStream out = outputMessage.getBody();  
        String text = JSONUtil.toJSONString(obj, features);  
        byte[] bytes = text.getBytes(charset);  
        out.write(bytes);  
    }  
  
}  
```
其实我就改了一句代码，如下所示，这样我们就可以返回想要的索引数字了。
```java
String text = JSONUtil.toJSONString(obj, features);  
```
