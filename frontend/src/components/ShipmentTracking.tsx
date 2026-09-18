import React, { useState, useEffect } from 'react';
import { bigshipService, type TrackingData } from '../services/bigshipService';

interface ShipmentTrackingProps {
  trackingId?: string;
  trackingType?: 'awb' | 'lrn';
  orderId?: string;
}

const ShipmentTracking: React.FC<ShipmentTrackingProps> = ({
  trackingId: initialTrackingId,
  trackingType = 'awb',
  orderId,
}) => {
  const [trackingId, setTrackingId] = useState(initialTrackingId || '');
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTrackingId) {
      trackShipment(initialTrackingId);
    } else if (orderId) {
      loadShipmentByOrder();
    }
  }, [initialTrackingId, orderId]);

  const loadShipmentByOrder = async () => {
    if (!orderId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const shipment = await bigshipService.getShipmentByOrder(orderId);
      if (shipment.awb_number) {
        setTrackingId(shipment.awb_number);
        await trackShipment(shipment.awb_number);
      } else {
        setError('Shipment not yet assigned to courier');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load shipment details');
    } finally {
      setLoading(false);
    }
  };

  const trackShipment = async (id?: string) => {
    const idToTrack = id || trackingId;
    if (!idToTrack) {
      setError('Please enter a tracking ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await bigshipService.trackShipment(idToTrack, trackingType);
      setTrackingData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tracking information');
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered')) return 'text-green-600';
    if (statusLower.includes('out for delivery')) return 'text-blue-600';
    if (statusLower.includes('transit')) return 'text-yellow-600';
    if (statusLower.includes('pickup')) return 'text-purple-600';
    if (statusLower.includes('cancel') || statusLower.includes('rto')) return 'text-red-600';
    return 'text-gray-600';
  };

  const getStatusIcon = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered')) return '✓';
    if (statusLower.includes('out for delivery')) return '🚚';
    if (statusLower.includes('transit')) return '📦';
    if (statusLower.includes('pickup')) return '📋';
    if (statusLower.includes('cancel')) return '✗';
    return '•';
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Track Your Shipment</h2>

        {/* Tracking Input */}
        {!initialTrackingId && !orderId && (
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Enter AWB or LRN number"
                className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => trackShipment()}
                disabled={loading || !trackingId}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Tracking...' : 'Track'}
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Tracking Data */}
        {trackingData && !loading && (
          <div className="space-y-6">
            {/* Current Status Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Tracking ID</p>
                  <p className="font-bold">{trackingData.order_detail.tracking_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Courier</p>
                  <p className="font-bold">{trackingData.order_detail.courier_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order ID</p>
                  <p className="font-bold">{trackingData.order_detail.invoice_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Status</p>
                  <p className={`font-bold ${getStatusColor(trackingData.order_detail.current_tracking_status)}`}>
                    {trackingData.order_detail.current_tracking_status}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="font-medium">{trackingData.order_detail.current_tracking_datetime}</p>
              </div>
            </div>

            {/* Tracking Timeline */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Shipment History</h3>
              
              {trackingData.scan_histories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No tracking history available yet</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                  
                  {/* Timeline Events */}
                  <div className="space-y-6">
                    {trackingData.scan_histories.map((event, index) => (
                      <div key={index} className="relative flex gap-4">
                        {/* Timeline Dot */}
                        <div className={`flex-shrink-0 w-16 h-16 rounded-full border-4 border-white shadow-md flex items-center justify-center text-2xl z-10 ${
                          index === 0 ? 'bg-blue-500' : 'bg-gray-400'
                        }`}>
                          <span className="text-white">
                            {getStatusIcon(event.scan_status)}
                          </span>
                        </div>
                        
                        {/* Event Details */}
                        <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className={`font-semibold ${getStatusColor(event.scan_status)}`}>
                              {event.scan_status}
                            </h4>
                            <span className="text-sm text-gray-500">
                              {event.scan_datetime}
                            </span>
                          </div>
                          
                          <p className="text-gray-700 mb-1">{event.scan_remarks}</p>
                          
                          {event.scan_location && (
                            <p className="text-sm text-gray-500">
                              📍 {event.scan_location}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> Tracking information is updated in real-time by the courier partner. 
                If you don't see recent updates, please check back later.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShipmentTracking;
