import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CreditCard, TrendingUp, DollarSign, AlertCircle, Check, X, Clock } from 'lucide-react';

interface PaymentStats {
  totalOrders: number;
  totalRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  codOrders: number;
  averageOrderValue: number;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  payment_id?: string;
  razorpay_signature?: string;
  payment_completed_at?: string;
  payment_failure_reason?: string;
  created_at: string;
  user_id: string;
  phone: string;
}

export default function PaymentDashboard() {
  const [stats, setStats] = useState<PaymentStats>({
    totalOrders: 0,
    totalRevenue: 0,
    successfulPayments: 0,
    failedPayments: 0,
    pendingPayments: 0,
    codOrders: 0,
    averageOrderValue: 0,
  });
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      // Fetch all orders with payment details
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(ordersData || []);

      // Calculate statistics
      const totalOrders = ordersData?.length || 0;
      const totalRevenue = ordersData?.reduce((sum, order) => 
        order.payment_status === 'paid' ? sum + Number(order.total_amount) : sum, 0
      ) || 0;
      
      const successfulPayments = ordersData?.filter(order => order.payment_status === 'paid').length || 0;
      const failedPayments = ordersData?.filter(order => order.payment_status === 'failed').length || 0;
      const pendingPayments = ordersData?.filter(order => order.payment_status === 'pending').length || 0;
      const codOrders = ordersData?.filter(order => order.payment_method === 'cod').length || 0;
      
      const averageOrderValue = totalOrders > 0 ? totalRevenue / successfulPayments : 0;

      setStats({
        totalOrders,
        totalRevenue,
        successfulPayments,
        failedPayments,
        pendingPayments,
        codOrders,
        averageOrderValue,
      });

    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'online') return order.payment_method === 'razorpay';
    if (filter === 'cod') return order.payment_method === 'cod';
    return order.payment_status === filter;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-md">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Dashboard</h1>
        <p className="text-gray-600">Track all payment transactions and order details</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <CreditCard className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Successful Payments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.successfulPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.averageOrderValue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Failed Payments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.failedPayments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Orders', count: stats.totalOrders },
              { key: 'paid', label: 'Paid', count: stats.successfulPayments },
              { key: 'pending', label: 'Pending', count: stats.pendingPayments },
              { key: 'failed', label: 'Failed', count: stats.failedPayments },
              { key: 'online', label: 'Online', count: stats.successfulPayments },
              { key: 'cod', label: 'COD', count: stats.codOrders },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {order.order_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        Phone: {order.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ₹{Number(order.total_amount).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.payment_status)}`}>
                      {getStatusIcon(order.payment_status)}
                      <span className="ml-1 capitalize">{order.payment_status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">
                      {order.payment_method === 'razorpay' ? 'Online' : order.payment_method.toUpperCase()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 font-mono">
                      {order.payment_id ? (
                        <span title={order.payment_id}>
                          {order.payment_id.substring(0, 12)}...
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No orders found for the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}