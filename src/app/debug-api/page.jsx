'use client';

import { useState, useEffect } from 'react';
import { request } from '../../utils/request';
import { Interface } from '../../utils/constants';

export default function DebugApiPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const testApis = [
    {
      name: '自选榜',
      url: Interface.find_coin,
      data: { pageSize: 10, pageNo: 1 }
    },
    {
      name: '涨幅榜',
      url: Interface.price_change,
      data: { dim: 'today' }
    },
    {
      name: '跌幅榜',
      url: Interface.PRICE_DOWNCHANGE,
      data: { dim: 'today' }
    },
    {
      name: '波幅榜',
      url: Interface.price_wave,
      data: { dim: 'today' }
    },
    {
      name: '成交额榜',
      url: Interface.coin_trade,
      data: { intervals: 'today' }
    },
    {
      name: '新币榜',
      url: Interface.NEW_COIN,
      data: {}
    },
    {
      name: '飙升榜',
      url: Interface.PRICE_UPTRADE,
      data: { intervals: '7_day' }
    }
  ];

  const testAllApis = async () => {
    setLoading(true);
    const testResults = [];

    for (let i = 0; i < testApis.length; i++) {
      const api = testApis[i];
      console.log(`🔍 测试API: ${api.name}`);
      console.log(`📡 请求URL: ${api.url}`);
      console.log(`📋 请求参数:`, api.data);
      
      try {
        const startTime = Date.now();
        const response = await request({
          url: api.url,
          data: api.data
        });
        const endTime = Date.now();
        
        console.log(`✅ ${api.name} 成功:`, response);
        
        testResults.push({
          name: api.name,
          url: api.url,
          status: 'success',
          responseTime: endTime - startTime,
          dataLength: Array.isArray(response?.data) ? response.data.length : 
                     Array.isArray(response?.data?.list) ? response.data.list.length :
                     response?.data ? 1 : 0,
          response: JSON.stringify(response, null, 2).substring(0, 500) + '...'
        });
      } catch (error) {
        console.error(`❌ ${api.name} 失败:`, error);
        
        testResults.push({
          name: api.name,
          url: api.url,
          status: 'error',
          error: error.message || error.toString(),
          response: error.response ? JSON.stringify(error.response.data, null, 2) : 'No response data'
        });
      }
    }

    setResults(testResults);
    setLoading(false);
  };

  useEffect(() => {
    testAllApis();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API 调试页面</h1>
      <button 
        onClick={testAllApis} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? '测试中...' : '重新测试所有API'}
      </button>
      
      <div style={{ marginTop: '20px' }}>
        {results.map((result, index) => (
          <div 
            key={index} 
            style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '15px',
              marginBottom: '15px',
              backgroundColor: result.status === 'success' ? '#f0f8f0' : '#fff0f0'
            }}
          >
            <h3 style={{ 
              color: result.status === 'success' ? '#28a745' : '#dc3545',
              margin: '0 0 10px 0'
            }}>
              {result.status === 'success' ? '✅' : '❌'} {result.name}
            </h3>
            
            <p><strong>URL:</strong> {result.url}</p>
            
            {result.status === 'success' ? (
              <>
                <p><strong>响应时间:</strong> {result.responseTime}ms</p>
                <p><strong>数据条数:</strong> {result.dataLength}</p>
                <details>
                  <summary>响应数据预览</summary>
                  <pre style={{ 
                    backgroundColor: '#f8f9fa',
                    padding: '10px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '12px'
                  }}>
                    {result.response}
                  </pre>
                </details>
              </>
            ) : (
              <>
                <p><strong>错误信息:</strong> {result.error}</p>
                <details>
                  <summary>错误详情</summary>
                  <pre style={{ 
                    backgroundColor: '#f8f9fa',
                    padding: '10px',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '12px'
                  }}>
                    {result.response}
                  </pre>
                </details>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}