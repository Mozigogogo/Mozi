/**
 * 币种详情页骨架屏配置
 */
export const detailPageSkeletonConfig = {
  type: 'column',
  style: { width: '100%', backgroundColor: '#fff' },
  children: [
    // 头部信息区域
    {
      type: 'container',
      style: { 
        padding: '16px',
        backgroundColor: '#fff'
      },
      children: [
        // 币种基本信息行
        {
          type: 'row',
          style: { 
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px'
          },
          children: [
            // 左侧：图标+名称+价格+涨跌幅
            {
              type: 'column',
              style: { flex: 1, gap: '8px' },
              children: [
                // 图标+名称
                {
                  type: 'row',
                  gap: 8,
                  style: { alignItems: 'center' },
                  children: [
                    { type: 'circle', size: 40 },
                    { type: 'element', width: 80, height: 24 }
                  ]
                },
                // 价格
                { type: 'element', width: 150, height: 40, style: { marginTop: '4px' } },
                // 涨跌幅
                {
                  type: 'row',
                  gap: 8,
                  style: { alignItems: 'center', marginTop: '4px' },
                  children: [
                    { type: 'circle', size: 24 },
                    { type: 'element', width: 120, height: 18 }
                  ]
                }
              ]
            },
            // 右侧：市值排名+市值
            {
              type: 'column',
              style: { alignItems: 'flex-end', gap: '8px', marginTop: '48px' },
              children: [
                { type: 'element', width: 80, height: 24 },
                { type: 'element', width: 120, height: 18 }
              ]
            }
          ]
        },
        // 详细信息网格
        {
          type: 'grid',
          columns: 'repeat(2, 1fr)',
          gap: 12,
          style: { marginTop: '16px' },
          children: [
            // 左侧列
            {
              type: 'column',
              gap: 12,
              children: [
                {
                  type: 'row',
                  style: { justifyContent: 'space-between' },
                  children: [
                    { type: 'element', width: 80, height: 16 },
                    { type: 'element', width: 80, height: 16 }
                  ]
                },
                {
                  type: 'row',
                  style: { justifyContent: 'space-between' },
                  children: [
                    { type: 'element', width: 80, height: 16 },
                    { type: 'element', width: 80, height: 16 }
                  ]
                }
              ]
            },
            // 右侧列
            {
              type: 'column',
              gap: 12,
              children: [
                {
                  type: 'row',
                  style: { justifyContent: 'space-between' },
                  children: [
                    { type: 'element', width: 80, height: 16 },
                    { type: 'element', width: 80, height: 16 }
                  ]
                },
                {
                  type: 'row',
                  style: { justifyContent: 'space-between' },
                  children: [
                    { type: 'element', width: 80, height: 16 },
                    { type: 'element', width: 80, height: 16 }
                  ]
                }
              ]
            }
          ]
        },
        // 展开/收起按钮
        {
          type: 'row',
          style: { 
            justifyContent: 'center',
            marginTop: '12px'
          },
          children: [
            { type: 'element', width: 20, height: 20, borderRadius: 10 }
          ]
        }
      ]
    },
    
    // 图表区域（包含整个图表和控制按钮）
    {
      type: 'container',
      style: { 
        padding: '16px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #f0f0f0'
      },
      children: [
        { type: 'element', width: '100%', height: 300, borderRadius: 8 }
      ]
    },
    
    // 市场数据标题
    {
      type: 'container',
      style: { 
        padding: '16px',
        backgroundColor: '#fff'
      },
      children: [
        { type: 'element', width: 100, height: 24 }
      ]
    },
    
    // 市场数据表格
    {
      type: 'container',
      style: { 
        padding: '0 16px 16px',
        backgroundColor: '#fff'
      },
      children: [
        // 表头
        {
          type: 'row',
          style: { 
            padding: '12px 0',
            borderBottom: '1px solid #f0f0f0',
            justifyContent: 'space-between'
          },
          children: [
            { type: 'element', width: 60, height: 16 },
            { type: 'element', width: 60, height: 16 },
            { type: 'element', width: 60, height: 16 },
            { type: 'element', width: 60, height: 16 }
          ]
        },
        // 数据行1
        {
          type: 'row',
          style: { 
            padding: '12px 0',
            borderBottom: '1px solid #f0f0f0',
            justifyContent: 'space-between'
          },
          children: [
            {
              type: 'row',
              gap: 8,
              style: { alignItems: 'center' },
              children: [
                { type: 'circle', size: 24 },
                { type: 'element', width: 50, height: 16 }
              ]
            },
            { type: 'element', width: 60, height: 16 },
            { type: 'element', width: 60, height: 16 },
            { type: 'element', width: 60, height: 16 }
          ]
        },
        // 数据行2
        {
          type: 'row',
          style: { 
            padding: '12px 0',
            borderBottom: '1px solid #f0f0f0',
            justifyContent: 'space-between'
          },
          children: [
            {
              type: 'row',
              gap: 8,
              style: { alignItems: 'center' },
              children: [
                { type: 'circle', size: 24 },
                { type: 'element', width: 50, height: 16 }
              ]
            },
            { type: 'element', width: 60, height: 16 },
            { type: 'element', width: 60, height: 16 },
            { type: 'element', width: 60, height: 16 }
          ]
        },
        // 数据行3
        {
          type: 'row',
          style: { 
            padding: '12px 0',
            borderBottom: '1px solid #f0f0f0',
            justifyContent: 'space-between'
          },
          children: [
            {
              type: 'row',
              gap: 8,
              style: { alignItems: 'center' },
              children: [
                { type: 'circle', size: 24 },
                { type: 'element', width: 50, height: 16 }
              ]
            },
            { type: 'element', width: 60, height: 16 },
            { type: 'element', width: 60, height: 16 },
            { type: 'element', width: 60, height: 16 }
          ]
        }
      ]
    }
  ]
};

