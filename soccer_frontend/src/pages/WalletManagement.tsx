import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SweepSummary {
  pending_sweeps: number;
  completed_sweeps: number;
  pending_by_asset: Record<string, {
    count: number;
    total_amount: number;
    total_value_usd: number;
  }>;
  total_pending_value_usd: number;
}

interface PendingDeposit {
  id: number;
  user_id: number;
  asset: string;
  network: string;
  deposit_address: string;
  memo?: string;
  total_amount: number;
  total_value_usd: number;
  confirmations: number;
  required_confirmations: number;
  created_at: string;
  updated_at: string;
  transactions: Array<{
    tx_hash: string;
    amount_crypto: number;
    amount_usd: number;
    confirmations: number;
    status: string;
    created_at: string;
  }>;
}

const WalletManagement: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [sweepSummary, setSweepSummary] = useState<SweepSummary | null>(null);
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchSweepSummary();
      fetchPendingDeposits();
    }
  }, [isAuthenticated]);

  const fetchSweepSummary = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/wallet/sweep-summary');
      if (response.ok) {
        const data = await response.json();
        setSweepSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch sweep summary:', error);
    }
  };

  const fetchPendingDeposits = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/wallet/pending-deposits?limit=20');
      if (response.ok) {
        const data = await response.json();
        setPendingDeposits(data.deposits);
      }
    } catch (error) {
      console.error('Failed to fetch pending deposits:', error);
    }
  };

  const triggerSweep = async (asset?: string, network?: string) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let url = 'http://localhost:5001/api/wallet/sweep-all';
      if (asset && network) {
        url = `http://localhost:5001/api/wallet/sweep/${asset}/${network}`;
      }

      const response = await fetch(url, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message);
        // Refresh data after a short delay
        setTimeout(() => {
          fetchSweepSummary();
          fetchPendingDeposits();
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to trigger sweep');
      }
    } catch (error) {
      setError('Failed to trigger sweep');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatCrypto = (amount: number, asset: string) => {
    const decimals = asset === 'BTC' ? 8 : asset === 'ETH' ? 6 : 2;
    return `${amount.toFixed(decimals)} ${asset}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p>Please sign in to access wallet management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Wallet Management</h1>
          <p className="text-gray-400">Manage crypto deposits and automatic fund aggregation</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
            <p className="text-green-400">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Sweep Summary */}
        {sweepSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Pending Sweeps</h3>
              <div className="text-3xl font-bold text-yellow-400">
                {sweepSummary.pending_sweeps}
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {formatCurrency(sweepSummary.total_pending_value_usd)} total value
              </p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Completed Sweeps</h3>
              <div className="text-3xl font-bold text-green-400">
                {sweepSummary.completed_sweeps}
              </div>
              <p className="text-gray-400 text-sm mt-1">Successfully processed</p>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => triggerSweep()}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {loading ? 'Sweeping...' : 'Sweep All Assets'}
                </button>
                <button
                  onClick={() => {
                    fetchSweepSummary();
                    fetchPendingDeposits();
                  }}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Deposits by Asset */}
        {sweepSummary?.pending_by_asset && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Pending Deposits by Asset</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(sweepSummary.pending_by_asset).map(([asset, data]) => (
                <div key={asset} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">{asset}</h3>
                    <button
                      onClick={() => triggerSweep(asset)}
                      disabled={loading}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                    >
                      Sweep
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Count:</span>
                      <span className="font-medium">{data.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Amount:</span>
                      <span className="font-medium">{formatCrypto(data.total_amount, asset)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Value:</span>
                      <span className="font-medium">{formatCurrency(data.total_value_usd)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Deposits Table */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Recent Pending Deposits</h2>
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Asset</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Network</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Value</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Confirmations</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Address</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {pendingDeposits.map((deposit) => (
                    <tr key={deposit.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm">{deposit.id}</td>
                      <td className="px-4 py-3 text-sm">{deposit.user_id}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                          {deposit.asset}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{deposit.network}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {formatCrypto(deposit.total_amount, deposit.asset)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {formatCurrency(deposit.total_value_usd)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          deposit.confirmations >= deposit.required_confirmations
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {deposit.confirmations}/{deposit.required_confirmations}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-400">
                        {deposit.deposit_address.substring(0, 10)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {new Date(deposit.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Information Panel */}
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-3">How It Works</h3>
          <div className="space-y-2 text-sm text-blue-300">
            <p>• <strong>Individual Addresses:</strong> Each user gets a unique deposit address</p>
            <p>• <strong>Automatic Detection:</strong> System monitors blockchain for incoming transactions</p>
            <p>• <strong>Confirmation Tracking:</strong> Waits for required confirmations before sweeping</p>
            <p>• <strong>Auto-Sweep:</strong> Transfers funds to your main wallet automatically</p>
            <p>• <strong>User Credit:</strong> Credits user account after successful sweep</p>
            <p>• <strong>Manual Override:</strong> You can manually trigger sweeps anytime</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletManagement;
