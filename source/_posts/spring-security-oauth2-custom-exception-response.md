---
title: Spring Cloud Security OAuth2 定制错误消息
tags: [spring security]
date: 2019-01-09 20:32:49
categories: spring
---

# 背景

最近在搭建一个Spring Cloud的项目，在搭建途中，遇到了一些问题，这里记录一下。
在搭建AuthorizationServer的时候，就遇到了问题，我的授权模式是用的password模式，然后是集成了JWT生成access_token。

基本上我是参照这个项目搭建的，https://gitee.com/log4j/pig 。不过因为只是参考，所以我还做了一些改动，而且我们Spring Cloud的版本也不一样，我是F版的。

<!--more-->

## 问题1 /oauth/token 401问题

在AuthorizationServer搭建完成以后，启动访问/oauth/token接口获取access_token。传入用户名和密码，然后一直得到一个401错误，日志也没有，我最开始还以为是Spring Security把这个接口给拦截了，后来DEBUG了一下源码，发现在BasicAuthenticationFilter.doFilterInternal()里有这么一句判断。



```java
String header = request.getHeader("Authorization");

if (header == null || !header.toLowerCase().startsWith("basic ")) {
	chain.doFilter(request, response);
	return;
}
```

就是如果你的header里面没有Authorization(BasicAuthenticationFilter.doFilterInternal)，或者Authorization不是以basic 开头的，直接就返回401了。虽然我忘记了传这个参数，但是日志里没有任何提示，这个错误真是让我好一顿找才给解决。

这里面是`client_id:client_secret`的base64编码。到这还没完，因为Spring Cloud F版会有那个PasswordEncoder，所以他在校验secret的时候会和服务器配置的时候会进行加密，如果存储的密钥不是相应的加密方式，他也会报错，这个错误在网上都搜得到了。

