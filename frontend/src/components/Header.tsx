import { ShoppingCart, Menu, X, Search, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useUserAuth } from '../context/UserAuthContext';
import UserLoginModal from './UserLoginModal';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { getCartCount } = useCart();
  const { user, signOutUser } = useUserAuth();
  const cartCount = getCartCount();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to products page with search query
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const navItems = [
    { name: 'Home', id: '/' },
    { name: 'Products', id: '/products' },
    { name: 'About', id: '/about' },
    { name: 'Contact', id: '/contact' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-ayurveda-light/90 backdrop-blur-md shadow-md border-b border-[#1A4D2E]/10 sticky top-0 z-50 transition-all duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-24">
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <img 
              src="/logo.png" 
              alt="Baba Ayurveda Pharmacy" 
              className="h-16 w-auto transition-transform duration-300 transform group-hover:scale-105"
            />
          </div>

          <nav className="hidden md:flex items-center space-x-10">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`relative px-1 py-2 text-sm font-medium tracking-wide transition-colors duration-300 font-body uppercase ${
                  isActive(item.id) 
                    ? 'text-ayurveda-primary' 
                    : 'text-gray-500 hover:text-ayurveda-primary'
                }`}
              >
                {item.name}
                <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-ayurveda-accent transform origin-left transition-transform duration-300 ${
                  isActive(item.id) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`} />
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-6">
            {/* Search Button/Bar */}
            {showSearch ? (
              <form onSubmit={handleSearch} className="hidden md:flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="px-4 py-2 border border-ayurveda-secondary/30 rounded-full focus:outline-none focus:border-ayurveda-primary text-sm w-64"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="ml-2 p-2 hover:bg-ayurveda-light rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </form>
            ) : (
              <button 
                onClick={() => setShowSearch(true)}
                className="hidden md:block p-2 hover:bg-ayurveda-light rounded-full transition-colors group"
              >
                <Search className="w-5 h-5 text-gray-500 group-hover:text-ayurveda-primary" />
              </button>
            )}

            {/* User Login/Profile Button */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 hover:bg-ayurveda-light rounded-full transition-colors border border-transparent hover:border-ayurveda-secondary/20"
                >
                  <User className="w-5 h-5 text-ayurveda-primary" />
                  <span className="hidden md:block text-sm font-medium text-gray-700 font-body">
                    {user.username || user.phone?.slice(-10).replace(/(\d{5})(\d{5})/, '$1-$2')}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-ayurveda-light py-2 z-50 animate-fade-in-up">
                    <button
                      onClick={() => {
                        navigate('/orders');
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-ayurveda-light text-gray-700 font-body"
                    >
                      My Orders
                    </button>
                    <button
                      onClick={async () => {
                        await signOutUser();
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center space-x-2 font-body"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="hidden md:flex items-center space-x-2 px-6 py-2.5 bg-ayurveda-primary text-white rounded-full hover:bg-ayurveda-primary/90 transition-all shadow-md hover:shadow-lg font-medium font-body tracking-wide"
              >
                <User className="w-4 h-4" />
                <span>Login</span>
              </button>
            )}

            <button
              onClick={() => navigate('/cart')}
              className="relative p-2 hover:bg-ayurveda-light rounded-full transition-colors group"
            >
              <ShoppingCart className="w-6 h-6 text-gray-600 group-hover:text-ayurveda-primary transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-ayurveda-accent text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              className="md:hidden p-2 hover:bg-ayurveda-light rounded-full transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pb-4 animate-fade-in-up">
            <nav className="flex flex-col space-y-2 bg-white rounded-lg shadow-inner p-4 mt-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`text-left py-3 px-4 rounded-lg transition-colors font-body ${
                    isActive(item.id) 
                      ? 'bg-ayurveda-light text-ayurveda-primary font-bold' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </button>
              ))}
              
              {/* Mobile User Menu */}
              {user ? (
                <>
                  <button
                    onClick={() => {
                      navigate('/orders');
                      setIsMenuOpen(false);
                    }}
                    className="text-left py-3 px-4 rounded-lg hover:bg-gray-50 text-gray-700 border-t border-gray-100 mt-2 font-body"
                  >
                    My Orders
                  </button>
                  <button
                    onClick={async () => {
                      await signOutUser();
                      setIsMenuOpen(false);
                    }}
                    className="text-left py-3 px-4 rounded-lg hover:bg-red-50 text-red-600 font-body"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setIsLoginModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="text-left py-3 px-4 rounded-lg bg-ayurveda-primary text-white hover:bg-ayurveda-primary/90 font-medium mt-2 font-body shadow-md"
                >
                  Login
                </button>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Login Modal */}
      <UserLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={() => {
          setIsLoginModalOpen(false);
          // Optionally navigate to orders page after login
        }}
      />
    </header>
  );
}
