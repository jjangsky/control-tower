import { prometheusApi } from './prometheus';

export const testPrometheusQueries = async () => {
  console.log('=== Prometheus 메트릭 테스트 시작 ===');
  
  try {
    // 1. 모든 메트릭 이름 확인
    const labelsResponse = await prometheusApi.get('/api/v1/label/__name__/values');
    const allMetrics = labelsResponse.data.data;
    const memoryMetrics = allMetrics.filter((m: string) => m.includes('memory'));
    console.log('사용 가능한 메모리 메트릭:', memoryMetrics);
    
    // 2. node_memory_MemTotal_bytes 확인 (가장 기본적인 메트릭)
    const memTotalResponse = await prometheusApi.get('/api/v1/query', {
      params: { query: 'node_memory_MemTotal_bytes' }
    });
    console.log('node_memory_MemTotal_bytes 결과:', memTotalResponse.data);
    if (memTotalResponse.data.data.result.length > 0) {
      console.log('첫 번째 결과의 인스턴스:', memTotalResponse.data.data.result[0].metric.instance);
      console.log('첫 번째 결과의 전체 메트릭:', memTotalResponse.data.data.result[0].metric);
    }
    
    // 3. 모든 인스턴스 확인
    const instancesResponse = await prometheusApi.get('/api/v1/label/instance/values');
    console.log('사용 가능한 인스턴스:', instancesResponse.data.data);
    
    // 4. up 메트릭으로 활성 타겟 확인
    const upResponse = await prometheusApi.get('/api/v1/query', {
      params: { query: 'up' }
    });
    console.log('활성 타겟 (up 메트릭):', upResponse.data.data.result);
    
    // 5. 메모리 사용률 계산 테스트 (다양한 방법)
    const queries = [
      'node_memory_MemTotal_bytes - node_memory_MemFree_bytes',
      'node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes',
      '(node_memory_MemTotal_bytes - node_memory_MemFree_bytes - node_memory_Buffers_bytes - node_memory_Cached_bytes) / node_memory_MemTotal_bytes * 100'
    ];
    
    for (const query of queries) {
      try {
        const response = await prometheusApi.get('/api/v1/query', {
          params: { query }
        });
        console.log(`쿼리 "${query}" 결과:`, response.data.data.result.length > 0 ? '데이터 있음' : '데이터 없음');
      } catch (err) {
        console.log(`쿼리 "${query}" 실패:`, err);
      }
    }
    
    // 6. 시계열 데이터 테스트
    const now = Math.floor(Date.now() / 1000);
    const oneHourAgo = now - 3600;
    
    console.log('=== 시계열 데이터 테스트 ===');
    const rangeResponse = await prometheusApi.get('/api/v1/query_range', {
      params: { 
        query: 'node_memory_MemTotal_bytes',
        start: oneHourAgo,
        end: now,
        step: 60
      }
    });
    console.log('시계열 쿼리 결과 개수:', rangeResponse.data.data.result.length);
    if (rangeResponse.data.data.result.length > 0) {
      console.log('시계열 데이터 포인트 개수:', rangeResponse.data.data.result[0].values.length);
      console.log('시계열 인스턴스:', rangeResponse.data.data.result[0].metric.instance);
    }
    
  } catch (error) {
    console.error('테스트 중 오류:', error);
  }
};