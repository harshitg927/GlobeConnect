# 🌍 GlobeConnect

An interactive 3D globe and map visualization application for exploring worldwide locations, with real-time day/night visualization, location searching, and social features.

## 🌟 Features

### Core Features
- **Interactive 3D Globe & 2D Map**
  - Seamless switching between 3D globe and 2D map views
  - Real-time day/night visualization
  - City lights visualization during night time
  - Smooth zoom and rotation controls

### Search & Navigation
- **Advanced Location Search**
  - Search by city, state, or country
  - Coordinates-based search
  - Auto-complete suggestions
  - Reverse geocoding for clicked locations

### User Features
- **Authentication & Profiles**
  - User registration and login
  - Personal profile management
  - Favorite locations saving
  - Custom location posts

### Social Features
- **Location Posts**
  - Create and share location-based posts
  - Add images and descriptions
  - Comment on posts
  - Real-time notifications

### Customization
- **User Preferences**
  - Coordinate format selection (DD, DMS, DMM)
  - Day/Night mode toggle
  - Custom search filters
  - Display preferences

## 🛠️ Technology Stack

### Frontend
- React.js
- Chakra UI
- D3.js (for globe visualization)
- Redux (state management)
- Socket.io-client (real-time features)

### Backend
- Node.js
- Express.js
- MongoDB
- Socket.io
- JWT Authentication

### External APIs
- Wikipedia API (location information)
- RESTCountries API (country data)
- Cloudinary (image storage)

## 📦 Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/globeconnect.git
cd globeconnect
```

2. **Install dependencies**
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

3. **Environment Setup**

Create `.env` files in both server and client directories:

server/.env:
```env
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

client/.env:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=ws://localhost:5000
```

4. **Run the application**
```bash
# Start backend server
cd server
npm start

# Start frontend development server
cd ../client
npm start
```

## 🚀 Deployment

### Frontend Deployment
1. Build the React application:
```bash
cd client
npm run build
```

2. Deploy the built files from `client/build` to your hosting service

### Backend Deployment
1. Configure environment variables on your hosting platform
2. Deploy the server directory to your hosting service

## 🔧 Configuration

### Globe Settings
- Customize globe appearance in `src/comp/screen/globeview/index.js`
- Adjust day/night visualization in globe settings
- Modify city lights threshold in visualization parameters

### Search Settings
- Configure search filters in settings
- Adjust auto-complete parameters
- Customize search result display

## 👥 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- D3.js community for globe visualization resources
- Chakra UI for the component library
- OpenStreetMap for map data
- Wikipedia API for location information
- RESTCountries API for country data


