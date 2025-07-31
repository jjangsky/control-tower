import React from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { ServerCard } from '../components/ServerCard';
import { queryPrometheus, getServerListWithAlias } from '../utils/prometheus';
import { ServerMetrics } from '../types/prometheus';
import { RefreshCw, Server } from 'lucide-react';

export const MainDashboard: React.FC = () => {
  const { data: serverList, isLoading: isLoadingList, refetch } = useQuery({
    queryKey: ['serverListWithAlias'],
    queryFn: getServerListWithAlias,
    refetchInterval: 30000,
  });

  const serverMetricsQueries = useQueries({
    queries: (serverList || []).map((server) => ({
      queryKey: ['serverMetrics', server.instance],
      queryFn: async (): Promise<ServerMetrics> => {
        const instance = server.instance;
        try {
          // 주요 파티션들의 합계를 계산 (tmpfs 제외)
          const diskQuery = `
            (sum(node_filesystem_size_bytes{instance="${instance}",fstype!~"tmpfs|devtmpfs|iso9660|squashfs"} - node_filesystem_avail_bytes{instance="${instance}",fstype!~"tmpfs|devtmpfs|iso9660|squashfs"}) / 
             sum(node_filesystem_size_bytes{instance="${instance}",fstype!~"tmpfs|devtmpfs|iso9660|squashfs"}) * 100)
          `;
          
          const [cpuResult, memResult, diskResult, uptimeResult, networkInResult, networkOutResult,
                 memTotalResult, memAvailResult, diskSizeResult, diskUsedResult] = await Promise.all([
            queryPrometheus(`100 - (avg(irate(node_cpu_seconds_total{instance="${instance}",mode="idle"}[5m])) * 100)`),
            queryPrometheus(`(1 - (node_memory_MemAvailable_bytes{instance="${instance}"} / node_memory_MemTotal_bytes{instance="${instance}"})) * 100`),
            queryPrometheus(diskQuery),
            queryPrometheus(`node_time_seconds{instance="${instance}"} - node_boot_time_seconds{instance="${instance}"}`),
            queryPrometheus(`rate(node_network_receive_bytes_total{instance="${instance}",device!="lo"}[5m])`),
            queryPrometheus(`rate(node_network_transmit_bytes_total{instance="${instance}",device!="lo"}[5m])`),
            queryPrometheus(`node_memory_MemTotal_bytes{instance="${instance}"}`),
            queryPrometheus(`node_memory_MemAvailable_bytes{instance="${instance}"}`),
            queryPrometheus(`sum(node_filesystem_size_bytes{instance="${instance}",fstype!~"tmpfs|devtmpfs|iso9660|squashfs"})`),
            queryPrometheus(`sum(node_filesystem_size_bytes{instance="${instance}",fstype!~"tmpfs|devtmpfs|iso9660|squashfs"} - node_filesystem_avail_bytes{instance="${instance}",fstype!~"tmpfs|devtmpfs|iso9660|squashfs"})`),
          ]);

          const cpu = cpuResult.data.result[0]?.value[1] ? parseFloat(cpuResult.data.result[0].value[1]) : 0;
          const memory = memResult.data.result[0]?.value[1] ? parseFloat(memResult.data.result[0].value[1]) : 0;
          const disk = diskResult.data.result[0]?.value[1] ? parseFloat(diskResult.data.result[0].value[1]) : 0;
          const uptime = uptimeResult.data.result[0]?.value[1] ? parseFloat(uptimeResult.data.result[0].value[1]) : 0;
          const networkIn = networkInResult.data.result[0]?.value[1] ? parseFloat(networkInResult.data.result[0].value[1]) : 0;
          const networkOut = networkOutResult.data.result[0]?.value[1] ? parseFloat(networkOutResult.data.result[0].value[1]) : 0;
          
          const memoryTotal = memTotalResult.data.result[0]?.value[1] ? parseFloat(memTotalResult.data.result[0].value[1]) : 0;
          const memoryAvail = memAvailResult.data.result[0]?.value[1] ? parseFloat(memAvailResult.data.result[0].value[1]) : 0;
          const memoryUsed = memoryTotal - memoryAvail;
          
          const diskTotal = diskSizeResult.data.result[0]?.value[1] ? parseFloat(diskSizeResult.data.result[0].value[1]) : 0;
          const diskUsed = diskUsedResult.data.result[0]?.value[1] ? parseFloat(diskUsedResult.data.result[0].value[1]) : 0;

          let status: 'online' | 'offline' | 'warning' = 'online';
          if (cpu > 90 || memory > 90 || disk > 90) {
            status = 'warning';
          }

          return {
            hostname: instance,
            alias: server.alias,
            status,
            cpu,
            memory,
            memoryTotal,
            memoryUsed,
            disk,
            diskTotal,
            diskUsed,
            network: {
              in: networkIn,
              out: networkOut,
            },
            uptime,
            lastUpdate: new Date(),
          };
        } catch (error) {
          return {
            hostname: instance,
            alias: server.alias,
            status: 'offline',
            cpu: 0,
            memory: 0,
            disk: 0,
            network: { in: 0, out: 0 },
            uptime: 0,
            lastUpdate: new Date(),
          };
        }
      },
      refetchInterval: 30000, // 30초마다 갱신
    })),
  });

  const isLoadingMetrics = serverMetricsQueries.some(query => query.isLoading);
  const serverMetrics = serverMetricsQueries.map(query => query.data).filter(Boolean) as ServerMetrics[];

  const totalServers = serverMetrics.length;
  const onlineServers = serverMetrics.filter(s => s.status === 'online').length;
  const warningServers = serverMetrics.filter(s => s.status === 'warning').length;
  const offlineServers = serverMetrics.filter(s => s.status === 'offline').length;

  if (isLoadingList) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">서버 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">서버 관제탑</h1>
              <p className="text-gray-600 mt-2">실시간 서버 상태 모니터링</p>
            </div>
            <button
              onClick={() => {
                refetch();
                serverMetricsQueries.forEach(query => query.refetch());
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">전체 서버</p>
                  <p className="text-2xl font-bold text-gray-900">{totalServers}</p>
                </div>
                <Server className="w-8 h-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">정상</p>
                  <p className="text-2xl font-bold text-green-600">{onlineServers}</p>
                </div>
                <div className="w-8 h-8 bg-green-500 rounded-full"></div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">경고</p>
                  <p className="text-2xl font-bold text-yellow-600">{warningServers}</p>
                </div>
                <div className="w-8 h-8 bg-yellow-500 rounded-full"></div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">오프라인</p>
                  <p className="text-2xl font-bold text-red-600">{offlineServers}</p>
                </div>
                <div className="w-8 h-8 bg-red-500 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {isLoadingMetrics ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">서버 메트릭을 불러오는 중...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serverMetrics.map((metrics) => (
              <ServerCard key={metrics.hostname} metrics={metrics} />
            ))}
          </div>
        )}

        {serverMetrics.length === 0 && !isLoadingMetrics && (
          <div className="text-center py-12">
            <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">모니터링 중인 서버가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};