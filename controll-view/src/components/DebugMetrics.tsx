import React, { useEffect, useState } from 'react';
import { prometheusApi } from '../utils/prometheus';

export const DebugMetrics: React.FC<{ instance: string }> = ({ instance }) => {
  const [data, setData] = useState<any>(null);
  
  useEffect(() => {
    const testQueries = async () => {
      const now = Math.floor(Date.now() / 1000);
      const start = now - 3600;
      
      try {
        // 1. 단순 메모리 쿼리
        const simpleQuery = await prometheusApi.get('/api/v1/query_range', {
          params: {
            query: `node_memory_MemAvailable_bytes{instance="${instance}"}`,
            start,
            end: now,
            step: 60
          }
        });
        
        // 2. 메모리 사용률 쿼리
        const percentQuery = await prometheusApi.get('/api/v1/query_range', {
          params: {
            query: `(1 - (node_memory_MemAvailable_bytes{instance="${instance}"} / node_memory_MemTotal_bytes{instance="${instance}"})) * 100`,
            start,
            end: now,
            step: 60
          }
        });
        
        setData({
          simple: simpleQuery.data,
          percent: percentQuery.data
        });
        
        console.log('Debug - Simple query result:', simpleQuery.data);
        console.log('Debug - Percent query result:', percentQuery.data);
        
      } catch (error) {
        console.error('Debug query error:', error);
      }
    };
    
    testQueries();
  }, [instance]);
  
  return (
    <div className="bg-yellow-50 p-4 rounded mb-4">
      <h3 className="font-bold mb-2">Debug Info for {instance}</h3>
      <pre className="text-xs overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};