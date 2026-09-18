import { useState, useEffect } from 'react';
import { Edit2, Trash2, AlertCircle } from 'lucide-react';
import { Product } from '../types';
import { apiService } from '../services/apiService';

interface ProductListProps {
  onEdit: (product: Product) => void;
  onRefresh: boolean;
}

export default function ProductList({ onEdit, onRefresh }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [onRefresh]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await apiService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await apiService.deleteProduct(id);
      setProducts(products.filter((p) => p.id !== id));
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {products.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No products found. Add your first product!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start space-x-4">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-grow min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                  <p className="text-sm text-gray-600 truncate">{product.description}</p>
                  <div className="flex items-center flex-wrap gap-2 mt-2 text-sm">
                    <span className="font-semibold text-green-600">₹{product.price}</span>
                    <span className="text-gray-500">Stock: {product.stock_quantity}</span>
                    {product.is_featured && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                        Featured
                      </span>
                    )}
                    {product.is_bestseller && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        Bestseller
                      </span>
                    )}
                    {product.tags && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                        {product.tags}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => onEdit(product)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(product.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this product? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
