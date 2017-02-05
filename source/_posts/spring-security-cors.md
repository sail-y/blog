---
title: Spring Security配置cors跨域访问
date: 2016-12-29 13:54:14
tags: [spring,java]
categories: spring
---

http://docs.spring.io/spring/docs/current/spring-framework-reference/html/cors.html

文档看似很清晰的描述了如何在Spring 4.2之后启用cors跨域访问，网上搜索介绍这样的帖子也不少。也提到了说什么如果用了Spring Security的话要采用filter的方式来配置。下面这段话就是官方文档

>In order to support CORS with filter-based security frameworks like Spring Security, or with other libraries that do not support natively CORS, Spring Framework also provides a CorsFilter. Instead of using @CrossOrigin or WebMvcConfigurer#addCorsMappings(CorsRegistry), you need to register a custom filter defined like bellow:
<!--more-->
```java
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

public class MyCorsFilter extends CorsFilter {

	public MyCorsFilter() {
		super(configurationSource());
	}

	private static UrlBasedCorsConfigurationSource configurationSource() {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowCredentials(true);
		config.addAllowedOrigin("http://domain1.com");
		config.addAllowedHeader("*");
		config.addAllowedMethod("*");
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}
}
```

在经过测试之后，实在是无论采用哪一种方式都不行，实在是太费解了，debug了半天跨域的时候GET方法根本连DispatchServlet都不进去，POST方法倒是可以跨域，发现POST请求是根据header的origin来判断是否跨域。

还是想着从Spring Security这边来入手，结果就发现HttpSecurity类提供了这么一个方法。

```java
/**
 * Adds a {@link CorsFilter} to be used. If a bean by the name of corsFilter is
 * provided, that {@link CorsFilter} is used. Else if corsConfigurationSource is
 * defined, then that {@link CorsConfiguration} is used. Otherwise, if Spring MVC is
 * on the classpath a {@link HandlerMappingIntrospector} is used.
 *
 * @return the {@link CorsConfigurer} for customizations
 * @throws Exception
 */
public CorsConfigurer<HttpSecurity> cors() throws Exception {
	return getOrApply(new CorsConfigurer<HttpSecurity>());
}
```

我抱着试一试的心态，加上了这句话代码。

```java
@Override
protected void configure(HttpSecurity http) throws Exception {
    http.headers()
            .frameOptions()
            .sameOrigin()
            .and()
            // disable CSRF, http basic, form login
            .csrf().disable()
            // 跨域支持
            .cors().and()

            .httpBasic().disable() //
            .formLogin().disable()

            // ReST is stateless, no sessions
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS) //

            .and()

            // return 403 when not authenticated
            .exceptionHandling().authenticationEntryPoint(new NoAuthenticationEntryPoint());

    // Let child classes set up authorization paths
    setupAuthorization(http);

    http.addFilterBefore(jsonWebTokenFilter, UsernamePasswordAuthenticationFilter.class);
}
```

就是`.cors().and()`这句了，然后还是采用`addCorsMappings`方法来配置。

```java
@Configuration
public class WebConfig extends WebMvcConfigurerAdapter {

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/api/**")
			.allowedOrigins("http://domain2.com")
			.allowedMethods("PUT", "DELETE")
			.allowedHeaders("header1", "header2", "header3")
			.exposedHeaders("header1", "header2")
			.allowCredentials(false).maxAge(3600);
	}
}
```

结果当然是成功了，Spring的文档也老是跟不上节奏，还是需要自己多探索和思考。希望能帮到遇到这个问题的朋友们。