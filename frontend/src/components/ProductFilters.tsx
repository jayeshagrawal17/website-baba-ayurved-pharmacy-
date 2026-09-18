import { Category } from '../types';

interface ProductFiltersProps {
  categories: Category[];
  selectedCategory: string;
  setSelectedCategory: (id: string) => void;
  selectedTag: string;
  setSelectedTag: (tag: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  isCategoriesOpen: boolean;
  setIsCategoriesOpen: (isOpen: boolean) => void;
  isTagsOpen: boolean;
  setIsTagsOpen: (isOpen: boolean) => void;
  isSortOpen: boolean;
  setIsSortOpen: (isOpen: boolean) => void;
  tags?: string[];
}

export default function ProductFilters({
  categories,
  selectedCategory,
  setSelectedCategory,
  selectedTag,
  setSelectedTag,
  sortBy,
  setSortBy,
  isCategoriesOpen,
  setIsCategoriesOpen,
  isTagsOpen,
  setIsTagsOpen,
  isSortOpen,
  setIsSortOpen,
  tags = ['Period', 'Sexual', 'Immunity', 'Mind', 'Stomach', 'Lungs', 'Liver', 'Ortho', 'Dental', 'Eyes', 'Piles', 'Baby']
}: ProductFiltersProps) {

  return (
    <div className="space-y-10 animate-fadeIn">
      <div>
        <div 
          className="flex items-center justify-between cursor-pointer mb-5 pb-3 border-b border-gray-100"
          onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
        >
          <h3 className="font-bold text-gray-900 text-sm uppercase tracking-widest font-body">Categories</h3>
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${isCategoriesOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {isCategoriesOpen && (
        <div className="space-y-4">
          <label className="flex items-center space-x-3 cursor-pointer group">
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedCategory === 'all' ? 'border-ayurveda-primary bg-ayurveda-primary' : 'border-gray-300 group-hover:border-ayurveda-secondary'}`}>
              {selectedCategory === 'all' && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
            <input
              type="radio"
              name="category"
              checked={selectedCategory === 'all'}
              onChange={() => setSelectedCategory('all')}
              className="hidden"
            />
            <span className={`text-sm transition-colors font-body ${selectedCategory === 'all' ? 'text-ayurveda-primary font-bold' : 'text-gray-600 group-hover:text-ayurveda-primary'}`}>All Products</span>
          </label>
          {categories.map((category) => (
            <label key={category.id} className="flex items-center space-x-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedCategory === category.id ? 'border-ayurveda-primary bg-ayurveda-primary' : 'border-gray-300 group-hover:border-ayurveda-secondary'}`}>
                {selectedCategory === category.id && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <input
                type="radio"
                name="category"
                checked={selectedCategory === category.id}
                onChange={() => setSelectedCategory(category.id)}
                className="hidden"
              />
              <span className={`text-sm transition-colors font-body ${selectedCategory === category.id ? 'text-ayurveda-primary font-bold' : 'text-gray-600 group-hover:text-ayurveda-primary'}`}>{category.name}</span>
            </label>
          ))}
        </div>
        )}
      </div>

      <div>
        <div 
          className="flex items-center justify-between cursor-pointer mb-5 pb-3 border-b border-gray-100"
          onClick={() => setIsTagsOpen(!isTagsOpen)}
        >
          <h3 className="font-bold text-gray-900 text-sm uppercase tracking-widest font-body">Health Concern</h3>
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${isTagsOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {isTagsOpen && (
        <div className="space-y-4">
          <label className="flex items-center space-x-3 cursor-pointer group">
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedTag === 'all' ? 'border-ayurveda-primary bg-ayurveda-primary' : 'border-gray-300 group-hover:border-ayurveda-secondary'}`}>
              {selectedTag === 'all' && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
            <input
              type="radio"
              name="tag"
              checked={selectedTag === 'all'}
              onChange={() => setSelectedTag('all')}
              className="hidden"
            />
            <span className={`text-sm transition-colors font-body ${selectedTag === 'all' ? 'text-ayurveda-primary font-bold' : 'text-gray-600 group-hover:text-ayurveda-primary'}`}>All Concerns</span>
          </label>
          {tags.map((tag) => (
            <label key={tag} className="flex items-center space-x-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedTag === tag ? 'border-ayurveda-primary bg-ayurveda-primary' : 'border-gray-300 group-hover:border-ayurveda-secondary'}`}>
                {selectedTag === tag && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <input
                type="radio"
                name="tag"
                checked={selectedTag === tag}
                onChange={() => setSelectedTag(tag)}
                className="hidden"
              />
              <span className={`text-sm transition-colors font-body ${selectedTag === tag ? 'text-ayurveda-primary font-bold' : 'text-gray-600 group-hover:text-ayurveda-primary'}`}>{tag}</span>
            </label>
          ))}
        </div>
        )}
      </div>

      <div>
        <div 
          className="flex items-center justify-between cursor-pointer mb-5 pb-3 border-b border-gray-100"
          onClick={() => setIsSortOpen(!isSortOpen)}
        >
          <h3 className="font-bold text-gray-900 text-sm uppercase tracking-widest font-body">Sort By</h3>
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${isSortOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {isSortOpen && (
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-5 py-3 bg-ayurveda-bg border border-ayurveda-light rounded-xl focus:outline-none focus:ring-2 focus:ring-ayurveda-primary focus:border-transparent appearance-none text-gray-700 text-sm font-medium cursor-pointer hover:bg-white transition-colors font-body"
          >
            <option value="name">Name (A-Z)</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
