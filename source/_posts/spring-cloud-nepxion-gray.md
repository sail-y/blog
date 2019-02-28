---
title: Spring Cloud基于用户和ip的灰度发布方案
tags: [spring-cloud,微服务,灰度发布]
date: 2019-02-28 11:32:01
categories: spring boot/cloud
---

# 基于用户和ip的灰度发布方案


为了能够更好的解决系统新版本上线无法验证的风险，我们通常需要在升级的时候进行灰度发布，下面调研了一个上线灰度发布的流程。

下面先看一张图，然后再用一段文字描述整个发布的逻辑。

![](/img/spring-cloud/灰度流量V2.jpg)

<!--more-->

在正常情况下，用户的流量是可以随意打到A，A1，A2服务上的，A到B的流量，也是可以随意打的。
当灰度发布的开关打开以后，如图上所示，例如A3,B2,C4的链路为灰度路由的配置。此时将切断正常用户对A3,B2,C4的服务实例的访问，并且正常流量到A1以后，也不会再打到B2上。
当指定的测试账号访问系统的时候，所有的测试流量都会打到A3,B2,C4的链路服务实例上，第一步流量到A3以后，也不会将A调用B的流量打到B1的服务实例上。
当测试将这一组验证完毕后，即可将对配置进行修改，进而发布下一组。
当所有的实例都发布完成后，再将灰度发布开关关闭，此时，发布完成。
所有的这些操作，都可以在Apollo配置中心一键完成。

链路配置格式：

```json
{
    "sevice-demo-a": "172.16.101.90:5000",
    "sevice-demo-b": "172.16.101.90:5020"
}
```



# 实现原理

本方案基于Nepxion Discovery开发

>Nepxion Discovery is an enhancement for Spring Cloud Discovery on Eureka + Consul + Zookeeper + Nacos with Nacos + Apollo config for gray release, router and isolation 灰度发布、服务隔离、服务路由、服务权重、黑/白名单过滤 http://www.nepxion.com

要了解灰度发布的原理，首先需要知道SpringCloud是基于Ribbon实现负载均衡算法的，以及是如何从注册中心拉取的服务列表。

灰度路由除了可以根据请求头来路由请求，也可以跟服务实例本身的版本号来决定路由。下面给出一个逻辑图，以及两个个源码解析的UML图。

![版本和IP路由逻辑](/img/spring-cloud/版本和IP路由逻辑.jpg)

![版本号过滤服务列表逻辑](/img/spring-cloud/版本号过滤服务列表逻辑.jpg)

![根据请求头执行负载均衡规则（权重逻辑）](/img/spring-cloud/根据请求头执行负载均衡规则（权重逻辑）.jpg)




nepxion本来就提供了良好的服务过滤扩展，所以我的代码就是核心的一个过滤策略。

```java
/**
 * 本策略实现了当灰度开关开启，对服务实例的ip进行过滤
 *
 * @author yangfan
 * @date 2019/01/02
 */
@Log4j2
public class GrayIpDiscoveryEnabledStrategy implements DiscoveryEnabledStrategy {

    private static final String IS_GRAY_USER = "isGrayUser";
    private static final String SERVICE_IP = "serviceIp";
    private static final String GRAY_SWITCH = "graySwitch";
    @Autowired
    private ServiceStrategyContextHolder serviceStrategyContextHolder;

    private Map<String, String> serviceIpMap;

    private boolean graySwitch;

    @Value("${apollo.plugin.namespace}")
    private String namespace;


    @Autowired
    private ObjectMapper objectMapper;

    @PostConstruct
    public void init() {
        Config config = ConfigService.getConfig(namespace);
        serviceIpMap = toMap(config.getProperty(SERVICE_IP, "{}"));
        graySwitch = config.getBooleanProperty(SWITCH, Boolean.FALSE);

        config.addChangeListener(changeEvent -> {

            // ip配置发生变化
            if (changeEvent.isChanged(SERVICE_IP)) {
                final String newValue = changeEvent.getChange(SERVICE_IP).getNewValue();
                final String oldValue = changeEvent.getChange(SERVICE_IP).getOldValue();
                log.info("service ip map changed, oldValue is {}, newValue is {}", () -> oldValue, () -> newValue);
                serviceIpMap = toMap(newValue);
            }

            // 开关发生变化
            if (changeEvent.isChanged(GRAY_SWITCH)) {
                final String newValue = changeEvent.getChange(GRAY_SWITCH).getNewValue();
                final String oldValue = changeEvent.getChange(GRAY_SWITCH).getOldValue();
                log.info("graySwitch changed, oldValue is {}, newValue is {}", () -> oldValue, () -> newValue);
                graySwitch = Boolean.valueOf(changeEvent.getChange(GRAY_SWITCH).getNewValue());
            }


        }, Sets.newHashSet(SERVICE_IP, GRAY_SWITCH));
    }


    @Override
    public boolean apply(Server server, Map<String, String> metadata) {

        // ip过滤
        boolean enabled = applyIpFilter(server, metadata);

        if (!enabled) {
            return false;
        }

        return true;
    }

    /**
     * 当灰度开关打开后，正在灰度的region不能被正常流量访问到
     *
     * @param server
     * @param metadata
     * @return
     */
    private boolean applyIpFilter(Server server, Map<String, String> metadata) {


        if (!graySwitch) {
            return true;
        }

        String appName = server.getMetaInfo().getAppName();
        String ip = server.getHostPort();

        // ip匹配，灰度请求，灰度实例可访问
        final String ipHost = serviceIpMap.get(appName);
        if (ipHost != null) {
            final boolean ipMatch = ip.equals(ipHost);

            ServletRequestAttributes restAttributes = serviceStrategyContextHolder.getRestAttributes();

            // 非http请求
            if (restAttributes == null) {
                // ip和灰度实例匹配，不予访问
                log.info("The ServletRequestAttributes object is null, ignore to do gray ip filter for service={}", appName);
                return !ipMatch;
            }

            final String isGrayUser = restAttributes.getRequest().getHeader(IS_GRAY_USER);

            // 无法识别是否是灰度用户
            if (StringUtils.isEmpty(isGrayUser)) {
                // ip和灰度实例匹配，不予访问
                log.info("The isGrayUser header is null, ignore to do gray ip filter for service={}", appName);
                return !ipMatch;
            }

            // 灰度用户
            if (Boolean.valueOf(isGrayUser)) {
                // ip和灰度实例匹配，通过访问
                if (ipMatch) {
                    log.info("found gray user request, service {} route to ip {}", appName, ipHost);
                }
                return ipMatch;
            } else {// 非灰度用户
                // ip和灰度实例匹配，不予访问
                return !ipMatch;
            }

        }

        return true;
    }


    @SneakyThrows
    public Map<String, String> toMap(String str) {
        JavaType javaType = getParametricTypeJavaType(String.class, String.class);
        return objectMapper.readValue(str, javaType);
    }

    private JavaType getParametricTypeJavaType(Class... clazz) {
        return objectMapper.getTypeFactory().constructParametricType(HashMap.class, clazz);
    }
}
```

nepxion discovery框架的作者是个很用心的作者，我在开发的时候也遇到了一些问题，作者都耐心的和我一起分析，一一帮我解决了，推荐大家去Star，去学习。

https://github.com/Nepxion/Discovery