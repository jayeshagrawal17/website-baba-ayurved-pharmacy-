import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import HeroCarousel from '../components/HeroCarousel';
import { apiService } from '../services/apiService';

export default function Home() {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [heroProducts, setHeroProducts] = useState<Product[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingHero, setLoadingHero] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load featured products
      apiService.getProducts({ featured: true, limit: 4 })
        .then(data => {
          setFeaturedProducts(data);
          setLoadingFeatured(false);
        })
        .catch(error => {
          console.error('Error loading featured products:', error);
          setLoadingFeatured(false);
        });
      
      // Load hero carousel products
      apiService.getProducts({ show_in_hero: true })
        .then(data => {
          setHeroProducts(data);
          setLoadingHero(false);
        })
        .catch(error => {
          console.error('Error loading hero products:', error);
          setLoadingHero(false);
        });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  return (
    <div className="bg-ayurveda-bg">
      {/* Hero Carousel Section */}
      {loadingHero ? (
        <section className="relative h-[60vh] sm:h-[70vh] md:h-[80vh] flex items-center justify-center overflow-hidden">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ayurveda-primary"></div>
        </section>
      ) : (
        <HeroCarousel products={heroProducts} />
      )}

      <section className="py-8 sm:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-4 gap-2 md:gap-12">
            {[
              { img: '/Ministry of Ayush.png', title: 'Ministry of AYUSH', desc: 'Government Approved' },
              { img: '/cruelty-free.png', title: 'Cruelty Free', desc: 'No Animal Testing' },
              { img: '/GMP Certified.png', title: 'GMP Certified', desc: 'Good Manufacturing Practice' },
              { img: '/Handpicked ingredient.png', title: 'Handpicked Ingredients', desc: 'Sourced with Care' },
            ].map((feature, idx) => (
              <div key={idx} className="text-center space-y-2 md:space-y-4 group hover:-translate-y-2 transition-transform duration-300">
                <div className="inline-flex items-center justify-center w-14 h-14 md:w-24 md:h-24 bg-transparent rounded-full group-hover:bg-ayurveda-light/30 transition-colors duration-300">
                  <img 
                    src={feature.img} 
                    alt={feature.title}
                    className="w-12 h-12 md:w-20 md:h-20 object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-[10px] md:text-lg text-ayurveda-primary font-heading leading-tight">{feature.title}</h3>
                  <p className="hidden md:block text-sm text-gray-500 font-body mt-1">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-b from-white to-ayurveda-bg/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-ayurveda-light text-ayurveda-primary px-4 py-2 rounded-full text-sm font-semibold shadow-sm border border-ayurveda-secondary/20 mb-4">
              <span className="tracking-wide">Personalized Care</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-ayurveda-primary mt-3 mb-4 font-heading">Shop by Health Concern</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-body">
              Find the right Ayurvedic solutions for your specific wellness needs
            </p>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
            {[
              { emoji: '🌸', title: 'Period', desc: 'Natural menstrual care & balance', bgColor: 'bg-pink-50', hoverColor: 'hover:bg-pink-100' },
              { emoji: '💑', title: 'Sexual', desc: 'Enhance vitality & reproductive wellness', bgColor: 'bg-rose-50', hoverColor: 'hover:bg-rose-100' },
              { emoji: '💪', title: 'Immunity', desc: 'Build your body\'s natural defense', bgColor: 'bg-green-50', hoverColor: 'hover:bg-green-100' },
              { emoji: '🧠', title: 'Mind', desc: 'Mental clarity, focus & peace', bgColor: 'bg-indigo-50', hoverColor: 'hover:bg-indigo-100' },
              { emoji: '�', title: 'Stomach', desc: 'Digestive health & gut balance', bgColor: 'bg-lime-50', hoverColor: 'hover:bg-lime-100' },
              { emoji: '🫁', title: 'Lungs', desc: 'Respiratory health & breathing support', bgColor: 'bg-cyan-50', hoverColor: 'hover:bg-cyan-100' },
              { emoji: '🍵', title: 'Liver', desc: 'Detoxification & liver support', bgColor: 'bg-amber-50', hoverColor: 'hover:bg-amber-100' },
              { emoji: '🦴', title: 'Ortho', desc: 'Joint, bone & mobility care', bgColor: 'bg-orange-50', hoverColor: 'hover:bg-orange-100' },
              { emoji: '🦷', title: 'Dental', desc: 'Oral health & hygiene solutions', bgColor: 'bg-teal-50', hoverColor: 'hover:bg-teal-100' },
              { emoji: '👁️', title: 'Eyes', desc: 'Vision care & eye health', bgColor: 'bg-blue-50', hoverColor: 'hover:bg-blue-100' },
              { emoji: '🚽', title: 'Piles', desc: 'Relief & healing for hemorrhoids', bgColor: 'bg-red-50', hoverColor: 'hover:bg-red-100' },
              { emoji: '👶', title: 'Baby', desc: 'Gentle care for little ones', bgColor: 'bg-purple-50', hoverColor: 'hover:bg-purple-100' },
            ].map((concern, idx) => (
              <div
                key={idx}
                onClick={() => {
                  // Navigate to products page with the selected health concern tag
                  navigate(`/products?tag=${encodeURIComponent(concern.title)}`);
                }}
                className={`${concern.bgColor} ${concern.hoverColor} rounded-xl md:rounded-2xl p-3 md:p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-lg border border-gray-100 group cursor-pointer`}
              >
                <div className="flex flex-col md:flex-row items-center md:items-start md:space-x-4 text-center md:text-left">
                  <div className="text-3xl md:text-4xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0 mb-2 md:mb-0">
                    {concern.emoji}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm md:text-xl font-bold text-ayurveda-primary mb-1 md:mb-2 font-heading group-hover:text-ayurveda-secondary transition-colors">
                      {concern.title}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 font-body leading-relaxed hidden md:block">
                      {concern.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-24 bg-ayurveda-bg">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-16">
            <div>
              <span className="text-ayurveda-accent font-bold tracking-widest uppercase text-sm">Selection</span>
              <h2 className="text-4xl md:text-5xl font-bold text-ayurveda-primary mt-3 font-heading">Featured Products</h2>
            </div>
            <button
              onClick={() => navigate('/products')}
              className="hidden md:flex text-ayurveda-primary font-bold hover:text-ayurveda-secondary items-center space-x-2 transition-colors"
            >
              <span>View All Products</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          
          {loadingFeatured ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-ayurveda-primary"></div>
            </div>
          ) : featuredProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-8">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onProductClick={(p) => navigate(`/product/${p.id}`)}
                  />
                ))}
              </div>
              <div className="mt-8 lg:mt-12 text-center md:hidden">
                <button
                  onClick={() => navigate('/products')}
                  className="text-ayurveda-primary font-bold hover:text-ayurveda-secondary inline-flex items-center space-x-2 transition-colors"
                >
                  <span>View All Products</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No featured products available
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
