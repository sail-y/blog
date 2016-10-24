title: Mybatis 枚举存储
date: 2015-12-11 15:10:44
tags: [mybatis]
categories: Java
---

######枚举
我们在写程序的时候会遇到这种需求。就是我的对象里面有一个属性是一个枚举值，但是mybatis默认是不支持的，官方提供了一个typeHandler可以用枚举的ordinal()来进行存和取的自动转换。把它配置在
`mybatis-configuration.xml`里。	

```
<typeHandlers>
        <typeHandler handler="org.apache.ibatis.type.EnumOrdinalTypeHandler" javaType="com.xxx.user.UserType"/>
</typeHandlers>
```
<!--more-->

######问题
但是这里有一些问题，必须如果数据库里面存在了别的数字，举个例，有以下枚举

```
public enum UserType{
    ADMIN, EDITOR
}
```

这个枚举在数据库中对应的数字应该是0和1，问题如下

1. 枚举写的顺序不能变，否则数据库数据会错乱
2. 枚举序数中间不能中断(0，2)
3. 数据库里有除了0和1之外的数字，在查询数据的时候程序会得到一个异常(`ArrayIndexOutOfBoundsException`)

最怕的就是程序出异常了，这里`ArrayIndexOutOfBoundsException`的原因是因为EnumOrdinalTypeHandler的代码大致是下面这个的意思。
	
	UserType.values()[i]

所以就出现了我们写代码其实并不经常会遇到的`ArrayIndexOutOfBoundsException`


######解决方案
为了避免出现这些情况，有个简单的办法就是重写一个`EnumOrdinalTypeHandler`，
我这里贴一下我的解决方案。		
首先要为所有枚举写一个接口，为了获取枚举对应的intValue,代码如下。

```
public interface CommonEnum<E> {

    int getValue();


    /**
     * 获取枚举值对应的枚举
     *
     * @param enumClass 枚举类
     * @param enumValue 枚举值
     * @return 枚举
     */
    static <E extends CommonEnum<E>> E getEnum(final Class<E> enumClass, final Integer enumValue) {
        if (enumValue == null) {
            return null;
        }
        try {
            return valueOf(enumClass, enumValue);
        } catch (final IllegalArgumentException ex) {
            return null;
        }
    }

    /**
     * 获取枚举值对应的枚举
     *
     * @param enumClass 枚举类
     * @param enumValue 枚举值
     * @return 枚举
     */
    static <E extends CommonEnum> E valueOf(Class<E> enumClass, Integer enumValue) {
        if (enumValue == null) throw new NullPointerException("EnumValue is null");
        return getEnumMap(enumClass).get(enumValue);
    }

    /**
     * 获取枚举键值对
     *
     * @param enumClass 枚举类型
     * @return 键值对
     */
    static <E extends CommonEnum> Map<Integer, E> getEnumMap(Class<E> enumClass) {
        E[] enums = enumClass.getEnumConstants();
        if (enums == null)
            throw new IllegalArgumentException(enumClass.getSimpleName() + " does not represent an enum type.");
        Map<Integer, E> map = new HashMap<>(2 * enums.length);
        for (E t : enums){
            map.put(t.getValue(), t);
        }

        return map;
    }


}
```
上面3个静态方法也可以提取到工具类中，我这里偷了一下懒，也因为我是用的JDK8。		
枚举实例如下：

```
public enum UserType implements CommonEnum<UserType> {
    ADMIN(0), EDITOR(2);


    private int value;

    UserType(int value) {
        this.value = value;
    }

    @Override
    public int getValue() {
        return this.value;
    }
}
```

这里就是一个很常见的枚举，重点在下面的typeHandler。

```

public class CustomEnumTypeHandler<E extends CommonEnum<E>> extends BaseTypeHandler<E> {

    private Class<E> type;

    public CustomEnumTypeHandler(Class<E> type) {
        if (type == null) throw new IllegalArgumentException("Type argument cannot be null");
        this.type = type;
        E[] enums = type.getEnumConstants();
        if (enums == null)
            throw new IllegalArgumentException(type.getSimpleName() + " does not represent an enum type.");
    }

    @Override
    public void setNonNullParameter(PreparedStatement ps, int i, E parameter, JdbcType jdbcType) throws SQLException {
        ps.setInt(i, parameter.getValue());
    }

    @Override
    public E getNullableResult(ResultSet rs, String columnName) throws SQLException {
        int i = rs.getInt(columnName);

        if (rs.wasNull()) {
            return null;
        } else {
            try {
                return CommonEnum.getEnum(type, i);
            } catch (Exception ex) {
                throw new IllegalArgumentException("Cannot convert " + i + " to " + type.getSimpleName() + " by int value.", ex);
            }
        }
    }

    @Override
    public E getNullableResult(ResultSet rs, int columnIndex) throws SQLException {
        int i = rs.getInt(columnIndex);
        if (rs.wasNull()) {
            return null;
        } else {
            try {
                return CommonEnum.getEnum(type, i);
            } catch (Exception ex) {
                throw new IllegalArgumentException("Cannot convert " + i + " to " + type.getSimpleName() + " by int value.", ex);
            }
        }
    }

    @Override
    public E getNullableResult(CallableStatement cs, int columnIndex) throws SQLException {
        int i = cs.getInt(columnIndex);
        if (cs.wasNull()) {
            return null;
        } else {
            try {
                return CommonEnum.getEnum(type, i);
            } catch (Exception ex) {
                throw new IllegalArgumentException("Cannot convert " + i + " to " + type.getSimpleName() + " by int value.", ex);
            }
        }


    }


}
```

这个类基本上也是拷的`EnumOrdinalTypeHandler`。重要的改动的代码如下：
	
	ps.setInt(i, parameter.getValue());
	return CommonEnum.getEnum(type, i);
	
第一句是插入和更新的时候用到的，第二句是查询的时候用到的，最后把`mybatis-configuration.xml`里的改一下。	

```
<typeHandlers>
        <typeHandler handler="xxx.CustomEnumTypeHandler" javaType="com.xxx.user.UserType"/>
</typeHandlers>
```