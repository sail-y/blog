#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 评分标准
const SCORING = {
  structure: {
    name: '结构完整性',
    maxScore: 2,
    checks: {
      hasAbstract: 0.5,
      hasConclusion: 0.5,
      hasReferences: 0.5,
      hasToc: 0.5
    }
  },
  language: {
    name: '语言专业性',
    maxScore: 2,
    penalties: {
      colloquialisms: 0.2 // 每个口语化表述扣0.2分
    }
  },
  readability: {
    name: '可读性',
    maxScore: 2,
    checks: {
      properParagraphs: 0.5,
      hasHighlights: 0.5,
      properSections: 0.5,
      goodTransitions: 0.5
    }
  },
  format: {
    name: '格式规范性',
    maxScore: 2,
    checks: {
      properHeadings: 0.5,
      codeBlocksLabeled: 0.5,
      properLists: 0.5,
      properLinks: 0.5
    }
  },
  seo: {
    name: 'SEO优化',
    maxScore: 2,
    checks: {
      hasTitle: 0.4,
      hasTags: 0.4,
      hasCategories: 0.4,
      hasDescription: 0.4,
      keywordsInTitle: 0.4
    }
  }
};

// 口语化词汇列表
const COLLOQUIALISMS = [
  '都知道', '就死定了', '搞得定', '弄得', '然后呢', '就是说要',
  '大概', '可能', '好像', '太棒了', '太糟糕了', '弄个', '存下来'
];

// 检查frontmatter
function checkFrontmatter(content) {
  // 支持Windows和Unix换行符
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const frontmatterMatch = normalizedContent.match(/^---\n([\s\S]+?)\n---/);

  if (!frontmatterMatch) {
    return { valid: false, data: {} };
  }

  const frontmatterText = frontmatterMatch[1];
  const data = {};

  // 逐行解析frontmatter
  const lines = frontmatterText.split('\n');
  lines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) return;

    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    // 处理数组格式 [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(s => s.trim());
    }

    data[key] = value;
  });

  // 简单验证：至少有title就算有效
  const isValid = !!data.title;

  return { valid: isValid, data };
}

