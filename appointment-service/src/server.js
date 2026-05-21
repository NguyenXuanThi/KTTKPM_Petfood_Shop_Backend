require('dotenv').config();
const mongoose = require('mongoose');
const createApp = require('./app');

const PORT = process.env.APPOINTMENT_PORT || 3013;
const MONGO = process.env.APPOINTMENT_MONGODB_URI;

async function start() {
  if (!MONGO) {
    console.error('Missing APPOINTMENT_MONGODB_URI in env');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO, {
      dbName: 'petfood_appointment',
    });
    console.log('Connected to MongoDB (appointment-service)');
  } catch (err) {
    console.error('MongoDB connection error', err);
    process.exit(1);
  }

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Appointment service listening on port ${PORT}`);
  });
}

start();
