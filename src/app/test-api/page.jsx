'use client';

import { useState, useEffect } from 'react';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';

export default function TestApiPage() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const testApis = async () => {
    setLoading(true);
    const testResults = {};

    // 测试所有实时榜单接口
    const footerIfList = [{
      name: '自选榜',
      interface: Interface.find_coin,
      data: {
        pageSize: 10,
        pageNo: 1
      }
    }, {
      name: '涨幅榜',
      interface: Interface.price_change,
      data: {
        dim: 'today'
      }
    }, {
      name: '跌幅榜',
      interface: Interface.PRICE_DOWNCHANGE,
      data: {
        dim: 'today'
      }
    }, {
      name: '波幅榜',
      interface: Interface.price_wave,
      data: {
        dim: 'today'
      }
    }, {
      name: '成交额榜',
      interface: Interface.coin_trade,
      data: {
        intervals: 'today'
      }
    }, {
      name: '新币榜',
      interface: Interface.NEW_COIN,
      data: {}
    }, {
      name: '飙升榜',
      interface: Interface.PRICE_UPTRADE,
      data: {
        intervals: '7_day'
      }
    }];

    for (let i = 0; i < footerIfList.length; i++) {
      try {
        console.log(`🔄 测试接口: ${footerIfList[i].name}`);
        console.log(`📡 请求URL: ${footerIfList[i].interface}`);
        console.log(`📋 请求参数:`, footerIfList[i].data);
        
        const response = await request({
          url: footerIfList[i].interface,
          data: footerIfList[i].data
        });
        
        console.log(`✅ ${footerIfList[i].name} 响应:`, response);
        testResults[footerIfList[i].name] = {
          success: true,
          data: response,
          dataLength: response?.data?.length || 0
        };
      } catch (error) {
        console.error(`❌ ${footerIfList[i].name} 失败:`, error);
        testResults[footerIfList[i].name] = {
          success: false,
          error: error.message
        };
      }
    }

    setResults(testResults);
    setLoading(false);
  };

  useEffect(() => {
    testApis();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>API 测试页面</h1>
      <button onClick={testApis} disabled={loading}>
        {loading ? '测试中...' : '重新测试'}
      </button>
      
      <div style={{ marginTop: '20px' }}>
        {Object.entries(results).map(([name, result]) => (
          <div key={name} style={{ 
            marginBottom: '20px', 
            padding: '10px', 
            border: '1px solid #ccc',
            backgroundColor: result.success ? '#f0f8ff' : '#ffe4e1'
          }}>
            <h3>{name}</h3>
            {result.success ? (
              <div>
                <p>✅ 请求成功</p>
                <p>数据条数: {result.dataLength}</p>
                <details>
                  <summary>查看数据</summary>
                  <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div>
                <p>❌ 请求失败</p>
                <p>错误信息: {result.error}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}