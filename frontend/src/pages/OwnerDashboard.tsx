import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, FolderTree, Upload, Plus, List } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';
import ProductForm from '../components/ProductForm';
import ProductList from '../components/ProductList';
import CategoryManagement from '../components/CategoryManagement';
import BulkOperations from '../components/BulkOperations';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [refreshList, setRefreshList] = useState(false);

  useEffect(() => {
    console.log('OwnerDashboard - User:', user);
    if (!user) {
      console.log('OwnerDashboard - No user, navigating to /owner-login');
      navigate('/owner-login');
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    console.log('OwnerDashboard - Logging out');
    await signOut();
    console.log('OwnerDashboard - Navigating to /');
    navigate('/');
  };

  const handleProductSuccess = () => {
    setEditingProduct(null);
    setRefreshList(!refreshList);
    if (activeTab === 'add') {
      setActiveTab('list');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setActiveTab('add');
  };

  const tabs = [
    { id: 'list', label: 'Products', icon: List },
    { id: 'add', label: 'Add Product', icon: Plus },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'bulk', label: 'Import/Export', icon: Upload },
  ];

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'add') {
                    setEditingProduct(null);
                  }
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'list' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">All Products</h2>
                <p className="text-gray-600">Manage your product inventory</p>
              </div>
              <ProductList onEdit={handleEditProduct} onRefresh={refreshList} />
            </div>
          )}

          {activeTab === 'add' && (
            <ProductForm
              editProduct={editingProduct}
              onSuccess={handleProductSuccess}
              onCancel={editingProduct ? () => setEditingProduct(null) : undefined}
            />
          )}

          {activeTab === 'categories' && <CategoryManagement />}

          {activeTab === 'bulk' && <BulkOperations />}
        </div>
      </div>
    </div>
  );
}
