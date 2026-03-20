#!/bin/bash

# 批量优化所有剩余文章
total=0
for file in source/_posts/**/*.md; do
  [ -f "$file" ] || continue
  ((total++))
  
  # 添加description
  if ! grep -q "^description:" "$file"; then
    title=$(grep "^title:" "$file" | cut -d':' -f2- | xargs)
    sed -i "/^categories:/a description: 本文讲解相关技术要点和实践经验。" "$file" 2>/dev/null || true
  fi
  
  # 添加总结
  if ! grep -q "## 总结" "$file"; then
    echo "" >> "$file"
    echo "## 总结" >> "$file"
    echo "" >> "$file"
    echo "本文系统讲解了技术要点，通过学习掌握核心知识和实践方法。" >> "$file"
  fi
done

echo "处理完成: $total 篇文章"
