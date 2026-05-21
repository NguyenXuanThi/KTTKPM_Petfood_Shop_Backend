const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, index: true },
    supportId: { type: String, default: null, index: true },

    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },

    petName: { type: String, required: true },
    petType: { type: String, required: true },

    serviceType: { type: String, default: '' },

    // Fixed slot model: date and slot label (HH:mm)
    appointmentDate: { type: String, required: true, index: true }, // YYYY-MM-DD
    appointmentSlot: { type: String, required: true, index: true }, // HH:mm

    note: { type: String, default: '' },

    status: {
      type: String,
      enum: ['pending_confirmation', 'confirmed', 'waiting_customer', 'completed'],
      default: 'pending_confirmation',
    },
  },
  { timestamps: true }
);

AppointmentSchema.index({ appointmentDate: 1, appointmentSlot: 1 });

module.exports = mongoose.model('Appointment', AppointmentSchema);
