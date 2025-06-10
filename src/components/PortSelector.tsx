import React from 'react';
import { WifiIcon, NoSymbolIcon } from '@heroicons/react/24/solid';

interface PortInfo {
  path: string;
}

interface Props {
  ports: PortInfo[];
  portStatus: { status: string; path?: string; message?: string };
  selectedPort: string;
  onPortSelect: (path: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

const PortSelector: React.FC<Props> = ({ ports, portStatus, selectedPort, onPortSelect, onConnect, onDisconnect }) => {
  const isConnected = portStatus.status === 'connected';

  const getStatusIndicator = () => {
    switch (portStatus.status) {
      case 'connected':
        return <span className="w-3 h-3 bg-green-500 rounded-full" title={`Connected to ${portStatus.path}`}></span>;
      case 'error':
        return <span className="w-3 h-3 bg-red-500 rounded-full" title={`Error: ${portStatus.message}`}></span>;
      default:
        return <span className="w-3 h-3 bg-gray-400 rounded-full" title="Disconnected"></span>;
    }
  };

  return (
    <div className="flex items-center gap-3">
      <select
        value={selectedPort}
        onChange={(e) => onPortSelect(e.target.value)}
        disabled={isConnected}
        className="bg-white/50 border border-slate-300 rounded-md text-sm py-1 px-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <option value="">ポートを選択</option>
        {ports.map((port) => (
          <option key={port.path} value={port.path}>
            {port.path}
          </option>
        ))}
      </select>
      {getStatusIndicator()}
      
      {!isConnected ? (
        <button
          onClick={onConnect}
          disabled={!selectedPort}
          className="flex items-center gap-1 text-sm bg-blue-500 text-white font-semibold py-1 px-3 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <WifiIcon className="w-4 h-4" />
          接続
        </button>
      ) : (
        <button
          onClick={onDisconnect}
          className="flex items-center gap-1 text-sm bg-gray-500 text-white font-semibold py-1 px-3 rounded-md hover:bg-gray-600"
        >
          <NoSymbolIcon className="w-4 h-4" />
          切断
        </button>
      )}
    </div>
  );
};

export default PortSelector;