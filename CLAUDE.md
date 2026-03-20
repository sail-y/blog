# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hexo blog for technical articles in Chinese, deployed to GitHub Pages at http://www.saily.top/.

## Common Commands

### Setup
```bash
# Install dependencies
npm install

# Initialize and update theme submodule (for fresh clone)
git submodule update --init --recursive

# Update theme to latest version
git submodule update --remote themes/next
```

### Development

**Note:** Use `node node_modules/hexo/bin/hexo` or install hexo-cli globally.

```bash
# Start local server with hot reload (http://localhost:4000)
node node_modules/hexo/bin/hexo server
# or if hexo-cli is installed globally:
hexo server

# Generate static files
node node_modules/hexo/bin/hexo generate

# Clean generated files
node node_modules/hexo/bin/hexo clean

# Create a new post
node node_modules/hexo/bin/hexo new post "post-title"

# Create a new draft
node node_modules/hexo/bin/hexo new draft "draft-title"

# Publish a draft
node node_modules/hexo/bin/hexo publish "draft-title"
```

### Deployment
```bash
# Generate and deploy to GitHub Pages
npx hexo generate --deploy
# or
npx hexo deploy --generate
```

## Architecture

### Directory Structure

- `source/` - All content files
  - `_posts/` - Blog posts organized in subdirectories by category (cache, ci, concurrency, elasticsearch, git, etc.)
  - `img/` - Images and assets
  - `about/`, `categories/`, `tags/` - Static pages
  - `bak/` - Backup files
- `themes/next/` - Theme (git submodule from https://github.com/iissnan/hexo-theme-next)
- `scaffolds/` - Post templates
- `_config.yml` - Main Hexo configuration
- `public/` - Generated static site (not in repo)

### Post Structure

Posts are Markdown files with YAML frontmatter:

```yaml
---
title: Post Title
date: YYYY-MM-DD HH:mm:ss
tags: [tag1, tag2]
categories: Category Name
---
```

Posts are organized in subdirectories under `source/_posts/` by topic (e.g., `source/_posts/cache/`, `source/_posts/git/`).

Use `<!--more-->` to mark the excerpt separator.

### Theme Configuration

The theme is **NexT v8.27.0** installed via npm. Configuration is in `_config.next.yml`.

To update the theme:
```bash
npm update hexo-theme-next
```

For theme customization, edit `_config.next.yml` or use custom files in `source/_data/`.

### Hexo Plugins Installed

- `hexo-deployer-git` - Deploy to Git
- `hexo-generator-archive/category/tag/index` - Page generators
- `hexo-generator-feed` - RSS feed (atom.xml)
- `hexo-generator-sitemap` - Sitemap (sitemap.xml)
- `hexo-generator-searchdb` - Local search
- `hexo-renderer-ejs/marked/stylus` - Template/markdown/style renderers
- `hexo-server` - Local development server
- `markdown-toc` - Table of contents generation

### Configuration Highlights

- Language: zh-CN
- Permalink format: `:year/:month/:day/:title/`
- Pagination: 10 posts per page
- Highlight.js enabled with line numbers
- Stylus compression enabled