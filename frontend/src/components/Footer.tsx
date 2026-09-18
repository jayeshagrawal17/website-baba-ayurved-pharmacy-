import { Facebook, Instagram, Twitter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <footer className="bg-ayurveda-primary text-white pt-12 pb-6 border-t border-ayurveda-secondary/30">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.png" 
                alt="Baba Ayurveda Pharmacy" 
                className="h-16 w-auto"
              />
              <div>
                <h3 className="text-2xl font-bold tracking-wide font-heading">BABA AYURVEDA</h3>
                <p className="text-[10px] text-ayurveda-accent font-bold tracking-[0.2em] uppercase font-body">Nature's Healing Touch</p>
              </div>
            </div>
            <p className="text-ayurveda-light/80 text-sm leading-relaxed font-body">
              Authentic Ayurvedic products crafted with traditional wisdom and modern science for holistic wellness. Experience the power of nature.
            </p>
            <div className="flex space-x-4">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="bg-white/5 p-3 rounded-full hover:bg-ayurveda-accent hover:text-white transition-all duration-300 group">
                  <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-6 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-ayurveda-light/50 text-sm font-body">
              &copy; 2024 BABA AYURVEDA. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 text-sm text-ayurveda-light/50 font-body">
              {/* Discreet owner button */}
              <button
                onClick={() => navigate(user ? '/owner-dashboard' : '/owner-login')}
                className="bg-white/5 p-2 rounded-full hover:bg-ayurveda-accent hover:text-white transition-colors text-ayurveda-light/30 text-xs"
                title="Admin"
              >
                ⚙
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
