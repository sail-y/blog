title: "Spring cloud @EnableOAuth2Client"
date: 2016-07-15 13:55:11
tags: [spring-cloud,微服务]
categories: spring
---

Spring Cloud oauth2 开启客户端功能，并启用LoadBalanced

如果不添加以下配置，只添加`@EnableOAuth2Client`注解，spring cloud默认是在web环境下使用的`AuthorizationCodeResourceDetails`。

具体代码在`OAuth2RestOperationsConfiguration`类中。

```

@Configuration
@ConditionalOnBean(OAuth2ClientConfiguration.class)
@ConditionalOnWebApplication
protected static class SessionScopedConfiguration {

	@Bean
	@ConfigurationProperties("security.oauth2.client")
	@Primary
	public AuthorizationCodeResourceDetails oauth2RemoteResource() {
		AuthorizationCodeResourceDetails details = new AuthorizationCodeResourceDetails();
		return details;
	}

	@Bean
	public FilterRegistrationBean oauth2ClientFilterRegistration(
			OAuth2ClientContextFilter filter, SecurityProperties security) {
		FilterRegistrationBean registration = new FilterRegistrationBean();
		registration.setFilter(filter);
		registration.setOrder(security.getFilterOrder() - 10);
		return registration;
	}

	@Configuration
	protected static class ClientContextConfiguration {

		@Resource
		@Qualifier("accessTokenRequest")
		protected AccessTokenRequest accessTokenRequest;

		@Bean
		@Scope(value = "session", proxyMode = ScopedProxyMode.INTERFACES)
		public DefaultOAuth2ClientContext oauth2ClientContext() {
			return new DefaultOAuth2ClientContext(this.accessTokenRequest);
		}

	}

}

```
<!--more-->

这个东西我也没找到在哪里可以配置，就自己在Application手动加入以下配置来使用吧。


```
@Bean
@Primary
@LoadBalanced
public OAuth2RestTemplate xmRestTemplate(ClientCredentialsResourceDetails xmOauth2RemoteResource) {
    return new OAuth2RestTemplate(xmOauth2RemoteResource);
}

@Bean
@ConfigurationProperties("security.oauth2.client")
public ClientCredentialsResourceDetails xmOauth2RemoteResource() {
    return new ClientCredentialsResourceDetails();
}
```