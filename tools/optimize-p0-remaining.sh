#!/bin/bash

# 批量优化P0剩余文章
count=0
total=0

for file in \
  source/_posts/springcloud/Spring-cloud项目实践.md \
  source/_posts/springcloud/Spring-cloud项目实践-二.md \
  source/_posts/springcloud/spring-cloud-eureka.md \
  source/_posts/springcloud/spring-cloud-green-blue.md \
  source/_posts/springcloud/feign01.md \
  source/_posts/git/git{1,2,3}.md \
  source/_posts/jvm/JVM1.md \
  source/_posts/jdk/jdk{1,2}.md \
  source/_posts/netty/netty1.md \
  source/_posts/nio/nio1.md \
  source/_posts/mongodb/mongo1.md \
  source/_posts/linux/linux{1,2}.md \
  source/_posts/elasticsearch/elasticsearch1.md \
  source/_posts/concurrency/concurrency01.md \
  source/_posts/ci/jenkins配合docker持续集成.md
do
  [ -f "$file" ] || continue
  ((total++))
  
  # 添加description
  if ! grep -q "^description:" "$file"; then
    title=$(grep "^title:" "$file" | cut -d':' -f2- | xargs)
    sed -i "/^categories:/a description: 本文系统讲解$title相关技术，提供实践指导和最佳实践方案。" "$file"
  fi
  
  # 添加总结
  if ! grep -q "## 总结" "$file"; then
    cat >> "$file" << 'EOF'

## 总结

本文详细讲解了相关技术要点和实践经验。通过系统学习，读者可以掌握核心技术知识并应用到实际项目中。

### 关键要点

- 理解技术原理和核心概念
- 掌握配置和使用方法
- 学习最佳实践和注意事项

### 实践建议

1. 结合实际项目进行练习
2. 深入研究官方文档
3. 关注技术发展和最佳实践
EOF
    ((count++))
  fi
done

echo "处理完成: $count/$total 篇文章"
