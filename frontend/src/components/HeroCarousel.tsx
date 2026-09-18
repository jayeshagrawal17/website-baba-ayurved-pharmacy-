import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';

interface HeroCarouselProps {
  products: Product[];
}

export default function HeroCarousel({ products }: HeroCarouselProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === products.length - 1 ? 0 : prevIndex + 1
    );
  }, [products.length]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? products.length - 1 : prevIndex - 1
    );
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Touch handlers for mobile swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Auto-slide effect (4-5 seconds interval)
  useEffect(() => {
    if (!isHovered && products.length > 1) {
      const interval = setInterval(goToNext, 4500); // 4.5 seconds
      return () => clearInterval(interval);
    }
  }, [isHovered, products.length, goToNext]);

  if (!products || products.length === 0) {
    return (
      <section className="relative h-[60vh] sm:h-[70vh] md:h-[80vh] flex items-center overflow-hidden bg-gradient-to-br from-ayurveda-light via-white to-ayurveda-bg">
        <div className="container mx-auto px-4 py-12 sm:py-24 text-center">
          <p className="text-lg sm:text-2xl text-gray-500">No hero products available. Add products and mark them to show in hero carousel.</p>
        </div>
      </section>
    );
  }

  const currentProduct = products[currentIndex];

  return (
    <section 
      className="relative h-[40vh] min-h-[300px] sm:h-[70vh] md:h-[80vh] flex items-center overflow-hidden rounded-[2rem] cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={() => navigate(`/product/${currentProduct.id}`)}
    >
      {/* Background Image with Light Overlay */}
      <div className="absolute inset-0">
        <img
          src={currentProduct.image_url}
          alt={currentProduct.name}
          className="w-full h-full object-contain sm:object-cover object-center transition-opacity duration-700"
        />
        <div className="absolute inset-0 sm:bg-gradient-to-r sm:from-black/20 sm:via-transparent"></div>
      </div>

      {/* Navigation Arrows */}
      {products.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-2 sm:left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm hover:bg-white/30 active:bg-white/40 text-white p-3 md:p-4 rounded-full transition-all hover:scale-110 border border-white/40 hidden sm:block"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-2 sm:right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm hover:bg-white/30 active:bg-white/40 text-white p-3 md:p-4 rounded-full transition-all hover:scale-110 border border-white/40 hidden sm:block"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {products.length > 1 && (
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 sm:gap-2 md:gap-3">
          {products.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
              className={`transition-all rounded-full ${
                index === currentIndex
                  ? 'bg-white w-6 sm:w-8 md:w-12 h-1.5 sm:h-2 md:h-3'
                  : 'bg-white/40 hover:bg-white/60 w-1.5 sm:w-2 md:w-3 h-1.5 sm:h-2 md:h-3'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