[Spring Security 4.x -> 5.x 踩坑记录](http://springcloud.cn/view/13)


DaoAuthenticationProvider.additionalAuthenticationChecks()方法里，就是检查密码的地方。



## 问题2 Unsupported grant type: password


接着我又开始遇到这个错误，搜了一下说是AuthenticationManager无法注入。

在AuthorizationServerEndpointsConfigurer.getDefaultTokenGranters里面，如果AuthenticationManager类的实例的话，那么就不支持password的授权模式，也就是ResourceOwnerPasswordTokenGranter。

```java
private List<TokenGranter> getDefaultTokenGranters() {
	ClientDetailsService clientDetails = clientDetailsService();
	AuthorizationServerTokenServices tokenServices = tokenServices();
	AuthorizationCodeServices authorizationCodeServices = authorizationCodeServices();
	OAuth2RequestFactory requestFactory = requestFactory();

	List<TokenGranter> tokenGranters = new ArrayList<TokenGranter>();
	tokenGranters.add(new AuthorizationCodeTokenGranter(tokenServices, authorizationCodeServices, clientDetails,
			requestFactory));
	tokenGranters.add(new RefreshTokenGranter(tokenServices, clientDetails, requestFactory));
	ImplicitTokenGranter implicit = new ImplicitTokenGranter(tokenServices, clientDetails, requestFactory);
	tokenGranters.add(implicit);
	tokenGranters.add(new ClientCredentialsTokenGranter(tokenServices, clientDetails, requestFactory));
	if (authenticationManager != null) {
		tokenGranters.add(new ResourceOwnerPasswordTokenGranter(authenticationManager, tokenServices,
				clientDetails, requestFactory));
	}
	return tokenGranters;
}
```

[Spring Security 4.x -> 5.x 踩坑记录](http://springcloud.cn/view/13)的也提到了这个问题，不过我这里遇到了更奇怪的现象，在WebSecurityConfigurerAdapter加上下面的配置后，并没有解决我的问题。

```java
@Bean(name = BeanIds.AUTHENTICATION_MANAGER)
@Override
public AuthenticationManager authenticationManagerBean() throws Exception {
    return super.authenticationManagerBean();
}

```

结果我发现在我的项目中，AuthorizationServerConfig竟然比WebSecurityConfigurer先加载，所以在`public void configure(AuthorizationServerEndpointsConfigurer endpoints)`注入并设置endpoints.authenticationManager(authenticationManager)的时候，放的是一个null进去。

我还觉得蛮奇怪的，下面的代码也会注入一个null

```java
@Autowired
private AuthenticationManager authenticationManager;
```

然后我把这个参数改到构造方法里面去启动，结果就告诉我循环依赖，后来想了想，可能是因为Spring在处理循环依赖的时候，把一些注入类自动处理成null了。

在我解决了循环依赖以后，我就能登录成功了。

## 问题3 如何定制BadCredentialsException,UserNameNotFound的异常消息

接下来就是输入错误密码的时候得到的错误了，如果用户名或者密码错误了，Spring Security会返回一个

```json
{
	"error": "invalid_grant",
	"error_ description": "坏的凭证"
}
```

这个错误信息太不友好了，我们一般给客户端返回的消息都是统一标准的格式，比如：

```json
{
	"code":"401",
	"msg":"用户名或密码错误"
}
```

这样另类的消息格式是绝对不允许的。所以我就想定制化这个消息格式，是相信Spring Security肯定提供了相应的机制来供我们实现这个消息的定制，我先是在网上搜了很久，都没有找到解决方案，只是找到了一些哥们跟我有同样的问题，但是却没有人给出解决方案。

比如这个stackoverflow.com上的这个[哥们](https://stackoverflow.com/questions/38109842/how-to-change-the-badcredentialsexception-usernamenotfound-exception-messages-in)。

没办法了，找不到方案就自己想办法吧，我就从抛出异常的地方开始一行一行的debug，接着发现这个异常被TokenEndpoint类里的一个ExceptionHandler给拦截然后输出的。

```java
@ExceptionHandler(OAuth2Exception.class)
public ResponseEntity<OAuth2Exception> handleException(OAuth2Exception e) throws Exception {
	if (logger.isWarnEnabled()) {
		logger.warn("Handling error: " + e.getClass().getSimpleName() + ", " + e.getMessage());
	}
	return getExceptionTranslator().translate(e);
}
```


那么这个getExceptionTranslator到底是个什么东西，最后翻了一下到底是在哪里设置的这个属性，最终发现是AuthorizationServerEndpointsConfigurer的一个字段，是不是很眼熟？


和设置AuthenticationManager的是同一个类，所以定制一个

```java
@Component
public class CustomWebResponseExceptionTranslator implements WebResponseExceptionTranslator<OAuth2Exception> {

    @Override
    public ResponseEntity translate(Exception e) throws Exception {

        return new ResponseEntity<>(RestResp.error(CommonErrorCode.AUTHORIZED_ERROR), HttpStatus.OK);
    }
}
```

然后在AuthorizationServerConfig里加上配置，

```java
@Override
public void configure(AuthorizationServerEndpointsConfigurer endpoints) {
    
    endpoints
            //......其他配置
            .exceptionTranslator(customWebResponseExceptionTranslator)
            .authenticationManager(authenticationManager);
}

```


最后得到了我们想要的输出结果：


```json
{
    "code": "401",
    "msg": "用户名或密码错误"
}
```

## 问题4 invalid_token 错误消息定制

如果传入的token是错误的，那么会得到这样格式的一个错误消息：

```json
{
  "error": "invalid_token",
  "error_description": "Cannot convert access token to JSON"
}
```

实际上有可能是这个token在redis里没有等好几种错误

DefaultTokenServices.loadAuthentication(String accessTokenValue)

```java
if (accessToken == null) {
	throw new InvalidTokenException("Invalid access token: " + accessTokenValue);
}
else if (accessToken.isExpired()) {
	tokenStore.removeAccessToken(accessToken);
	throw new InvalidTokenException("Access token expired: " + accessTokenValue);
}

OAuth2Authentication result = tokenStore.readAuthentication(accessToken);
if (result == null) {
	// in case of race condition
	throw new InvalidTokenException("Invalid access token: " + accessTokenValue);
}
```

想要定制化这个错误消息，需要制定一个AuthExceptionEntryPoint.

```java
@Log4j2
@Component
public class AuthExceptionEntryPoint implements AuthenticationEntryPoint {

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException, ServletException {
        log.info("Token失效，禁止访问 {}", request.getRequestURI());
        response.setCharacterEncoding(StandardCharsets.UTF_8.displayName());
        response.setContentType(MediaType.APPLICATION_JSON_UTF8_VALUE);
        RestResp result = RestResp.error(CommonErrorCode.UNAUTHORIZED, "Token错误");
        response.setStatus(HttpStatus.SC_OK);
        PrintWriter printWriter = response.getWriter();
        printWriter.append(objectMapper.writeValueAsString(result));
    }
}
```

然后ResourceServerConfiguration里增加配置


```java
@Override
    public void configure(ResourceServerSecurityConfigurer resources) {
    resources.expressionHandler(expressionHandler);
    resources.authenticationEntryPoint(authExceptionEntryPoint);
    resources.accessDeniedHandler(iuMiaoAccessDeniedHandler);
    resources.tokenStore(redisTokenStore());
}
```

就能得到自定义的错误。

```json
{
    "code": "10000401",
    "msg": "未授权: Token错误"
}
```
