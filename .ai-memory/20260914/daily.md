## [09:50] - [Bug 修复]: 修复 DiscussionForumPosting 缺少 datePublished

- **文件**: src/utils/seoConfig.js, src/components/PostDetailSeo/index.jsx
- **决策**: 多字段解析日期；无日期时降级为 WebPage，避免无效 Forum 结构化数据
- **验证**: node 脚本验证 toSchemaDateTime / resolveSchemaDates 多字段与空对象

