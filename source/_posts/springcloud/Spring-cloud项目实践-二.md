title: Spring cloud项目实践(二)
date: 2016-03-21 21:44:07
tags: [spring-cloud,微服务]
categories: spring boot/cloud
---

# 配置中心和服务注册中心

我们先把配置中心和服务注册中心跑起来，这个先照着之前的教程做，很简单没什么变动。
就是git仓库需要密码的话加入下面的配置就好。

```
server:
  port: 8888

eureka:
  instance:
    hostname: configserver
  client:
    registerWithEureka: true
    fetchRegistry: true
    serviceUrl:
      defaultZone: http://${config.host:192.168.99.100}:8761/eureka/

spring:
  cloud:
    config:
      server:
        git:
          uri: yourgiturl
          password: ****
          username: ****

```

这里的`${config.host:192.168.99.100}`表示没有读到config.host就用192.168.99.100这个值。
	
```
java -jar cloud-simple-service-1.0.0.jar --config.host=localhost
```

这个用法就很灵活了，后面配合Dockerfile可以根据不同的环境来启动不同的配置。
<!--more-->

# 微服务应用

## Mybatis
http://www.cnblogs.com/skyblog/p/5129603.html		
这篇文章讲了如何配置一个使用myabtis的项目，我们照着他的做就可以了。

## Mongodb
我这里说一下配置mongodb遇到的问题。
首先在**pom.xml**中加入mongodb的依赖。因为我是用的*mongodb3*，spring-boot-starter-data-mongodb依赖的驱动是2.0版本的，需要修改一下，加入3.0驱动的依赖。

```
<!--mongo驱动版本过低-->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.mongodb</groupId>
            <artifactId>mongo-java-driver</artifactId>
        </exclusion>
    </exclusions>
</dependency>

<dependency>
    <groupId>org.mongodb</groupId>
    <artifactId>mongo-java-driver</artifactId>
    <version>3.2.2</version>
</dependency>
```     

