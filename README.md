# 🌿 Baba Ayurveda Pharmacy

A full-stack e-commerce platform for Ayurvedic products with integrated payment processing, authentication, and automated shipment management.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Services & Integrations](#services--integrations)
- [Features](#features)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)

## 🎯 Overview

Baba Ayurveda Pharmacy is a modern e-commerce platform specializing in Ayurvedic medicines and wellness products. The platform provides a seamless shopping experience with features like OTP-based authentication, secure payment processing, real-time order tracking, and automated shipment creation.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18.3.1 with TypeScript
- **Build Tool:** Vite 5.4.2
- **Routing:** React Router DOM 7.11.0
- **Styling:** TailwindCSS 3.4.1 with PostCSS & Autoprefixer
- **Icons:** Lucide React 0.344.0
- **HTTP Client:** Fetch API
- **State Management:** React Context API
- **Type Checking:** TypeScript 5.5.3
- **Linting:** ESLint 9.9.1

### Backend
- **Framework:** FastAPI 0.104.1
- **Server:** Uvicorn 0.24.0 (ASGI)
- **Language:** Python 3.11.0
- **Validation:** Pydantic 2.5.0
- **HTTP Client:** Requests 2.31.0
- **Environment:** python-dotenv 1.0.0

### Database & Authentication
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth + MSG91 OTP
- **Client Libraries:**
  - Frontend: @supabase/supabase-js 2.57.4
  - Backend: supabase 2.0.3

### Payment Processing
- **Payment Gateway:** Razorpay
- **Frontend SDK:** razorpay 2.9.6
- **Backend SDK:** razorpay 1.4.2

### Shipment & Logistics
- **Delivery Partner:** Bigship API
- **Features:** B2C shipment creation, tracking, and management

### SMS & OTP Services
- **Provider:** MSG91
- **Features:** OTP widget, SMS notifications

### Deployment & Hosting
- **Platform:** Render
- **Frontend:** Static site hosting
- **Backend:** Web service (Python)
- **Region:** Oregon
- **Plan:** Free tier

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│                    (React + TypeScript)                      │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Pages   │  │Components│  │ Context  │  │ Services │   │
│  │          │  │          │  │          │  │          │   │
│  │ • Home   │  │ • Header │  │ • Auth   │  │ • API    │   │
│  │ • Products│ │ • Cart   │  │ • Cart   │  │ • Payment│   │
│  │ • Cart   │  │ • Modal  │  │ • User   │  │ • OTP    │   │
│  │ • Orders │  │ • Forms  │  │          │  │ • Bigship│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────┬───────────────────────────────────┘
                          │
                     HTTPS/REST API
                          │
┌──────────────────────────▼───────────────────────────────────┐
│                      API Gateway Layer                        │
│                    (FastAPI Backend)                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Route Handlers                         │    │
│  │  • Payment Processing  • Product Management        │    │
│  │  • Order Management   • Shipment Creation          │    │
│  │  • Tracking          • User Management             │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Middleware & Services                     │    │
│  │  • CORS  • Validation  • Error Handling            │    │
│  │  • Logging  • Authentication                        │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase   │  │   Razorpay   │  │    Bigship   │
│  (Database)  │  │   (Payment)  │  │  (Shipping)  │
│              │  │              │  │              │
│ • PostgreSQL │  │ • Orders     │  │ • Shipments  │
│ • Auth       │  │ • Payments   │  │ • Tracking   │
│ • Storage    │  │ • Webhooks   │  │ • Webhooks   │
└──────────────┘  └──────────────┘  └──────────────┘
          │
          ▼
┌──────────────┐
│    MSG91     │
│   (OTP/SMS)  │
│              │
│ • OTP Widget │
│ • SMS        │
└──────────────┘
```

### Data Flow

#### 1. User Authentication Flow
```
User → Enter Phone Number → MSG91 OTP Widget → Verify OTP
  → Supabase Auth → JWT Token → Authenticated Session
```

#### 2. Purchase Flow
```
Browse Products → Add to Cart → Checkout → Create Razorpay Order
  → Payment → Verify Payment → Create Shipment (Bigship)
  → Save Order (Supabase) → Order Confirmation
```

#### 3. Order Tracking Flow
```
User → View Orders → Bigship Tracking API → Real-time Status
  → Display Shipment Details & Timeline
```

### Application Layers

#### Presentation Layer (Frontend)
- **Pages:** Route-level components (Home, Products, Cart, Orders, etc.)
- **Components:** Reusable UI components (Header, Footer, ProductCard, etc.)
- **Context:** Global state management (AuthContext, CartContext, UserAuthContext)
- **Services:** API communication layer

#### Business Logic Layer (Backend)
- **Routes:** Endpoint handlers for different features
- **Services:** Business logic and third-party integrations
- **Middleware:** CORS, authentication, error handling

#### Data Layer
- **Supabase:** Primary database and authentication
- **External APIs:** Razorpay, Bigship, MSG91

## 🔌 Services & Integrations

### 1. **Supabase**
- **Purpose:** Database, Authentication, and Storage
- **Features Used:**
  - PostgreSQL database for storing products, orders, users
  - Authentication with JWT tokens
  - Row Level Security (RLS) policies
  - Real-time subscriptions
- **Endpoints:** Database operations, user management

### 2. **Razorpay**
- **Purpose:** Payment Gateway
- **Features Used:**
  - Order creation
  - Payment processing (UPI, Card, Net Banking, Wallet)
  - Payment verification with signature validation
  - Webhook handling for payment events
- **Integration:** Frontend checkout + Backend verification

### 3. **Bigship**
- **Purpose:** Shipping and Logistics Management
- **Features Used:**
  - B2C shipment creation
  - Automated AWB generation
  - Real-time tracking
  - Webhook notifications for status updates
  - Multiple courier partner support
- **API Endpoints:** 
  - Shipment creation
  - Tracking
  - Webhook handling

### 4. **MSG91**
- **Purpose:** OTP and SMS Services
- **Features Used:**
  - OTP widget for authentication
  - SMS notifications
  - CAPTCHA disabled mode for seamless UX
- **Integration:** Frontend widget + token-based authentication

### 5. **Render**
- **Purpose:** Cloud Hosting Platform
- **Configuration:**
  - Static site hosting for frontend
  - Web service for backend API
  - Automatic deployments from GitHub
  - Environment variable management
  - Free SSL certificates

## ✨ Features

### Customer Features
- 🛍️ **Product Browsing:** Browse and search Ayurvedic products
- 🛒 **Shopping Cart:** Add/remove products, update quantities
- 🔐 **OTP Authentication:** Secure phone-based login via MSG91
- 💳 **Multiple Payment Methods:** UPI, Cards, Net Banking, Wallets
- 📦 **Order Tracking:** Real-time shipment tracking with Bigship
- 👤 **User Profile:** Manage personal information and addresses
- 📱 **Responsive Design:** Mobile-first design with TailwindCSS

### Admin/Owner Features
- 📊 **Dashboard:** Overview of orders, payments, and shipments
- 📦 **Product Management:** Add, edit, delete products
- 🏷️ **Category Management:** Organize products by categories
- 💰 **Payment Dashboard:** Monitor payment status and transactions
- 🚚 **Shipment Creation:** Automated and manual shipment creation
- 📈 **Bulk Operations:** Bulk product updates and management

### Technical Features
- ⚡ **Fast Performance:** Vite for lightning-fast builds
- 🔒 **Secure:** HTTPS, secure payment processing, authentication
- 🎨 **Modern UI:** TailwindCSS with responsive design
- 🔄 **Real-time Updates:** Live order status tracking
- 📝 **Type Safety:** Full TypeScript implementation
- 🐛 **Error Handling:** Comprehensive error handling and logging
- 🚀 **CI/CD:** Automated deployments with Render

## 📁 Project Structure

```
Baba-Ayurveda-Pharmacy/
├── frontend/                    # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/              # Route components
│   │   │   ├── Home.tsx
│   │   │   ├── Products.tsx
│   │   │   ├── Cart.tsx
│   │   │   ├── Orders.tsx
│   │   │   ├── OrderDetail.tsx
│   │   │   ├── OwnerDashboard.tsx
│   │   │   └── ...
│   │   ├── components/         # Reusable components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── PaymentModal.tsx
│   │   │   ├── ShipmentTracking.tsx
│   │   │   └── ...
│   │   ├── context/            # React Context for state
│   │   │   ├── AuthContext.tsx
│   │   │   ├── CartContext.tsx
│   │   │   └── UserAuthContext.tsx
│   │   ├── services/           # API communication
│   │   │   ├── apiService.ts
│   │   │   ├── paymentService.ts
│   │   │   ├── otpService.ts
│   │   │   └── bigshipService.ts
│   │   ├── types/              # TypeScript definitions
│   │   │   └── index.ts
│   │   ├── lib/                # Utility libraries
│   │   │   └── supabase.ts
│   │   ├── App.tsx             # Root component
│   │   └── main.tsx            # Entry point
│   ├── public/                 # Static assets
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── backend/                     # FastAPI backend
│   ├── routes/                 # API route handlers
│   │   ├── __init__.py
│   │   └── bigship_tracking.py
│   ├── services/               # Business logic
│   │   └── bigship_service.py
│   ├── app/                    # Core app modules
│   │   ├── __init__.py
│   │   └── database.py
│   ├── migrations/             # Database migrations
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   ├── runtime.txt             # Python version
│   ├── Procfile                # Process configuration
│   └── test_auto_shipment.py   # Tests
│
├── render.yaml                 # Render deployment config
└── README.md                   # Project documentation
```

## 🚀 Setup & Installation

### Prerequisites
- Node.js 20.11.0 or higher
- Python 3.11.0 or higher
- npm or yarn
- Git

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add environment variables (see Environment Variables section)

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Add environment variables (see Environment Variables section)

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🔐 Environment Variables

### Frontend (.env)
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MSG91_AUTH_KEY=your_msg91_auth_key
VITE_MSG91_WIDGET_ID=your_msg91_widget_id
VITE_MSG91_TOKEN_AUTH=your_msg91_token_auth
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_API_BASE_URL=http://localhost:8000
```

### Backend (.env)
```env
# Python Version
PYTHON_VERSION=3.11.0

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Bigship Configuration
BIGSHIP_USERNAME=your_bigship_email
BIGSHIP_PASSWORD=your_bigship_password
BIGSHIP_ACCESS_KEY=your_bigship_access_key
BIGSHIP_DEFAULT_WAREHOUSE_ID=your_warehouse_id
BIGSHIP_PICKUP_PINCODE=your_pickup_pincode

# CORS Configuration
FRONTEND_URL=http://localhost:5173
PRODUCTION_FRONTEND_URL=https://your-domain.com
CUSTOM_DOMAIN=your-custom-domain.com
```

## 🌐 Deployment

### Render Deployment

The project is configured for automatic deployment on Render using `render.yaml`.

#### Frontend Deployment
- **Type:** Static Site
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `./dist`
- **Auto-deploys:** On push to main branch

#### Backend Deployment
- **Type:** Web Service
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Auto-deploys:** On push to main branch

### Manual Deployment

1. Push code to GitHub repository
2. Connect repository to Render
3. Render will automatically detect `render.yaml`
4. Configure environment variables in Render dashboard
5. Deploy!

## 📚 API Documentation

### Base URL
- **Development:** `http://localhost:8000`
- **Production:** `https://your-backend-url.onrender.com`

### Key Endpoints

#### Payment Endpoints
```
POST   /create-order          Create Razorpay order
POST   /verify-payment        Verify payment signature
POST   /payment-webhook       Handle payment webhooks
GET    /payment-status/{id}   Get payment status
```

#### Shipment Endpoints
```
POST   /create-shipment       Create new shipment
GET    /track-shipment/{awb}  Track shipment by AWB
POST   /bigship-webhook       Handle Bigship webhooks
GET    /shipment-status/{id}  Get shipment status
```

#### Product Endpoints
```
GET    /products              Get all products
GET    /products/{id}         Get product by ID
POST   /products              Create new product (Admin)
PUT    /products/{id}         Update product (Admin)
DELETE /products/{id}         Delete product (Admin)
```

#### Order Endpoints
```
GET    /orders                Get all orders
GET    /orders/{id}           Get order by ID
POST   /orders                Create new order
PUT    /orders/{id}           Update order status
```

### Authentication
- Frontend uses Supabase Auth with JWT tokens
- Backend validates tokens for protected endpoints
- OTP-based authentication via MSG91

## 🔒 Security Features

- ✅ HTTPS encryption
- ✅ JWT-based authentication
- ✅ Payment signature verification
- ✅ CORS protection
- ✅ Environment variable protection
- ✅ Input validation with Pydantic
- ✅ SQL injection protection (Supabase)
- ✅ XSS protection
- ✅ Secure headers configuration

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 👥 Contact

For questions or support, please contact the development team.

---

**Built with ❤️ for Ayurvedic Wellness**
