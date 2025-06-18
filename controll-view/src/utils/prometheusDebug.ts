import { prometheusApi } from './prometheus';

export const checkAvailableMetrics = async (instance: string) => {
  try {
    // 사용 가능한 메모리 메트릭 확인
    const memoryMetrics = [
      'node_memory_MemTotal_bytes',
      'node_memory_MemFree_bytes',
      'node_memory_MemAvailable_bytes',
      'node_memory_Active_bytes',
      'node_memory_Inactive_bytes',
      'node_memory_Buffers_bytes',
      'node_memory_Cached_bytes'
    ];

    console.log(`Checking metrics for instance: ${instance}`);
    
    for (const metric of memoryMetrics) {
      try {
        const response = await prometheusApi.get('/api/v1/query', {
          params: { query: `${metric}{instance="${instance}"}` }
        });
        
        if (response.data.data.result.length > 0) {
          console.log(`✅ ${metric}: Available`, response.data.data.result[0].value);
        } else {
          console.log(`❌ ${metric}: No data`);
        }
      } catch (error) {
        console.log(`❌ ${metric}: Error`, error);
      }
    }

    // 모든 레이블 확인
    const allLabelsResponse = await prometheusApi.get('/api/v1/query', {
      params: { query: 'node_memory_MemTotal_bytes' }
    });
    
    console.log('All available instances with memory metrics:', 
      allLabelsResponse.data.data.result.map((r: any) => r.metric.instance)
    );
    
  } catch (error) {
    console.error('Error checking metrics:', error);
  }
};