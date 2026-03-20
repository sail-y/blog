## ADDED Requirements

### Requirement: 文章必须包含标准frontmatter

每篇技术文章的frontmatter SHALL包含以下必填字段：
- `title`: 文章标题，简洁明了，包含关键技术关键词
- `date`: 发布日期，格式为YYYY-MM-DD HH:mm:ss
- `tags`: 标签数组，包含文章涉及的技术关键词
- `categories`: 分类，文章所属的技术领域

文章MAY包含以下可选字段：
- `description`: 文章摘要，200-300字，用于SEO和预览
- `keywords`: SEO关键词，补充tags中的关键词

#### Scenario: 标准文章frontmatter
- **WHEN** 创建新的技术文章
- **THEN** frontmatter包含title、date、tags、categories四个必填字段
- **AND** 日期格式正确为YYYY-MM-DD HH:mm:ss
- **AND** tags为数组格式
- **AND** categories为字符串格式

#### Scenario: 带SEO优化的frontmatter
- **WHEN** 文章需要更好的SEO表现
- **THEN** 添加description字段，字数在200-300字之间
- **AND** description包含主要技术关键词
- **AND** 可选添加keywords字段补充长尾关键词

### Requirement: 文章必须遵循统一结构

技术文章SHALL按照以下标准结构组织内容：
1. **摘要**（可选但推荐）：200-300字概述文章核心内容
2. **正文**：按照逻辑分为多个章节
3. **总结**（长文章必需）：总结关键要点和最佳实践
4. **参考资料**（有引用时必需）：列出参考链接和资料

对于教程类文章，正文SHALL遵循"是什么→为什么→怎么做→注意事项"的逻辑顺序。

#### Scenario: 标准技术文章结构
- **WHEN** 编写技术教程类文章
- **THEN** 文章包含摘要部分（可选）
- **AND** 正文按章节划分，使用二级标题
- **AND** 文章末尾有总结部分
- **AND** 如有引用资料，在文末列出参考资料

#### Scenario: 快速笔记类文章结构
- **WHEN** 编写学习笔记或快速记录类文章
- **THEN** 文章至少包含标题和正文
- **AND** 可以省略摘要和总结部分
- **AND** 保持简洁，突出关键信息

### Requirement: 标题层级规范

文章SHALL遵守以下标题层级规则：
- 一级标题（#）：仅用于文章标题，在frontmatter中定义
- 二级标题（##）：用于主要章节划分
- 三级标题（###）：用于章节内的子主题
- 四级标题（####）：用于细分要点（谨慎使用）
- 禁止使用五级及以上标题

相邻层级SHALL保持连续，不跳级（如#直接跳到###）。

#### Scenario: 正确的标题层级
- **WHEN** 编写文章内容
- **THEN** 从二级标题开始（一级标题已在frontmatter）
- **AND** 使用2-4级标题
- **AND** 标题层级连续，无跳级
- **AND** 标题简洁明了，能概括该节内容

#### Scenario: 标题层级错误检测
- **WHEN** 文章出现标题跳级（如##直接到####）
- **THEN** 检查脚本标记为格式问题
- **AND** 提示"标题层级不连续，缺少###层级"

### Requirement: 代码块格式规范

代码块SHALL遵守以下格式规则：
- 必须使用三重反引号包裹
- 必须标注语言类型（如\`\`\`bash、\`\`\`java）
- 代码内容保持正确的缩进
- 避免在代码块内使用Tab缩进，统一使用空格

对于命令行输出，SHALL标注为bash或shell。对于配置文件，SHALL标注具体格式（yaml、json、xml等）。

#### Scenario: 代码块正确格式
- **WHEN** 在文章中插入代码示例
- **THEN** 使用三重反引号包裹代码
- **AND** 在第一个反引号后标注语言类型
- **AND** 代码保持正确的缩进格式
- **AND** 示例：\`\`\`java public class HelloWorld {...} \`\`\`

#### Scenario: 配置文件示例
- **WHEN** 展示配置文件内容
- **THEN** 标注具体配置格式
- **AND** 示例：\`\`\`yaml server: port: 8080 \`\`\`
- **AND** 不使用通用的\`\`\`conf或\`\`\`text标注

### Requirement: 列表格式规范

列表SHALL遵守以下格式规则：
- 列表项保持平行结构（语法结构一致）
- 有序列表用于步骤或排名，无序列表用于并列要点
- 列表层级缩进使用2个空格
- 避免列表嵌套超过3层

列表项以标点结尾时，所有列表项SHALL统一使用或统一不使用标点。

#### Scenario: 有序列表用于步骤说明
- **WHEN** 描述操作步骤或流程
- **THEN** 使用有序列表（1. 2. 3.）
- **AND** 每个步骤描述清晰、具体
- **AND** 步骤之间有逻辑顺序

#### Scenario: 无序列表用于并列要点
- **WHEN** 列举多个并列的技术要点或特性
- **THEN** 使用无序列表（- 或 *）
- **AND** 列表项保持平行的语法结构
- **AND** 各要点相互独立，无先后顺序

### Requirement: 链接格式规范

链接SHALL使用标准Markdown格式：
- 行内链接：`[显示文本](URL)`
- 引用式链接：`[显示文本][ref]`，文末定义`[ref]: URL`
- 站内链接使用相对路径，站外链接使用完整URL
- 链接文本SHALL描述性强，避免使用"点击这里"等模糊表述

#### Scenario: 站内文章链接
- **WHEN** 链接到博客内的其他文章
- **THEN** 使用相对路径格式
- **AND** 示例：`[Redis持久化配置](/2018/02/12/cache/cache01/)`
- **AND** 链接文本包含目标文章的关键信息

#### Scenario: 外部参考链接
- **WHEN** 链接到外部网站或文档
- **THEN** 使用完整URL
- **AND** 链接文本描述性强
- **AND** 示例：`[Redis官方文档](https://redis.io/documentation)`