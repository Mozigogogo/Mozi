/**
 * 示例骨架屏配置
 * 这个文件展示了如何创建不同类型的骨架屏配置
 */

// 示例 1: 简单的列表页骨架屏
export const simpleListSkeletonConfig = {
  type: 'column',
  gap: 12,
  style: { padding: '16px', backgroundColor: '#fff' },
  children: [
    // 列表项 1
    {
      type: 'row',
      gap: 12,
      style: { padding: '12px', borderBottom: '1px solid #f0f0f0' },
      children: [
        { type: 'circle', size: 48 },
        {
          type: 'column',
          gap: 8,
          style: { flex: 1 },
          children: [
            { type: 'element', width: '70%', height: 20 },
            { type: 'element', width: '40%', height: 16 }
          ]
        }
      ]
    },
    // 列表项 2
    {
      type: 'row',
      gap: 12,
      style: { padding: '12px', borderBottom: '1px solid #f0f0f0' },
      children: [
        { type: 'circle', size: 48 },
        {
          type: 'column',
          gap: 8,
          style: { flex: 1 },
          children: [
            { type: 'element', width: '70%', height: 20 },
            { type: 'element', width: '40%', height: 16 }
          ]
        }
      ]
    },
    // 列表项 3
    {
      type: 'row',
      gap: 12,
      style: { padding: '12px', borderBottom: '1px solid #f0f0f0' },
      children: [
        { type: 'circle', size: 48 },
        {
          type: 'column',
          gap: 8,
          style: { flex: 1 },
          children: [
            { type: 'element', width: '70%', height: 20 },
            { type: 'element', width: '40%', height: 16 }
          ]
        }
      ]
    }
  ]
};

// 示例 2: 卡片网格页骨架屏
export const cardGridSkeletonConfig = {
  type: 'column',
  style: { padding: '16px', backgroundColor: '#f5f5f5' },
  children: [
    // 标题
    {
      type: 'container',
      style: { marginBottom: '16px' },
      children: [
        { type: 'element', width: 120, height: 28 }
      ]
    },
    // 卡片网格
    {
      type: 'grid',
      columns: 'repeat(2, 1fr)',
      gap: 12,
      children: [
        // 卡片 1
        {
          type: 'container',
          style: { 
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '16px'
          },
          children: [
            { type: 'element', width: '100%', height: 120, borderRadius: 8, style: { marginBottom: '12px' } },
            { type: 'element', width: '80%', height: 20, style: { marginBottom: '8px' } },
            { type: 'element', width: '60%', height: 16 }
          ]
        },
        // 卡片 2
        {
          type: 'container',
          style: { 
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '16px'
          },
          children: [
            { type: 'element', width: '100%', height: 120, borderRadius: 8, style: { marginBottom: '12px' } },
            { type: 'element', width: '80%', height: 20, style: { marginBottom: '8px' } },
            { type: 'element', width: '60%', height: 16 }
          ]
        },
        // 卡片 3
        {
          type: 'container',
          style: { 
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '16px'
          },
          children: [
            { type: 'element', width: '100%', height: 120, borderRadius: 8, style: { marginBottom: '12px' } },
            { type: 'element', width: '80%', height: 20, style: { marginBottom: '8px' } },
            { type: 'element', width: '60%', height: 16 }
          ]
        },
        // 卡片 4
        {
          type: 'container',
          style: { 
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '16px'
          },
          children: [
            { type: 'element', width: '100%', height: 120, borderRadius: 8, style: { marginBottom: '12px' } },
            { type: 'element', width: '80%', height: 20, style: { marginBottom: '8px' } },
            { type: 'element', width: '60%', height: 16 }
          ]
        }
      ]
    }
  ]
};

// 示例 3: 个人资料页骨架屏
export const profileSkeletonConfig = {
  type: 'column',
  style: { width: '100%', backgroundColor: '#fff' },
  children: [
    // 头部背景
    {
      type: 'container',
      style: { 
        height: '200px',
        background: 'linear-gradient(180deg, #f0f0f0 0%, #ffffff 100%)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      },
      children: [
        { type: 'circle', size: 80, style: { marginBottom: '12px' } },
        { type: 'element', width: 120, height: 24, style: { marginBottom: '8px' } },
        { type: 'element', width: 200, height: 16 }
      ]
    },
    // 统计信息
    {
      type: 'grid',
      columns: 'repeat(3, 1fr)',
      style: { 
        padding: '20px 16px',
        borderBottom: '8px solid #f5f5f5'
      },
      children: [
        {
          type: 'column',
          style: { alignItems: 'center', gap: '8px' },
          children: [
            { type: 'element', width: 40, height: 24 },
            { type: 'element', width: 60, height: 16 }
          ]
        },
        {
          type: 'column',
          style: { alignItems: 'center', gap: '8px' },
          children: [
            { type: 'element', width: 40, height: 24 },
            { type: 'element', width: 60, height: 16 }
          ]
        },
        {
          type: 'column',
          style: { alignItems: 'center', gap: '8px' },
          children: [
            { type: 'element', width: 40, height: 24 },
            { type: 'element', width: 60, height: 16 }
          ]
        }
      ]
    },
    // 详细信息列表
    {
      type: 'column',
      style: { padding: '16px' },
      children: [
        {
          type: 'row',
          style: { 
            justifyContent: 'space-between',
            padding: '16px 0',
            borderBottom: '1px solid #f0f0f0'
          },
          children: [
            { type: 'element', width: 80, height: 20 },
            { type: 'element', width: 120, height: 20 }
          ]
        },
        {
          type: 'row',
          style: { 
            justifyContent: 'space-between',
            padding: '16px 0',
            borderBottom: '1px solid #f0f0f0'
          },
          children: [
            { type: 'element', width: 80, height: 20 },
            { type: 'element', width: 120, height: 20 }
          ]
        },
        {
          type: 'row',
          style: { 
            justifyContent: 'space-between',
            padding: '16px 0',
            borderBottom: '1px solid #f0f0f0'
          },
          children: [
            { type: 'element', width: 80, height: 20 },
            { type: 'element', width: 120, height: 20 }
          ]
        }
      ]
    }
  ]
};

// 示例 4: 文章详情页骨架屏
export const articleSkeletonConfig = {
  type: 'column',
  style: { padding: '16px', backgroundColor: '#fff' },
  children: [
    // 标题
    { type: 'element', width: '100%', height: 32, style: { marginBottom: '16px' } },
    // 作者信息
    {
      type: 'row',
      gap: 12,
      style: { marginBottom: '24px' },
      children: [
        { type: 'circle', size: 40 },
        {
          type: 'column',
          gap: 6,
          style: { flex: 1 },
          children: [
            { type: 'element', width: 100, height: 16 },
            { type: 'element', width: 150, height: 14 }
          ]
        }
      ]
    },
    // 封面图
    { 
      type: 'element', 
      width: '100%', 
      height: 200, 
      borderRadius: 8,
      style: { marginBottom: '24px' }
    },
    // 文章内容
    { type: 'element', width: '100%', height: 16, style: { marginBottom: '12px' } },
    { type: 'element', width: '100%', height: 16, style: { marginBottom: '12px' } },
    { type: 'element', width: '100%', height: 16, style: { marginBottom: '12px' } },
    { type: 'element', width: '90%', height: 16, style: { marginBottom: '24px' } },
    { type: 'element', width: '100%', height: 16, style: { marginBottom: '12px' } },
    { type: 'element', width: '100%', height: 16, style: { marginBottom: '12px' } },
    { type: 'element', width: '80%', height: 16 }
  ]
};

