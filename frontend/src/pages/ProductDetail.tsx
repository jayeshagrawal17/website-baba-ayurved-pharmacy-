import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Star, ArrowLeft, ShieldCheck, Heart, Leaf, Plus, Minus, Truck, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { apiService } from '../services/apiService';

// API Base URL from environment variable - remove trailing slash to prevent double slashes
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

interface Review {
  id: string;
  user_id: string;
  user_name?: string;
  reviewer_type?: 'customer' | 'doctor';
  rating: number;
  review: string;
  created_at: string;
  order_id: string;
}

interface ProductDetailProps {}

export default function ProductDetail({}: ProductDetailProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      apiService.getProduct(id)
        .then(data => {
          setProduct(data);
          setSelectedImage(data.image_url);
          setSelectedQuantityOption(
            data.quantity_pricing && data.quantity_pricing.length > 0 ? data.quantity_pricing[0] : null
          );
          setLoading(false);
        })
        .catch(error => {
          console.error('Error loading product:', error);
          setLoading(false);
        });
    }
  }, [id]);

  const [selectedImage, setSelectedImage] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const { addToCart } = useCart();
  const [selectedQuantityOption, setSelectedQuantityOption] = useState<null | any>(
    product?.quantity_pricing && product.quantity_pricing.length > 0 ? product.quantity_pricing[0] : null
  );
  const [expandedSection, setExpandedSection] = useState<string | null>('info'); // Default open first section

  useEffect(() => {
    if (product) {
      fetchReviews();
    }
  }, [product?.id]);

  const fetchReviews = async () => {
    if (!product) return;
    try {
      // Fetch all reviews (no limit parameter to get all)
      const response = await fetch(`${API_BASE_URL}/products/${product.id}/reviews?limit=100`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      
      const data = await response.json();
      console.log('Total reviews fetched:', data.reviews?.length || 0);
      console.log('Should show "Show More" button:', (data.reviews?.length || 0) > 4);
      setReviews(data.reviews || []);
      setAverageRating(data.average_rating || 0);
      setTotalReviews(data.total_reviews || 0);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    await addToCart(product, 1, selectedQuantityOption);
    navigate('/cart');
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Combine main image with additional images, ensuring no duplicates
  const additionalImages = product?.images?.filter(img => img && img !== product.image_url) || [];
  const images = product ? [product.image_url, ...additionalImages].filter(Boolean) : [];
  
  const discount = product?.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-ayurveda-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ayurveda-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-ayurveda-light flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Product not found</p>
          <button
            onClick={() => navigate('/products')}
            className="text-ayurveda-primary hover:text-ayurveda-secondary font-bold"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ayurveda-light pb-24 lg:pb-8 pt-2 lg:pt-4 font-sans">
      <div className="container mx-auto px-2 lg:px-4 max-w-7xl">
        <button
          onClick={() => navigate('/products')}
          className="group inline-flex items-center gap-2 text-[#1A4D2E] hover:text-white hover:bg-[#1A4D2E] transition-all duration-300 mb-6 px-5 py-2.5 rounded-full border border-[#1A4D2E]/20 hover:border-[#1A4D2E] shadow-sm hover:shadow-md bg-white/60 backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
          <span className="font-bold text-sm uppercase tracking-wider">Back to Products</span>
        </button>

        <div className="bg-ayurveda-bg shadow-sm rounded-sm flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left Column - Images & Buttons */}
          <div className="lg:w-[40%] p-4 lg:sticky lg:top-20 h-fit bg-ayurveda-bg">
            <div className="flex flex-col gap-4">
              {/* Image Gallery Area */}
              <div className="flex flex-col-reverse lg:flex-row gap-4 h-auto lg:h-[450px]">
                
                {/* Main Image */}
                <div className="flex-1 flex items-center justify-center relative border border-gray-100 min-h-[300px] bg-ayurveda-bg group">
                  <img 
                    src={selectedImage} 
                    alt={product.name} 
                    className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105" 
                  />
                  
                  {/* Image Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = images.indexOf(selectedImage);
                          const prevIndex = (currentIndex - 1 + images.length) % images.length;
                          setSelectedImage(images[prevIndex]);
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-md hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="w-6 h-6 text-gray-800" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const currentIndex = images.indexOf(selectedImage);
                          const nextIndex = (currentIndex + 1) % images.length;
                          setSelectedImage(images[nextIndex]);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-md hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                        aria-label="Next image"
                      >
                        <ChevronRight className="w-6 h-6 text-gray-800" />
                      </button>
                    </>
                  )}

                  {/* Stock Availability Tag */}
                  {product.stock_quantity !== undefined && (
                    <div className={`absolute bottom-2 left-2 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-md ${
                      product.stock_quantity > 0 ? 'bg-sky-500' : 'bg-red-600'
                    }`}>
                      {product.stock_quantity > 0 ? `In Stock (${product.stock_quantity})` : 'Out of Stock'}
                    </div>
                  )}
                  {images.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                      {images.indexOf(selectedImage) + 1} / {images.length}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons - Desktop */}
              <div className="hidden lg:flex gap-3 mt-4">
                <button 
                  onClick={handleAddToCart} 
                  className="flex-1 bg-[#ff9f00] text-white font-bold py-4 rounded-sm shadow-sm flex items-center justify-center gap-2 uppercase text-sm sm:text-base hover:shadow-md transition-shadow"
                >
                  <ShoppingCart className="w-5 h-5 fill-white" />
                  Add to Cart
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:w-[60%] p-4 lg:p-6 flex flex-col gap-6 lg:border-l border-gray-100">
            
            <div>
              {/* Title */}
              <h1 className="text-4xl sm:text-3xl text-[#1A4D2E] font-bold mb-2 font-heading">
                {product.name}
              </h1>

              {/* Rating & Reviews Summary */}
              <div className="flex items-center gap-3">
                {product.rating > 0 ? (
                  <>
                    <div className="bg-[#388e3c] text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      {product.rating} <Star className="w-3 h-3 fill-white" />
                    </div>
                    <span className="text-gray-500 text-sm font-medium">
                      {totalReviews} Ratings & {totalReviews} Reviews
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500 text-sm font-medium">
                    No reviews yet
                  </span>
                )}
                {product.is_bestseller && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-medium">
                    Bestseller
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-medium text-gray-900">
                ₹{selectedQuantityOption ? selectedQuantityOption.price : product.price}
              </span>
              {selectedQuantityOption && selectedQuantityOption.original_price ? (
                <>
                  <span className="text-gray-500 line-through text-sm">₹{selectedQuantityOption.original_price}</span>
                  <span className="text-[#388e3c] font-bold text-sm">
                    {Math.round(((selectedQuantityOption.original_price - selectedQuantityOption.price) / selectedQuantityOption.original_price) * 100)}% off
                  </span>
                </>
              ) : product.original_price && !selectedQuantityOption ? (
                <>
                  <span className="text-gray-500 line-through text-sm">₹{product.original_price}</span>
                  <span className="text-[#388e3c] font-bold text-sm">{discount}% off</span>
                </>
              ) : null}
            </div>

            {/* Quantity Pricing Options (if any) */}
            {product.quantity_pricing && product.quantity_pricing.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-medium text-gray-700">Choose Pack</span>
                  <span className="text-xs text-gray-500">(Save more with bulk packs)</span>
                </div>
                <div className="flex flex-wrap gap-2 w-full">
                  {product.quantity_pricing.map((opt: any, idx: number) => {
                    const isSelected = selectedQuantityOption && selectedQuantityOption.quantity === opt.quantity && selectedQuantityOption.price === opt.price;
                    const packDiscount = opt.original_price ? Math.round(((opt.original_price - opt.price) / opt.original_price) * 100) : 0;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedQuantityOption(opt)}
                        className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all flex-grow sm:flex-grow-0 ${
                          isSelected 
                            ? 'bg-green-600 text-white border-green-600 shadow-md' 
                            : 'bg-white text-gray-800 border-gray-200 hover:border-green-400 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-semibold">{opt.label ? opt.label : `Qty ${opt.quantity}`}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={isSelected ? 'text-white' : 'text-gray-900'}>₹{opt.price}</span>
                            {opt.original_price && (
                              <>
                                <span className={`line-through text-xs ${isSelected ? 'text-green-100' : 'text-gray-400'}`}>
                                  ₹{opt.original_price}
                                </span>
                                {packDiscount > 0 && (
                                  <span className={`text-xs font-bold ${isSelected ? 'text-green-100' : 'text-green-600'}`}>
                                    {packDiscount}% off
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* In More Detail Section */}
            <div className="mt-8 mb-6">
              <h2 className="text-xl font-bold text-center text-[#1A4D2E] mb-6 font-heading">
                In More Detail
              </h2>
              
              <div className="space-y-4">
                {/* Product Info Accordion */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg overflow-hidden transition-all duration-300 border border-[#1A4D2E]/20 shadow-sm">
                  <button
                    onClick={() => toggleSection('info')}
                    className="w-full flex items-center justify-between p-4 bg-white/50 hover:bg-white/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Heart className="w-5 h-5 text-[#1A4D2E]" />
                      <span className="font-bold text-[#1A4D2E]">Product Info</span>
                    </div>
                    {expandedSection === 'info' ? (
                      <Minus className="w-5 h-5 text-[#1A4D2E]" />
                    ) : (
                      <Plus className="w-5 h-5 text-[#1A4D2E]" />
                    )}
                  </button>
                  <div 
                    className={`transition-all duration-300 ease-out overflow-hidden ${
                      expandedSection === 'info' ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                   <div className="p-4 pt-0 text-[#1A4D2E]">
                    <div className="flex flex-col gap-4">
                      {/* Description Card */}
                      <div className="bg-white p-4 rounded-lg border border-[#E8ECD6] shadow-sm">
                        <h4 className="font-semibold mb-2">Description</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{product.description}</p>
                      </div>
                      
                      {/* Benefits Card */}
                      {product.benefits && (
                        <div className="bg-white p-4 rounded-lg border border-[#E8ECD6] shadow-sm">
                          <h4 className="font-semibold mb-2">Benefits</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{product.benefits}</p>
                        </div>
                      )}

                      {/* Ingredients Card */}
                      {product.ingredients && (
                        <div className="bg-white p-4 rounded-lg border border-[#E8ECD6] shadow-sm">
                          <h4 className="font-semibold mb-2">Ingredients</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{product.ingredients}</p>
                        </div>
                      )}

                      {/* Highlights Card */}
                      <div className="bg-white p-4 rounded-lg border border-[#E8ECD6] shadow-sm">
                         <h4 className="font-semibold mb-2">Highlights</h4>
                         <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700">
                          <li>Ayurvedic Formulation</li>
                          <li>Safe & Natural</li>
                          <li>Quality Tested</li>
                         </ul>
                      </div>
                    </div>
                   </div>
                  </div>
                </div>

                {/* How to Use Accordion */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg overflow-hidden transition-all duration-300 border border-[#1A4D2E]/20 shadow-sm">
                  <button
                    onClick={() => toggleSection('usage')}
                    className="w-full flex items-center justify-between p-4 bg-white/50 hover:bg-white/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-[#1A4D2E]" />
                      <span className="font-bold text-[#1A4D2E]">How to Use?</span>
                    </div>
                    {expandedSection === 'usage' ? (
                      <Minus className="w-5 h-5 text-[#1A4D2E]" />
                    ) : (
                      <Plus className="w-5 h-5 text-[#1A4D2E]" />
                    )}
                  </button>
                  <div 
                    className={`transition-all duration-300 ease-out overflow-hidden ${
                      expandedSection === 'usage' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                   <div className="p-4 pt-0 text-[#1A4D2E]">
                    <p className="text-sm leading-relaxed whitespace-pre-line text-gray-700">
                      {product.how_to_use || 'No usage instructions available.'}
                    </p>
                   </div>
                  </div>
                </div>

                {/* Product details Accordion */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg overflow-hidden transition-all duration-300 border border-[#1A4D2E]/20 shadow-sm">
                  <button
                    onClick={() => toggleSection('details')}
                    className="w-full flex items-center justify-between p-4 bg-white/50 hover:bg-white/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Leaf className="w-5 h-5 text-[#1A4D2E]" />
                      <span className="font-bold text-[#1A4D2E]">Product details</span>
                    </div>
                    {expandedSection === 'details' ? (
                      <Minus className="w-5 h-5 text-[#1A4D2E]" />
                    ) : (
                      <Plus className="w-5 h-5 text-[#1A4D2E]" />
                    )}
                  </button>
                  <div 
                    className={`transition-all duration-300 ease-out overflow-hidden ${
                      expandedSection === 'details' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                   <div className="p-4 pt-0 text-[#1A4D2E]">
                    <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                      {product.gst_number && (
                        <div className="flex justify-between border-b border-gray-100 py-2">
                          <span className="font-medium">GST Number:</span>
                          <span>{product.gst_number}</span>
                        </div>
                      )}
                      {product.hsn_code && (
                        <div className="flex justify-between border-b border-gray-100 py-2">
                          <span className="font-medium">HSN Code:</span>
                          <span>{product.hsn_code}</span>
                        </div>
                      )}
                      {product.country_of_origin && (
                        <div className="flex justify-between border-b border-gray-100 py-2">
                          <span className="font-medium">Country of Origin:</span>
                          <span>{product.country_of_origin}</span>
                        </div>
                      )}
                      {(product.length && product.width && product.height) && (
                        <div className="flex justify-between border-b border-gray-100 py-2">
                          <span className="font-medium">Dimensions (L×W×H):</span>
                          <span>{product.length} × {product.width} × {product.height} cm</span>
                        </div>
                      )}
                      {product.weight && (
                        <div className="flex justify-between border-b border-gray-100 py-2">
                          <span className="font-medium">Weight:</span>
                          <span>{product.weight * 1000} gm</span>
                        </div>
                      )}
                      {product.product_type && (
                         <div className="flex justify-between border-b border-gray-100 py-2">
                          <span className="font-medium">Type:</span>
                          <span>{product.product_type === 'veg' ? '🟢 Vegetarian' : '🔴 Non-Vegetarian'}</span>
                        </div>
                      )}
                    </div>
                   </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 mb-2">
              {[
                { icon: Truck, label: 'Delivery Guaranteed' },
                { icon: ShieldCheck, label: 'Secure Transaction' },
                { icon: Star, label: '5 Star Rated' },
                { icon: Package, label: 'Easy Order Tracking' },
              ].map((badge, idx) => (
                <div key={idx} className="flex flex-col items-center text-center gap-3 group cursor-default">
                  <div className="w-14 h-14 rounded-full bg-[#1A4D2E] flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <badge.icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 max-w-[120px] leading-tight group-hover:text-[#1A4D2E] transition-colors uppercase tracking-wide">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Ratings & Reviews */}
            <div className="border border-gray-200 rounded-sm mt-4">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-800">Ratings & Reviews</h3>
              </div>
              
              <div className="p-6">
                {/* Rating Summary */}
                <div className="flex items-center gap-8 mb-8">
                  <div className="text-center">
                    <div className="text-3xl font-medium text-gray-900 flex items-center justify-center gap-1">
                      {averageRating.toFixed(1)} <Star className="w-6 h-6 fill-gray-900" />
                    </div>
                    <p className="text-gray-500 text-sm mt-1">{totalReviews} Ratings & Reviews</p>
                  </div>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#388e3c]" style={{ width: `${(averageRating / 5) * 100}%` }}></div>
                  </div>
                </div>

                {/* Reviews List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loadingReviews ? (
                    <div className="col-span-full text-center py-8">Loading reviews...</div>
                  ) : reviews.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-500">No reviews yet. Be the first to review!</div>
                  ) : (
                    <>
                      {(showAllReviews ? reviews : reviews.slice(0, 4)).map((review) => (
                        <div key={review.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${
                              review.rating >= 3 ? 'bg-[#388e3c]' : review.rating === 2 ? 'bg-orange-500' : 'bg-red-500'
                            }`}>
                              {review.rating} <Star className="w-3 h-3 fill-white" />
                            </div>
                            <span className="font-medium text-sm text-gray-900">
                              {review.rating >= 4 ? 'Excellent' : review.rating === 3 ? 'Good' : 'Fair'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-3 leading-relaxed">{review.review}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="font-medium text-gray-500">{review.user_name || 'Customer'}</span>
                            {review.reviewer_type === 'doctor' ? (
                              <>
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium text-xs">
                                  👨‍⚕️ Doctor
                                </span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3 h-3 text-gray-400" />
                                <span>Certified Buyer</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                      
                      {/* Show More / Show Less Button */}
                      {reviews.length > 4 && (
                        <div className="col-span-full text-center pt-4">
                          <button
                            onClick={() => setShowAllReviews(!showAllReviews)}
                            className="text-[#388e3c] font-semibold hover:text-[#2d6b2f] transition-colors text-sm uppercase"
                          >
                            {showAllReviews ? (
                              <>Show Less Reviews ▲</>
                            ) : (
                              <>Show All {reviews.length} Reviews ▼</>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Certifications / Trust Symbols */}
            <div className="mt-8 pt-8 border-t border-[#1A4D2E]/10">
              <div className="grid grid-cols-4 gap-2 md:gap-4">
                {[
                  { img: '/Ministry of Ayush.png', title: 'Ministry of AYUSH', desc: 'Government Approved' },
                  { img: '/cruelty-free.png', title: 'Cruelty Free', desc: 'No Animal Testing' },
                  { img: '/GMP Certified.png', title: 'GMP Certified', desc: 'Good Manufacturing Practice' },
                  { img: '/Handpicked ingredient.png', title: 'Handpicked Ingredients', desc: 'Sourced with Care' },
                ].map((feature, idx) => (
                  <div key={idx} className="text-center space-y-2 group hover:-translate-y-1 transition-transform duration-300">
                    <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-white/60 backdrop-blur-sm rounded-full shadow-sm group-hover:shadow-md transition-all duration-300 border border-[#1A4D2E]/10">
                      <img 
                        src={feature.img} 
                        alt={feature.title}
                        className="w-8 h-8 md:w-10 md:h-10 object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-[10px] md:text-sm text-[#1A4D2E] font-heading leading-tight">{feature.title}</h3>
                      <p className="hidden sm:block text-[10px] text-gray-500 font-body mt-1 leading-tight">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-3 lg:hidden flex gap-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 border-t border-gray-100">
        <button 
          onClick={handleAddToCart} 
          className="flex-1 bg-[#ff9f00] text-white font-bold py-3 rounded-lg shadow-sm flex items-center justify-center gap-2 uppercase text-sm active:scale-95 transition-transform"
        >
          <ShoppingCart className="w-5 h-5 fill-white" />
          Add to Cart
        </button>
      </div>
    </div>
  );
}
