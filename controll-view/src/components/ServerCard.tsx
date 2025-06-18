import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Cpu, HardDrive, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';
import { ServerMetrics } from '../types/prometheus';
import { formatUptime, formatBytes } from '../utils/prometheus';

interface ServerCardProps {
  metrics: ServerMetrics;
}

export const ServerCard: React.FC<ServerCardProps> = ({ metrics }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getMetricColor = (value: number) => {
    if (value >= 90) return 'text-red-600';
    if (value >= 70) return 'text-yellow-600';
    return 'text-gray-700';
  };

  return (
    <Link to={`/server/${encodeURIComponent(metrics.hostname)}`}>
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{metrics.alias || metrics.hostname}</h3>
            <p className="text-sm text-gray-500">{metrics.alias ? metrics.hostname : ''}</p>
            <p className="text-sm text-gray-500">Uptime: {formatUptime(metrics.uptime)}</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-white ${getStatusColor(metrics.status)}`}>
            {getStatusIcon(metrics.status)}
            <span className="text-sm capitalize">{metrics.status}</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-3">
              <div className="flex items-center gap-1 text-gray-600 mb-1">
                <Cpu className="w-4 h-4" />
                <span className="text-xs">CPU</span>
              </div>
              <p className={`text-lg font-semibold ${getMetricColor(metrics.cpu)}`}>
                {metrics.cpu.toFixed(1)}%
              </p>
            </div>

            <div className="col-span-4">
              <div className="flex items-center gap-1 text-gray-600 mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-xs">Memory</span>
              </div>
              <p className={`text-lg font-semibold ${getMetricColor(metrics.memory)}`}>
                {metrics.memory.toFixed(1)}%
              </p>
              {metrics.memoryUsed && metrics.memoryTotal && (
                <p className="text-xs text-gray-500">
                  {formatBytes(metrics.memoryUsed)} / {formatBytes(metrics.memoryTotal)}
                </p>
              )}
            </div>

            <div className="col-span-5">
              <div className="flex items-center gap-1 text-gray-600 mb-1">
                <HardDrive className="w-4 h-4" />
                <span className="text-xs">Disk</span>
              </div>
              <p className={`text-lg font-semibold ${getMetricColor(metrics.disk)}`}>
                {metrics.disk.toFixed(1)}%
              </p>
              {metrics.diskUsed && metrics.diskTotal && (
                <p className="text-xs text-gray-500">
                  {formatBytes(metrics.diskUsed)} / {formatBytes(metrics.diskTotal)}
                </p>
              )}
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Wifi className="w-4 h-4" />
                <span className="text-sm">Network</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-700">↓ {(metrics.network.in / 1024 / 1024).toFixed(2)} MB/s</span>
                <span className="text-gray-700">↑ {(metrics.network.out / 1024 / 1024).toFixed(2)} MB/s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};