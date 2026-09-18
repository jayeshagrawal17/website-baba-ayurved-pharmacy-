import { ShoppingCart, Star } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
}

export default function ProductCard({ product, onProductClick }: ProductCardProps) {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
  };

  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <div
      onClick={() => onProductClick(product)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-500 cursor-pointer group flex flex-col h-full hover:-translate-y-1"
    >
      <div className="relative overflow-hidden aspect-square lg:aspect-square bg-ayurveda-light/20">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        
        {discount > 0 && (
          <div className="absolute top-1.5 right-1.5 lg:top-2 lg:right-2 bg-red-500 text-white px-1.5 py-0.5 lg:px-2 rounded-full text-[10px] lg:text-xs font-bold shadow-lg transform translate-y-0 group-hover:-translate-y-1 transition-transform font-body">
            {discount}% OFF
          </div>
        )}
        {product.is_bestseller && (
          <div className="absolute top-1.5 left-1.5 lg:top-2 lg:left-2 bg-ayurveda-accent text-white px-1.5 py-0.5 lg:px-2 rounded-full text-[10px] lg:text-xs font-bold shadow-lg flex items-center gap-1 transform translate-y-0 group-hover:-translate-y-1 transition-transform font-body">
            <Star className="w-2.5 h-2.5 lg:w-3 lg:h-3 fill-current" />
            Bestseller
          </div>
        )}
        
        <button
          onClick={handleAddToCart}
          className="absolute bottom-2 right-2 lg:bottom-3 lg:right-3 bg-white text-ayurveda-primary p-1.5 lg:p-2 rounded-full shadow-lg translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-ayurveda-primary hover:text-white z-10"
          title="Add to Cart"
        >
          <ShoppingCart className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
        </button>
      </div>

      <div className="p-2.5 lg:p-4 flex flex-col flex-grow">
        <h3 className="text-sm lg:text-base font-bold text-gray-900 mb-1 lg:mb-1.5 line-clamp-2 group-hover:text-ayurveda-primary transition-colors font-heading">
          {product.name}
        </h3>
        <p className="text-[10px] lg:text-xs text-gray-500 mb-2 lg:mb-3 line-clamp-2 flex-grow font-body leading-relaxed">{product.description}</p>

        <div className="flex items-center mb-2 lg:mb-3">
          <div className="flex items-center space-x-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-2.5 h-2.5 lg:w-3 lg:h-3 ${
                  i < Math.floor(product.rating)
                    ? 'fill-ayurveda-accent text-ayurveda-accent'
                    : 'text-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="ml-1 lg:ml-1.5 text-[10px] lg:text-xs text-gray-500 font-body">({product.rating})</span>
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 lg:pt-3 border-t border-gray-50">
          <div>
            <div className="flex items-center space-x-1 lg:space-x-1.5">
              <span className="text-base lg:text-xl font-bold text-ayurveda-primary font-heading">₹{product.price}</span>
              {product.original_price && (
                <span className="text-[10px] lg:text-xs text-gray-400 line-through font-body">
                  ₹{product.original_price}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className="bg-ayurveda-light text-ayurveda-primary p-1.5 lg:p-2 rounded-lg hover:bg-ayurveda-primary hover:text-white transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <ShoppingCart className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </button>
        </div>

        {product.stock_quantity < 10 && product.stock_quantity > 0 && (
          <p className="text-[10px] lg:text-xs text-orange-600 mt-1.5 lg:mt-2 font-medium font-body">Only {product.stock_quantity} left!</p>
        )}
        {product.stock_quantity === 0 && (
          <p className="text-[10px] lg:text-xs text-red-600 mt-1.5 lg:mt-2 font-semibold">Out of stock</p>
        )}
      </div>
    </div>
  );
}
