title: Spring-cloud OAuth2.0配置
date: 2016-03-31 16:13:49
tags: [spring-cloud,微服务]
categories: spring boot/cloud
---

在spring cloud项目环境中配置oauth2.0认证。	
![](http://callistaenterprise.se/assets/blogg/build-microservices-part-3/system-landscape.png)	


http://callistaenterprise.se/blogg/teknik/2015/04/27/building-microservices-part-3-secure-APIs-with-OAuth/
可以先看看这篇文章。

我花了不少时间才把这个调通，spring cloud的版本和文档也存在不一致的地方。		
以下所有的操作都基于Brixton.RC1搭建，须保持所有相关项目都引用此parent。否则会出现各种莫名其妙的错误。

```xml
<parent>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-parent</artifactId>
    <version>Brixton.RC1</version>
    <relativePath/>
</parent>
```
<!--more-->
https://spring.io/blog/2015/11/30/migrating-oauth2-apps-from-spring-boot-1-2-to-1-3

这篇文章显示了不同版本之间的区别。		
目前官网最新提供的`Angel SR6`和`Brixton RC1`，它们引用的Spring Boot版本不一样。这2个版本在Spring Security这一块改动比较大。			
Spring Boot1.3 移除了官方文档中提到的`@EnableOAuth2Resource`注解。
http://cloud.spring.io/spring-cloud-static/spring-cloud.html#_token_relay		
反正感觉官网提供这个文档写得不太对。			

下面展示我最终正常运行的一个配置。		
`Zuul Proxy`和`AuthServer`，我把它们放在了同一个应用里。
在pom中加入oauth2的依赖。


```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-security</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-oauth2</artifactId>
</dependency>
```
然后是`Application`


```java
@SpringBootApplication
@EnableZuulProxy
//必须添加@EnableResourceServer，Zuul才会进行Token Relay。
//(查看各种源码后才发现。文档描述的@EnableOAuth2Sso根本没有什么卵用。只有
//@EnableResourceServer才会加载OAuth2AuthenticationProcessingFilter)
@EnableResourceServer
@EnableAuthorizationServer
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }


    //为什么不用自动配置。因为/oauth/check_token默认是denyAll.
    //必须手动设置oauthServer.checkTokenAccess("isAuthenticated()");
    //才访问能验证Access Token。
    @Configuration
    protected static class OAuthSecurityConfig extends AuthorizationServerConfigurerAdapter {

        @Autowired
        private AuthenticationManager authenticationManager;

        @Override
        public void configure(AuthorizationServerEndpointsConfigurer endpoints) throws Exception {
            endpoints.authenticationManager(authenticationManager);
        }

        @Override
        public void configure(AuthorizationServerSecurityConfigurer oauthServer) throws Exception {
            oauthServer.checkTokenAccess("isAuthenticated()");
        }

        @Override
        public void configure(ClientDetailsServiceConfigurer clients) throws Exception {
            clients.inMemory()
                    .withClient("clientId")
                    .secret("secretId")
                    .authorizedGrantTypes("authorization_code", "client_credentials")
                    .scopes("app");
        }
    }

    @Configuration
    protected static class RestSecurityConfig extends WebSecurityConfigurerAdapter {
        @Override
        protected void configure(HttpSecurity http) throws Exception {

            http.anonymous().disable()
                    .sessionManagement()
                    .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                    .and()
                    .exceptionHandling()
//                    .accessDeniedHandler(accessDeniedHandler()) // handle access denied in general (for example comming from @PreAuthorization
//                    .authenticationEntryPoint(entryPointBean()) // handle authentication exceptions for unauthorized calls.
                    .and()
                    .authorizeRequests()
//                    .antMatchers("/hystrix.stream/**", "/info", "/error").permitAll()
                    .anyRequest().authenticated().and().csrf().disable();
        }
		  
//        @Bean
//        @Autowired
//        AccessDeniedHandler accessDeniedHandler() {
//            return new AccessDeniedExceptionHandler();
//        }
//
//        @Bean
//        @Autowired
//        AuthenticationEntryPoint entryPointBean() {
//            return new UnauthorizedEntryPoint();
//        }
		// 不需要权限控制的路径
        @Override
        public void configure(WebSecurity web) throws Exception {
            web.ignoring().antMatchers("/hystrix.stream/**", "/info", "/error");
        }
    }


}



```

然后在API里同样加入依赖

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-security</artifactId>
</dependency>


<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-oauth2</artifactId>
</dependency>
```

在application.yml中加入以下配置:

```yaml
security:
  oauth2:
    resource:
      token-info-uri: http://localhost:10000/oauth/check_token
    client:
          client-id: clientId
          client-secret: secretId
          user-authorization-uri: http://localhost:10000/oauth/authorize
          access-token-uri: http://localhost:10000/oauth/token
          grant-type: client_credentials
```

`Application.java`中加上`@EnableResourceServer`

```java
@EnableResourceServer
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }


    @Configuration
    protected static class RestSecurity extends WebSecurityConfigurerAdapter {
    	//不需要权限控制的URL
        @Override
        public void configure(WebSecurity web) throws Exception {
            web.ignoring().antMatchers("/info", "/error");
        }
    }
}
```

配置完了，启动应用。			
获取access_token。

```bash

curl -s clientId:secretId@localhost:10000/oauth/token  \
 -d grant_type=client_credentials \
 -d scope=app
 
 {
  "access_token": "8265eee1-1309-4481-a734-24a2a4f19299",
  "token_type": "bearer",
  "expires_in": 43189,
  "scope": "app"
}
```


访问API的时候在Http Header中带上，Authorization: Bearer$access_token。即可...

 