// 检查文章结构
function checkStructure(content) {
  const bodyContent = content.replace(/^---[\s\S]+?---\n/, '');
  const lines = bodyContent.split('\n').filter(l => l.trim());

  const score = {
    hasAbstract: false,
    hasConclusion: false,
    hasReferences: false,
    hasToc: false
  };

  // 检查摘要（通常在开头）
  const first200Words = bodyContent.substring(0, 500);
  if (first200Words.length > 100 && !first200Words.includes('#')) {
    score.hasAbstract = true;
  }

  // 检查总结
  if (/##\s*总结|##\s*小结|##\s*Summary/i.test(bodyContent)) {
    score.hasConclusion = true;
  }

  // 检查参考资料
  if (/##\s*参考资料|##\s*参考链接|##\s*References/i.test(bodyContent)) {
    score.hasReferences = true;
  }

  // 检查目录（长文章）
  const wordCount = bodyContent.replace(/[#*`\[\]]/g, '').length;
  if (wordCount > 3000 && /##\s*目录|##\s*文章目录/i.test(bodyContent)) {
    score.hasToc = true;
  }

  return score;
}

// 检查语言专业性
function checkLanguage(content) {
  const bodyContent = content.replace(/^---[\s\S]+?---\n/, '');
  const colloquialismsFound = [];

  COLLOQUIALISMS.forEach(term => {
    const regex = new RegExp(term, 'g');
    const matches = bodyContent.match(regex);
    if (matches) {
      colloquialismsFound.push({ term, count: matches.length });
    }
  });

  return {
    colloquialismsFound,
    penalty: colloquialismsFound.reduce((sum, item) => sum + item.count * 0.2, 0)
  };
}

// 检查可读性
function checkReadability(content) {
  const bodyContent = content.replace(/^---[\s\S]+?---\n/, '');
  const paragraphs = bodyContent.split(/\n\n+/).filter(p => p.trim() && !p.startsWith('#'));

  const score = {
    properParagraphs: true, // 段落合理
    hasHighlights: false, // 有关键点突出
    properSections: false, // 章节合理
    goodTransitions: false // 有过渡
  };

  // 检查段落长度
  const longParagraphs = paragraphs.filter(p => p.split('\n').length > 5);
  if (longParagraphs.length > paragraphs.length * 0.3) {
    score.properParagraphs = false;
  }

  // 检查是否有加粗或引用
  if (/\*\*.+\*\*|>.+/m.test(bodyContent)) {
    score.hasHighlights = true;
  }

  // 检查章节（二级标题数量）
  const h2Count = (bodyContent.match(/^##\s/gm) || []).length;
  if (h2Count >= 2 && h2Count <= 10) {
    score.properSections = true;
  }

  // 检查过渡词
  if (/首先|然后|接下来|最后|因此|所以|但是|然而/.test(bodyContent)) {
    score.goodTransitions = true;
  }

  return score;
}

// 检查格式规范性
function checkFormat(content) {
  const bodyContent = content.replace(/^---[\s\S]+?---\n/, '');

  const score = {
    properHeadings: true,
    codeBlocksLabeled: true,
    properLists: true,
    properLinks: true
  };

  // 检查标题层级
  const headings = bodyContent.match(/^#{1,6}\s/gm) || [];
  let prevLevel = 0;
  for (const h of headings) {
    const level = h.trim().split(' ')[0].length;
    if (prevLevel > 0 && level > prevLevel + 1) {
      score.properHeadings = false;
      break;
    }
    prevLevel = level;
  }

  // 检查代码块
  const codeBlocks = bodyContent.match(/```\n|```[a-z]/gi) || [];
  const unlabeledBlocks = codeBlocks.filter(b => b === '```\n');
  if (unlabeledBlocks.length > codeBlocks.length * 0.3) {
    score.codeBlocksLabeled = false;
  }

  // 检查列表（简化检查）
  const lists = bodyContent.match(/^[*-]\s|^\d+\.\s/gm) || [];
  if (lists.length > 0) {
    // 检查列表项长度一致性（简化）
    score.properLists = true;
  }

  // 检查链接
  const links = bodyContent.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  const vagueLinks = links.filter(l => /\[点击这里\]|\[这里\]|\[链接\]/.test(l));
  if (vagueLinks.length > 0) {
    score.properLinks = false;
  }

  return score;
}

// 检查SEO
function checkSeo(frontmatter, content) {
  const score = {
    hasTitle: !!frontmatter.data.title,
    hasTags: frontmatter.data.tags && frontmatter.data.tags.length > 0,
    hasCategories: !!frontmatter.data.categories,
    hasDescription: !!frontmatter.data.description,
    keywordsInTitle: false
  };

  // 简化的关键词检查（标题是否包含技术关键词）
  if (frontmatter.data.title) {
    const techKeywords = /[a-zA-Z]{2,}/; // 包含英文技术术语
    score.keywordsInTitle = techKeywords.test(frontmatter.data.title);
  }

  return score;
}

// 计算总分
function calculateScore(structure, language, readability, format, seo) {
  let total = 0;

  // 结构分
  Object.values(structure).forEach(v => { if (v) total += 0.5; });

  // 语言分（倒扣）
  total += 2 - language.penalty;

  // 可读性分
  Object.values(readability).forEach(v => { if (v) total += 0.5; });

  // 格式分
  Object.values(format).forEach(v => { if (v) total += 0.5; });

  // SEO分
  Object.values(seo).forEach(v => { if (v) total += 0.4; });

  return Math.min(10, Math.max(0, total));
}

// 分析单篇文章
function analyzeArticle(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const frontmatter = checkFrontmatter(content);

  if (!frontmatter.valid) {
    return {
      file: filePath,
      error: 'Invalid frontmatter',
      score: 0
    };
  }

  const structure = checkStructure(content);
  const language = checkLanguage(content);
  const readability = checkReadability(content);
  const format = checkFormat(content);
  const seo = checkSeo(frontmatter, content);

  const totalScore = calculateScore(structure, language, readability, format, seo);

  return {
    file: path.basename(filePath),
    path: filePath,
    frontmatter: frontmatter.data,
    scores: {
      total: totalScore.toFixed(1),
      structure,
      language,
      readability,
      format,
      seo
    }
  };
}

// 生成报告
function generateReport(results) {
  console.log('\n=== 文章质量检查报告 ===\n');

  results.forEach(result => {
    if (result.error) {
      console.log(`❌ ${result.file}: ${result.error}`);
      return;
    }

    const score = parseFloat(result.scores.total);
    const emoji = score >= 8 ? '✅' : score >= 6 ? '⚠️' : '❌';
    console.log(`${emoji} ${result.file} - 总分: ${result.scores.total}/10`);

    // 详细问题
    if (score < 7) {
      const issues = [];

      if (!result.scores.structure.hasAbstract) issues.push('缺少摘要');
      if (!result.scores.structure.hasConclusion) issues.push('缺少总结');
      if (result.scores.language.penalty > 0) {
        const colloquialisms = result.scores.language.colloquialismsFound;
        if (colloquialisms && colloquialisms.length > 0) {
          issues.push(`发现${colloquialisms.length}处口语化表述`);
        }
      }
      if (!result.scores.format.properHeadings) issues.push('标题层级不规范');
      if (!result.scores.seo.hasDescription) issues.push('缺少SEO描述');

      if (issues.length > 0) {
        console.log(`   问题: ${issues.join(', ')}`);
      }
    }
  });

  // 统计
  const validResults = results.filter(r => !r.error);
  const avgScore = validResults.reduce((sum, r) => sum + parseFloat(r.scores.total), 0) / validResults.length;

  console.log('\n=== 统计 ===');
  console.log(`检查文章数: ${results.length}`);
  console.log(`平均质量分: ${avgScore.toFixed(1)}/10`);
  console.log(`优秀文章(≥8分): ${validResults.filter(r => parseFloat(r.scores.total) >= 8).length}`);
  console.log(`良好文章(6-7分): ${validResults.filter(r => parseFloat(r.scores.total) >= 6 && parseFloat(r.scores.total) < 8).length}`);
  console.log(`需优化(<6分): ${validResults.filter(r => parseFloat(r.scores.total) < 6).length}`);
}

// 主函数
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('用法: node article-check.js <file1.md> [file2.md ...]');
    console.log('   或: node article-check.js <directory/*.md>');
    process.exit(1);
  }

  const files = [];
  args.forEach(arg => {
    if (arg.includes('*')) {
      // 简化处理glob模式
      const dir = path.dirname(arg);
      const pattern = path.basename(arg);
      // 这里简化处理，实际应该使用glob库
      console.log(`提示: 请使用具体文件路径，暂不支持通配符`);
    } else {
      files.push(arg);
    }
  });

  const results = files.map(file => {
    if (!fs.existsSync(file)) {
      return { file, error: 'File not found' };
    }
    return analyzeArticle(file);
  });

  generateReport(results);
}

main();