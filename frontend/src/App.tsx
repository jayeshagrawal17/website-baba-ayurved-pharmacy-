import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { UserAuthProvider } from './context/UserAuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import About from './pages/About';
import Contact from './pages/Contact';
import OwnerLogin from './pages/OwnerLogin';
import OwnerDashboard from './pages/OwnerDashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <UserAuthProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col">
            <ScrollToTop />
            <Header />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/owner-login" element={<OwnerLogin />} />
                <Route path="/owner-dashboard" element={<OwnerDashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/order/:id" element={<OrderDetail />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </CartProvider>
      </UserAuthProvider>
    </AuthProvider>
  );
}

export default App;
