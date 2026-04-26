const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('./config/database');
const { startEarthquakeChecker } = require('./services/earthquakeChecker');
const authRoutes = require('./routes/auth');
const contactsRoutes = require('./routes/contacts');
const friendRequestsRoutes = require('./routes/friend-requests');
const locationsRoutes = require('./routes/locations');
const notificationsRoutes = require('./routes/notifications');
const earthquakesRoutes = require('./routes/earthquakes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/friend-requests', friendRequestsRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/earthquakes', earthquakesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// Start server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDB();
    
    // Start earthquake checker
    startEarthquakeChecker();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
