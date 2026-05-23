const express = require('express');
const router = express.Router();
const controller = require('../controllers/appointmentController');

router.post('/', controller.createAppointment);
router.get('/', controller.listAppointments); // supports ?date=YYYY-MM-DD or ?month=YYYY-MM
router.get('/slots', controller.getSlotsForDate);
router.patch('/:id/pin', controller.pinAppointment);

module.exports = router;