不过还是认证会出错，解决方案参考下面的文章。	
[http://zjumty.iteye.com/blog/2198432](http://zjumty.iteye.com/blog/2198432)

照着这个文章做完依然还是有错误，所以我这里还有一些额外的改动，一共自建了3个类。
首先在`Application.java`里新加上`MongoAutoConfiguration.class`，`MongoDataAutoConfiguration.class`

```
@EnableAutoConfiguration(exclude = {DataSourceAutoConfiguration.class, MongoAutoConfiguration.class, MongoDataAutoConfiguration.class})
```
自定义的3个类如下		
`MongoProperties.java`		
```java
@ConfigurationProperties(prefix = "spring.data.mongodb")
public class MongoProperties {

    private static final int DEFAULT_PORT = 27017;

    /**
     * Mongo server host.
     */
    private String host;

    /**
     * Mongo server port.
     */
    private Integer port = null;

    /**
     * Mongo database URI. When set, host and port are ignored.
     */
    private String uri = "mongodb://localhost/test";

    /**
     * Database name.
     */
    private String database;

    /**
     * Authentication database name.
     */
    private String authenticationDatabase;

    /**
     * GridFS database name.
     */
    private String gridFsDatabase;

    /**
     * Login user of the mongo server.
     */
    private String username;

    /**
     * Login password of the mongo server.
     */
    private char[] password;

    public String getHost() {
        return this.host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public String getDatabase() {
        return this.database;
    }

    public void setDatabase(String database) {
        this.database = database;
    }

    public String getAuthenticationDatabase() {
        return this.authenticationDatabase;
    }

    public void setAuthenticationDatabase(String authenticationDatabase) {
        this.authenticationDatabase = authenticationDatabase;
    }

    public String getUsername() {
        return this.username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public char[] getPassword() {
        return this.password;
    }

    public void setPassword(char[] password) {
        this.password = password;
    }

    public void clearPassword() {
        if (this.password == null) {
            return;
        }
        for (int i = 0; i < this.password.length; i++) {
            this.password[i] = 0;
        }
    }

    public String getUri() {
        return this.uri;
    }

    public void setUri(String uri) {
        this.uri = uri;
    }

    public Integer getPort() {
        return this.port;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public String getGridFsDatabase() {
        return this.gridFsDatabase;
    }

    public void setGridFsDatabase(String gridFsDatabase) {
        this.gridFsDatabase = gridFsDatabase;
    }

    public String getMongoClientDatabase() {
        if (this.database != null) {
            return this.database;
        }
        return new MongoClientURI(this.uri).getDatabase();
    }

    public MongoClient createMongoClient(MongoClientOptions options)
            throws UnknownHostException {
        try {
            if (hasCustomAddress() || hasCustomCredentials()) {
                if (options == null) {
                    options = MongoClientOptions.builder().build();
                }
                List<MongoCredential> credentials = null;
                if (hasCustomCredentials()) {
                    String database = this.authenticationDatabase == null
                            ? getMongoClientDatabase() : this.authenticationDatabase;
                    credentials = Arrays.asList(MongoCredential.createScramSha1Credential(
                            this.username, database, this.password));
                }
                String host = this.host == null ? "localhost" : this.host;
                int port = this.port == null ? DEFAULT_PORT : this.port;
                return new MongoClient(Arrays.asList(new ServerAddress(host, port)),
                        credentials, options);
            }
            // The options and credentials are in the URI
            return new MongoClient(new MongoClientURI(this.uri, builder(options)));
        } finally {
            clearPassword();
        }
    }

    private boolean hasCustomAddress() {
        return this.host != null || this.port != null;
    }

    private boolean hasCustomCredentials() {
        return this.username != null && this.password != null;
    }

    private MongoClientOptions.Builder builder(MongoClientOptions options) {
        MongoClientOptions.Builder builder = MongoClientOptions.builder();
        if (options != null) {
            builder.alwaysUseMBeans(options.isAlwaysUseMBeans());
            builder.connectionsPerHost(options.getConnectionsPerHost());
            builder.connectTimeout(options.getConnectTimeout());
            builder.cursorFinalizerEnabled(options.isCursorFinalizerEnabled());
            builder.dbDecoderFactory(options.getDbDecoderFactory());
            builder.dbEncoderFactory(options.getDbEncoderFactory());
            builder.description(options.getDescription());
            builder.maxWaitTime(options.getMaxWaitTime());
            builder.readPreference(options.getReadPreference());
            builder.socketFactory(options.getSocketFactory());
            builder.socketKeepAlive(options.isSocketKeepAlive());
            builder.socketTimeout(options.getSocketTimeout());
            builder.threadsAllowedToBlockForConnectionMultiplier(
                    options.getThreadsAllowedToBlockForConnectionMultiplier());
            builder.writeConcern(options.getWriteConcern());
        }
        return builder;
    }

}

```

这里跟上面的文章是一样的，就是`MongoCredential.createScramSha1Credential`这一句不一样而已。而且`MongoCredential.createScramSha1Credential`这个方法是在3.0的驱动里面才有的。

然后是`MongoConfiguration.java`

```
@Configuration
@EnableConfigurationProperties(MongoProperties.class)
public class MongoConfiguration {
    @Autowired
    private MongoProperties properties;

    @Autowired(required = false)
    private MongoClientOptions options;

    private Mongo mongo;

    @PreDestroy
    public void close() {
        if (this.mongo != null) {
            this.mongo.close();
        }
    }

    @Bean
    public Mongo mongo() throws UnknownHostException {
        this.mongo = this.properties.createMongoClient(this.options);
        return this.mongo;
    }
}
```

这里就引用我们刚才自建的MongoProperties，这样spring在链接mngodb的时候就不会认证出错了。不过我还遇到了了另外一个问题，MongoDataAutoConfiguration引用的MongoProperties也得换成我们自己的，而且升级成3.0的驱动以后，MongoDataAutoConfiguration里面的代码还得修改一下才能正常运行。下面是我修改以后的:

```
@Configuration
@ConditionalOnClass({Mongo.class, MongoTemplate.class})
@EnableConfigurationProperties(MongoProperties.class)
@AutoConfigureAfter(MongoConfiguration.class)
public class MongoDataConfiguration {

    @Autowired
    private MongoProperties properties;

    @Autowired
    private Environment environment;

    @Autowired
    private ResourceLoader resourceLoader;


    @SuppressWarnings("deprecation")
    @Bean
    @ConditionalOnMissingBean
    public MongoDbFactory mongoDbFactory(Mongo mongo) throws Exception {
        String database = this.properties.getMongoClientDatabase();
//        String authDatabase = this.properties.getAuthenticationDatabase();
//        if (StringUtils.hasLength(authDatabase)) {
//            String username = this.properties.getUsername();
//            String password = new String(this.properties.getPassword());
//            UserCredentials credentials = new UserCredentials(username, password);
//            return new SimpleMongoDbFactory(mongo, database, credentials, authDatabase);
//        }
        return new SimpleMongoDbFactory(mongo, database);
    }

    @Bean
    @ConditionalOnMissingBean
    public MongoTemplate mongoTemplate(MongoDbFactory mongoDbFactory,
                                       MongoConverter converter) throws UnknownHostException {
        return new MongoTemplate(mongoDbFactory, converter);
    }

    @Bean
    @ConditionalOnMissingBean(MongoConverter.class)
    public MappingMongoConverter mappingMongoConverter(MongoDbFactory factory,
                                                       MongoMappingContext context, BeanFactory beanFactory) {
        DbRefResolver dbRefResolver = new DefaultDbRefResolver(factory);
        MappingMongoConverter mappingConverter = new MappingMongoConverter(dbRefResolver,
                context);
        try {
            mappingConverter
                    .setCustomConversions(beanFactory.getBean(CustomConversions.class));
        } catch (NoSuchBeanDefinitionException ex) {
            // Ignore
        }
        return mappingConverter;
    }

    @Bean
    @ConditionalOnMissingBean
    public MongoMappingContext mongoMappingContext(BeanFactory beanFactory)
            throws ClassNotFoundException {
        MongoMappingContext context = new MongoMappingContext();
        context.setInitialEntitySet(getInitialEntitySet(beanFactory));
        return context;
    }

    private Set<Class<?>> getInitialEntitySet(BeanFactory beanFactory)
            throws ClassNotFoundException {
        Set<Class<?>> entitySet = new HashSet<Class<?>>();
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(
                false);
        scanner.setEnvironment(this.environment);
        scanner.setResourceLoader(this.resourceLoader);
        scanner.addIncludeFilter(new AnnotationTypeFilter(Document.class));
        scanner.addIncludeFilter(new AnnotationTypeFilter(Persistent.class));
        for (String basePackage : getMappingBasePackages(beanFactory)) {
            if (StringUtils.hasText(basePackage)) {
                for (BeanDefinition candidate : scanner
                        .findCandidateComponents(basePackage)) {
                    entitySet.add(ClassUtils.forName(candidate.getBeanClassName(),
                            MongoDataConfiguration.class.getClassLoader()));
                }
            }
        }
        return entitySet;
    }

    private static Collection<String> getMappingBasePackages(BeanFactory beanFactory) {
        try {
            return AutoConfigurationPackages.get(beanFactory);
        } catch (IllegalStateException ex) {
            // no auto-configuration package registered yet
            return Collections.emptyList();
        }
    }

    @Bean
    @ConditionalOnMissingBean
    public GridFsTemplate gridFsTemplate(MongoDbFactory mongoDbFactory,
                                         MongoTemplate mongoTemplate) {
        return new GridFsTemplate(
                new GridFsMongoDbFactory(mongoDbFactory, this.properties),
                mongoTemplate.getConverter());
    }

    /**
     * {@link MongoDbFactory} decorator to respect
     * {@link MongoProperties#getGridFsDatabase()} if set.
     */
    private static class GridFsMongoDbFactory implements MongoDbFactory {

        private final MongoDbFactory mongoDbFactory;

        private final MongoProperties properties;

        public GridFsMongoDbFactory(MongoDbFactory mongoDbFactory,
                                    MongoProperties properties) {
            Assert.notNull(mongoDbFactory, "MongoDbFactory must not be null");
            Assert.notNull(properties, "Properties must not be null");
            this.mongoDbFactory = mongoDbFactory;
            this.properties = properties;
        }

        @Override
        public DB getDb() throws DataAccessException {
            String gridFsDatabase = this.properties.getGridFsDatabase();
            if (StringUtils.hasText(gridFsDatabase)) {
                return this.mongoDbFactory.getDb(gridFsDatabase);
            }
            return this.mongoDbFactory.getDb();
        }

        @Override
        public DB getDb(String dbName) throws DataAccessException {
            return this.mongoDbFactory.getDb(dbName);
        }

        @Override
        public PersistenceExceptionTranslator getExceptionTranslator() {
            return this.mongoDbFactory.getExceptionTranslator();
        }

    }


    @Bean
    public MongoTemplate syslogMongoTemplate(Mongo mongo) {
        return new MongoTemplate(mongo, "syslog");
    }


}
```


我注释掉了一些代码，然后授权就正常了，估计3.0以后认证方式改了，这些API已经完全被弃用了，使用的话会直接抛异常。

```
UserCredentials credentials = new UserCredentials(username, password);
return new SimpleMongoDbFactory(mongo, database, credentials, authDatabase);
```
点进去看看源码

```
/**
 * Create an instance of SimpleMongoDbFactory given the Mongo instance, database name, and username/password
 * 
 * @param mongo Mongo instance, must not be {@literal null}.
 * @param databaseName Database name, must not be {@literal null} or empty.
 * @param credentials username and password.
 * @param authenticationDatabaseName the database name to use for authentication
 * @deprecated since 1.7. The credentials used should be provided by {@link MongoClient#getCredentialsList()}.
 */
@Deprecated
public SimpleMongoDbFactory(Mongo mongo, String databaseName, UserCredentials credentials,
        String authenticationDatabaseName) {
    this(mongo, databaseName, credentials, false, authenticationDatabaseName);
}
```

下面就是针对不同DB不同MongoTemplate的配置了，以后使用的话只需要在相应的类里注入就可以了。
```
@Bean
public MongoTemplate syslogMongoTemplate(Mongo mongo) {
    return new MongoTemplate(mongo, "syslog");
}
```
		
```
@Autowired
private MongoTemplate syslogMongoTemplate;
```

### Mongodb配置信息

可以看到在`MongoProperties`中有一个注解是`@ConfigurationProperties(prefix = "spring.data.mongodb")`。spring-boot会默认读取这些配置，由于我们使用了配置中心。所以它也能从配置中心的配置文件中读取到，不需要配置在本地。(我把示例demo中的properties换成了yml的配置方式)		

```
mysqldb:
    datasource:
        url: jdbc\:mysql\://localhost\:3306/test?useUnicode\=true&characterEncoding\=utf-8
        username: csst
        password: csst

spring:
    data:
      mongodb:
        host: 10.168.248.36
        port: 27017
        username: test
        password: test
        authenticationDatabase: admin
```

就这样加在之前配置文件中就好。如果在调试的过程中发现配置没有读取到，可以用下面的方式来查看配置中心是否配置正确并且已经开启服务。		
`http://10.168.248.36:8888/user-dev.yml`		
`http://10.168.248.36:8888/user-dev.properties`		
在配置中心的后面加上配置文件的名字可以直接在浏览器中查看。在调试配置中心的时候也可以采取这样的操作，这样你能看到你的git地址和授权错误信息等。

spring-data-mongo提供了一个`MongoRepository`实现增删改查和复杂查询，在spring-boot中如何指定它使用哪个db呢？如果不配置他默认是使用的test。我测试了一下，加入下面的配置类就可以了。可以扫描一个包。

```
@Configuration
@EnableMongoRepositories(basePackageClasses = ApiLogRepository.class)
@AutoConfigureAfter(MongoDataAutoConfiguration.class)
public class SysLogDB extends AbstractMongoConfiguration {

    @Autowired
    private Mongo mongo;

    @Override
    protected String getDatabaseName() {
        return "syslog";
    }

    @Override
    public Mongo mongo() throws Exception {
        return mongo;
    }
}
```

到这里服务应用项目的mybatis和mongodb都配置好了，可以进行业务代码开发了。没有一个xml配置文件的感觉是不是很爽？下一篇文章讲解如何通过jenkins进行持续集成开发。