import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Cpu, Activity, HardDrive, Wifi, Clock } from 'lucide-react';
import { useServerMetrics, useMetricHistory } from '../hooks/usePrometheus';
import { MetricChart } from '../components/MetricChart';
import { formatUptime, formatBytes } from '../utils/prometheus';

export const ServerDetail: React.FC = () => {
  const { hostname } = useParams<{ hostname: string }>();
  const [timeRange, setTimeRange] = useState('1h');
  
  const decodedHostname = decodeURIComponent(hostname || '');
  
  
  const { data: metrics, isLoading: isLoadingMetrics, refetch: refetchMetrics } = useServerMetrics(decodedHostname);
  
  const { data: cpuHistory } = useMetricHistory(
    decodedHostname,
    `100 - (avg(irate(node_cpu_seconds_total{instance="INSTANCE",mode="idle"}[5m])) * 100)`,
    timeRange
  );
  
  const memQuery = `(1 - (node_memory_MemAvailable_bytes{instance="INSTANCE"} / node_memory_MemTotal_bytes{instance="INSTANCE"})) * 100`;
  
  const { data: memHistory, error: memError, isLoading: memLoading } = useMetricHistory(
    decodedHostname,
    memQuery,
    timeRange
  );
  
  
  const { data: networkInHistory } = useMetricHistory(
    decodedHostname,
    `rate(node_network_receive_bytes_total{instance="INSTANCE",device!="lo"}[5m])`,
    timeRange
  );
  
  const { data: networkOutHistory } = useMetricHistory(
    decodedHostname,
    `rate(node_network_transmit_bytes_total{instance="INSTANCE",device!="lo"}[5m])`,
    timeRange
  );

  const formatChartData = (data: any) => {
    if (!data?.data?.result || data.data.result.length === 0) {
      return [];
    }
    
    // 여러 결과가 있을 경우 첫 번째 결과 사용
    const result = data.data.result[0];
    if (!result?.values || result.values.length === 0) {
      return [];
    }
    
    const formatted = result.values.map(([time, value]: [number, string]) => ({
      time,
      value: parseFloat(value),
    }));
    
    return formatted;
  };

  const formatNetworkData = (data: any) => {
    if (!data?.data?.result || data.data.result.length === 0) return [];
    
    // 여러 결과가 있을 경우 첫 번째 결과 사용
    const result = data.data.result[0];
    if (!result?.values || result.values.length === 0) return [];
    
    return result.values.map(([time, value]: [number, string]) => ({
      time,
      value: parseFloat(value) / 1024 / 1024, // Convert to MB/s
    }));
  };

  if (isLoadingMetrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">서버 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">서버를 찾을 수 없습니다.</p>
          <Link to="/" className="text-blue-500 hover:underline mt-2 inline-block">
            메인으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>뒤로가기</span>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{metrics?.alias || decodedHostname}</h1>
                {metrics?.alias && <p className="text-gray-500 text-sm">{decodedHostname}</p>}
                <p className="text-gray-600 mt-1">서버 상세 모니터링</p>
              </div>
            </div>
            <button
              onClick={() => refetchMetrics()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${metrics.cpu > 90 ? 'bg-red-100' : metrics.cpu > 70 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                  <Cpu className={`w-6 h-6 ${metrics.cpu > 90 ? 'text-red-600' : metrics.cpu > 70 ? 'text-yellow-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">CPU 사용률</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.cpu.toFixed(1)}%</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${metrics.memory > 90 ? 'bg-red-100' : metrics.memory > 70 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                  <Activity className={`w-6 h-6 ${metrics.memory > 90 ? 'text-red-600' : metrics.memory > 70 ? 'text-yellow-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">메모리 사용률</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.memory.toFixed(1)}%</p>
                  {metrics.memoryUsed && metrics.memoryTotal && (
                    <p className="text-sm text-gray-500">
                      {formatBytes(metrics.memoryUsed)} / {formatBytes(metrics.memoryTotal)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${metrics.disk > 90 ? 'bg-red-100' : metrics.disk > 70 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                  <HardDrive className={`w-6 h-6 ${metrics.disk > 90 ? 'text-red-600' : metrics.disk > 70 ? 'text-yellow-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">디스크 사용률</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.disk.toFixed(1)}%</p>
                  {metrics.diskUsed && metrics.diskTotal && (
                    <p className="text-sm text-gray-500">
                      {formatBytes(metrics.diskUsed)} / {formatBytes(metrics.diskTotal)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">업타임</p>
                  <p className="text-2xl font-bold text-gray-900">{formatUptime(metrics.uptime)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            {['1h', '6h', '24h', '7d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {range === '1h' && '1시간'}
                {range === '6h' && '6시간'}
                {range === '24h' && '24시간'}
                {range === '7d' && '7일'}
              </button>
            ))}
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cpuHistory && (
            <MetricChart
              data={formatChartData(cpuHistory)}
              title="CPU 사용률"
              color="#3B82F6"
            />
          )}

          {memHistory && (
            <MetricChart
              data={formatChartData(memHistory)}
              title="메모리 사용률"
              color="#10B981"
            />
          )}
          
          {!memHistory && (
            <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center h-[300px]">
              <p className="text-gray-500">메모리 데이터를 불러올 수 없습니다</p>
            </div>
          )}

          {networkInHistory && (
            <MetricChart
              data={formatNetworkData(networkInHistory)}
              title="네트워크 수신"
              unit=" MB/s"
              color="#8B5CF6"
            />
          )}

          {networkOutHistory && (
            <MetricChart
              data={formatNetworkData(networkOutHistory)}
              title="네트워크 송신"
              unit=" MB/s"
              color="#F59E0B"
            />
          )}
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">네트워크 상태</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Wifi className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700">다운로드</span>
              </div>
              <span className="font-medium text-gray-900">
                {formatBytes(metrics.network.in)} /s
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Wifi className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">업로드</span>
              </div>
              <span className="font-medium text-gray-900">
                {formatBytes(metrics.network.out)} /s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};