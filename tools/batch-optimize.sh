#!/bin/bash

# 批量优化cache系列文章的通用描述
for file in source/_posts/cache/cache*.md; do
  if [ ! -f "$file" ]; then continue; fi
  
  filename=$(basename "$file")
  echo "优化: $filename"
  
  # 检查是否已有description
  if grep -q "^description:" "$file"; then
    echo "  - 已有description，跳过"
    continue
  fi
  
  # 提取标题作为description基础
  title=$(grep "^title:" "$file" | cut -d':' -f2- | xargs)
  
  # 在frontmatter的categories后添加description
  if grep -q "^categories:" "$file"; then
    sed -i "/^categories:/a description: 本文讲解$title相关技术要点和实践经验，提供系统化的知识总结和应用指导。" "$file"
    echo "  - 添加description"
  fi
done

echo "批量优化完成"
