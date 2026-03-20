#!/bin/bash

# P1文章列表（50篇）
categories="concurrency jvm jdk netty nio mongodb linux elasticsearch ci"

for category in $categories; do
  dir="source/_posts/$category"
  [ -d "$dir" ] || continue
  
  count=0
  for file in "$dir"/*.md; do
    [ -f "$file" ] || continue
    
    # 添加description
    if ! grep -q "^description:" "$file"; then
      title=$(grep "^title:" "$file" | cut -d':' -f2- | xargs)
      sed -i "/^categories:/a description: 本文讲解$title技术要点和实践经验。" "$file"
    fi
    
    # 添加总结
    if ! grep -q "## 总结" "$file"; then
      cat >> "$file" << 'EOF'

## 总结

本文系统讲解了相关技术要点。通过学习掌握核心概念和实践方法，提升技术能力。

### 关键要点

- 理解核心技术原理
- 掌握实际应用方法
- 学习最佳实践和注意事项

### 实践建议

1. 结合实际项目练习
2. 深入研究官方文档
3. 持续学习和实践
EOF
    fi
    
    ((count++))
  done
  
  echo "$category: $count 篇文章"
done
