title: spring cloud OAuth2RestTemplate loadBalanced
date: 2016-04-21 16:52:45
tags: [spring-cloud,微服务]
categories: spring boot/cloud
---


在项目中访问另一个微服务的时候我们可以这样用RestTemplate来调用其他服务:


```
@Autowired
private RestTemplate restTemplate;
RestResponse response = restTemplate.postForObject("http://user-service/user/getUser", para, User.class);

```

在spring cloud环境下，这个注入的restTemplate是具备了客户端负载均衡功能的，也会用到eureka服务发现功能，`user-service`就是服务的名称。		
我的项目启用了oauth2认证。spring cloud也提供了一个`OAuth2RestTemplate`来很方便的调用其他服务。但是在我测试的时候一直报错`UnknownHost`，我猜测他肯定是没有用到loadBalanced和eureka的服务发现功能。我翻遍了官方文档也没有找到相关的说明。


Google搜了大半天后，看了作者在git也讨论过这个类loadBalanced功能之类的，还翻到一个没有什么用 @LoadBalanced[注解](https://github.com/spring-cloud/spring-cloud-security/issues/51)，翻了半天源码后终于在`OAuth2LoadBalancerClientAutoConfiguration`这样一个类中发现了一点蛛丝马迹。

<!--more-->

```

@Configuration
@ConditionalOnClass({ LoadBalancerInterceptor.class, OAuth2RestTemplate.class })
@ConditionalOnBean(LoadBalancerInterceptor.class)
@AutoConfigureAfter(OAuth2AutoConfiguration.class)
public class OAuth2LoadBalancerClientAutoConfiguration {

	@Configuration
	@ConditionalOnProperty(value = "security.oauth2.resource.loadBalanced", matchIfMissing = false)
	protected static class UserInfoLoadBalancerConfig {
		@Bean
		public UserInfoRestTemplateCustomizer loadBalancedUserInfoRestTemplateCustomizer(
				final LoadBalancerInterceptor loadBalancerInterceptor) {
			return new UserInfoRestTemplateCustomizer() {
				@Override
				public void customize(OAuth2RestTemplate restTemplate) {
					List<ClientHttpRequestInterceptor> interceptors = new ArrayList<>(
							restTemplate.getInterceptors());
					interceptors.add(loadBalancerInterceptor);
					restTemplate.setInterceptors(interceptors);
				}
			};
		}
	}

}

```


可以看到，只要配置了`security.oauth2.resource.loadBalanced`为`true`，我们的`OAuth2RestTemplate`就具有`LoadBalancer`功能了。我们先在`application.yml`中加上这样的配置。

```
security:
  oauth2:
    resource:
      loadBalanced: true
```

然后注入这个类：


```
@Autowired
private OAuth2RestTemplate restTemplate;
```

结果还是不行，一样的错误，难道这个类没有用吗，于是我在我的代码和`customize`方法初始化执行的时候打了2个断点，发现注入对象的根本就不是这个地方初始化使用的那个对象。又倒腾了好一会才找到，必须得注入一个bean名字为`userInfoRestTemplate`的对象。


```
@Autowired
@Qualifier("userInfoRestTemplate")
private OAuth2RestTemplate restTemplate;
```

终于可以正常使用了，不知道为什么这个配置并没有在文档中提到，估计以后会补上这个文档的。现在spring cloud的文档有些地方跟最新的代码也表现得不太一致，特别是spring security这一块，做的时候一定要多多注意。
