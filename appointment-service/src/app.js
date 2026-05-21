const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const appointmentsRoute = require('./routes/appointments');

function createApp() {
  const app = express();
  app.use(helmet());
  app.use(compression());
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cors({ origin: process.env.APPOINTMENT_CORS_ORIGIN || '*' }));

  app.get('/health', (req, res) => res.json({ ok: true, service: 'appointment-service' }));

  app.use('/api/appointments', appointmentsRoute);

  // generic error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
