import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, Search, X } from 'lucide-react';
import { Product, Category } from '../types';
import ProductCard from '../components/ProductCard';
import { apiService } from '../services/apiService';
import ProductFilters from '../components/ProductFilters';

export default function Products() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>(searchParams.get('tag') || 'all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState('name');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Update state when URL params change
  useEffect(() => {
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    if (tag) setSelectedTag(tag);
    if (search) setSearchQuery(search);
  }, [searchParams]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, selectedTag, sortBy]);

  const loadCategories = async () => {
    try {
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Build filter parameters based on current selection and sorting
      const params: any = {};
      
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      if (selectedTag !== 'all') {
        params.tags = selectedTag;
      }

      // Get products from backend API
      const data = await apiService.getProducts(params);
      
      // Sort products based on selection (backend doesn't handle all sorting yet)
      let sortedProducts = [...data];
      if (sortBy === 'price-low') {
        sortedProducts.sort((a, b) => a.price - b.price);
      } else if (sortBy === 'price-high') {
        sortedProducts.sort((a, b) => b.price - a.price);
      } else if (sortBy === 'rating') {
        sortedProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else {
        sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
      }

      setProducts(sortedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-ayurveda-bg">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col lg:flex-row gap-12">
          <aside className="hidden lg:block lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-ayurveda-light p-8 sticky top-28">
              <div className="flex items-center space-x-3 mb-8 pb-4 border-b border-gray-100">
                <Filter className="w-5 h-5 text-ayurveda-primary" />
                <h2 className="text-xl font-bold text-ayurveda-primary font-heading">Filters</h2>
              </div>
              <ProductFilters
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedTag={selectedTag}
                setSelectedTag={setSelectedTag}
                sortBy={sortBy}
                setSortBy={setSortBy}
                isCategoriesOpen={isCategoriesOpen}
                setIsCategoriesOpen={setIsCategoriesOpen}
                isTagsOpen={isTagsOpen}
                setIsTagsOpen={setIsTagsOpen}
                isSortOpen={isSortOpen}
                setIsSortOpen={setIsSortOpen}
                tags={['Period', 'Sexual', 'Immunity', 'Mind', 'Stomach', 'Lungs', 'Liver', 'Ortho', 'Dental', 'Eyes', 'Piles', 'Baby']}
              />
            </div>
          </aside>

          {/* Mobile Filter Overlay */}
          {isMobileFilterOpen && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-end lg:hidden">
              <div className="w-4/5 max-w-xs bg-white h-full overflow-y-auto p-6 shadow-xl animate-slideInRight">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-ayurveda-primary font-heading">Filters</h2>
                  <button onClick={() => setIsMobileFilterOpen(false)} className="p-2">
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
                <ProductFilters
                  categories={categories}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  selectedTag={selectedTag}
                  setSelectedTag={setSelectedTag}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  isCategoriesOpen={isCategoriesOpen}
                  setIsCategoriesOpen={setIsCategoriesOpen}
                  isTagsOpen={isTagsOpen}
                  setIsTagsOpen={setIsTagsOpen}
                  isSortOpen={isSortOpen}
                  setIsSortOpen={setIsSortOpen}
                  tags={['Period', 'Sexual', 'Immunity', 'Mind', 'Stomach', 'Lungs', 'Liver', 'Ortho', 'Dental', 'Eyes', 'Piles', 'Baby']}
                />
                <button 
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full mt-8 bg-ayurveda-primary text-white py-3 rounded-xl font-bold shadow-lg"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          <main className="flex-1">
            <div className="mb-10 flex gap-4">
              <div className="relative group flex-1">
                <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-ayurveda-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 bg-white border border-ayurveda-light rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-ayurveda-primary focus:border-transparent transition-all duration-300 text-gray-700 placeholder-gray-400 font-body text-lg"
                />
              </div>
              <button 
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden p-4 bg-white border border-ayurveda-light rounded-2xl shadow-sm text-ayurveda-primary hover:bg-ayurveda-bg transition-colors"
                aria-label="Open filters"
              >
                <Filter className="w-6 h-6" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-ayurveda-primary mb-4"></div>
                <p className="text-gray-500 font-medium font-body">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-2xl border border-dashed border-ayurveda-light">
                <div className="bg-ayurveda-bg w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-ayurveda-secondary" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3 font-heading">No products found</h3>
                <p className="text-gray-500 font-body">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                <div className="mb-8 flex items-center justify-between">
                  <p className="text-gray-600 font-medium font-body">
                    Showing <span className="text-ayurveda-primary font-bold">{filteredProducts.length}</span> product{filteredProducts.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onProductClick={(p) => navigate(`/product/${p.id}`)}
                    />
                  ))}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
