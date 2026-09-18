import { useState } from 'react';
import { Download, Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';

export default function BulkOperations() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError('');
    setSuccess('');

    try {
      const products = await apiService.getProducts();

      if (!products || products.length === 0) {
        setError('No products to export');
        return;
      }

      // Convert to CSV
      const headers = [
        'name',
        'category_id',
        'description',
        'price',
        'original_price',
        'image_url',
        'images',
        'ingredients',
        'benefits',
        'how_to_use',
        'stock_quantity',
        'is_featured',
        'is_bestseller',
      ];

      const csvContent = [
        headers.join(','),
        ...products.map((product: any) =>
          headers
            .map((header) => {
              let value = product[header];
              if (header === 'images' && Array.isArray(value)) {
                value = value.join('|');
              }
              // Escape quotes and wrap in quotes if contains comma
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                value = `"${value.replace(/"/g, '""')}"`;
              }
              return value !== null && value !== undefined ? value : '';
            })
            .join(',')
        ),
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `products-export-${Date.now()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccess(`Successfully exported ${products.length} products!`);
    } catch (err: any) {
      setError(err.message || 'Failed to export products');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError('');
    setSuccess('');
    setImportResults(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        throw new Error('CSV file is empty or invalid');
      }

      const headers = lines[0].split(',').map((h) => h.trim());
      const products = [];
      const errors: string[] = [];
      let successCount = 0;
      let failedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].split(',');
          const product: any = {};

          headers.forEach((header, index) => {
            let value = values[index]?.trim() || '';
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1).replace(/""/g, '"');
            }
            product[header] = value;
          });

          // Validate required fields
          if (!product.name || !product.price) {
            errors.push(`Line ${i + 1}: Missing required fields (name, price)`);
            failedCount++;
            continue;
          }

          // Generate slug
          const slug = product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

          // Parse images
          let imagesArray = [];
          if (product.images && typeof product.images === 'string') {
            imagesArray = product.images.split('|').filter((img: string) => img.trim());
          }
          if (product.image_url && !imagesArray.includes(product.image_url)) {
            imagesArray.unshift(product.image_url);
          }

          const productData = {
            name: product.name,
            slug,
            category_id: product.category_id || null,
            description: product.description || '',
            price: parseFloat(product.price) || 0,
            original_price: product.original_price ? parseFloat(product.original_price) : null,
            image_url: product.image_url || '',
            images: imagesArray,
            ingredients: product.ingredients || '',
            benefits: product.benefits || '',
            how_to_use: product.how_to_use || '',
            stock_quantity: parseInt(product.stock_quantity) || 0,
            is_featured: product.is_featured === 'true' || product.is_featured === '1',
            is_bestseller: product.is_bestseller === 'true' || product.is_bestseller === '1',
            rating: 5.0,
          };

          products.push(productData);
        } catch (err: any) {
          errors.push(`Line ${i + 1}: ${err.message}`);
          failedCount++;
        }
      }

      // Insert products in bulk
      if (products.length > 0) {
        await apiService.bulkCreateProducts(products);
        successCount = products.length;
      }

      setImportResults({ success: successCount, failed: failedCount, errors });

      if (successCount > 0) {
        setSuccess(`Successfully imported ${successCount} products!`);
      }

      if (failedCount > 0) {
        setError(`Failed to import ${failedCount} products. See details below.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to import products');
    } finally {
      setImporting(false);
      // Reset file input
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Bulk Operations</h2>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Import Results */}
      {importResults && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Import Results</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Successfully imported:</span>
              <span className="font-semibold text-green-600">{importResults.success}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Failed:</span>
              <span className="font-semibold text-red-600">{importResults.failed}</span>
            </div>

            {importResults.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Errors:</h4>
                <div className="bg-red-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {importResults.errors.map((err, index) => (
                    <p key={index} className="text-sm text-red-800 mb-1">
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="bg-green-50 p-3 rounded-lg">
            <Download className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-grow">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Export Products</h3>
            <p className="text-gray-600 mb-4">
              Download all your products as a CSV file. This file can be edited and re-imported.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              <span>{exporting ? 'Exporting...' : 'Export to CSV'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Import Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-grow">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Import Products</h3>
            <p className="text-gray-600 mb-4">
              Upload a CSV file to add multiple products at once. Use the exported file format as a
              template.
            </p>
            <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer inline-flex disabled:opacity-50">
              <Upload className="w-5 h-5" />
              <span>{importing ? 'Importing...' : 'Import from CSV'}</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">CSV Format Instructions</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Required fields: name, price</li>
              <li>For multiple images, separate URLs with | (pipe) character</li>
              <li>Boolean fields (is_featured, is_bestseller): use true/false or 1/0</li>
              <li>First row must contain headers</li>
              <li>Export a file first to see the correct format</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Template Download */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="bg-purple-50 p-3 rounded-lg">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-grow">
            <h3 className="text-lg font-bold text-gray-900 mb-2">CSV Template</h3>
            <p className="text-gray-600 mb-4">
              Download a sample CSV template to see the correct format for importing products.
            </p>
            <button
              onClick={() => {
                const template = `name,category_id,description,price,original_price,image_url,images,ingredients,benefits,how_to_use,stock_quantity,is_featured,is_bestseller
Sample Product,,Full product description here,299.99,399.99,https://example.com/image.jpg,https://example.com/img1.jpg|https://example.com/img2.jpg,List of ingredients,Health benefits,Usage instructions,100,false,false`;
                
                const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'product-template.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <Download className="w-5 h-5" />
              <span>Download Template</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
