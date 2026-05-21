const Appointment = require('../models/Appointment');
const dayjs = require('dayjs');

// build allowed slots
function buildAllowedSlotsForDay() {
  const slots = [];
  const pushRange = (startHour, endHour) => {
    for (let h = startHour; h <= endHour; h++) {
      const mins = h === endHour ? [0] : [0, 30];
      mins.forEach((m) => slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`));
    }
  };
  pushRange(8, 12); // morning 08:00..12:00
  pushRange(13, 17); // afternoon 13:00..17:00
  return slots;
}

const ALLOWED_SLOTS = buildAllowedSlotsForDay();
const MAX_CONCURRENT = 3; // per requirement

function isSlotValid(timeStr) {
  return ALLOWED_SLOTS.includes(timeStr);
}

// GET slots for a date
exports.getSlotsForDate = async (req, res) => {
  try {
    const date = req.query.date;
    if (!date || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Missing or invalid date' });
    }

    // count bookings per fixed slot for the date
    const slots = await Promise.all(
      ALLOWED_SLOTS.map(async (label) => {
        const count = await Appointment.countDocuments({ appointmentDate: date, appointmentSlot: label });
        return {
          slot: label,
          currentBookings: count,
          remaining: Math.max(0, MAX_CONCURRENT - count),
          isFull: count >= MAX_CONCURRENT,
        };
      })
    );

    return res.json({ success: true, date, capacity: MAX_CONCURRENT, slots });
  } catch (err) {
    console.error('getSlotsForDate error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      petName,
      petType,
      serviceType,
      appointmentDate,
      appointmentTime,
      note,
      supportId,
    } = req.body;

    // Basic validation — collect missing fields to return specific messages
    const missing = [];
    if (!customerName) missing.push('customerName');
    if (!customerPhone) missing.push('customerPhone');
    if (!petName) missing.push('petName');
    if (!petType) missing.push('petType');
    if (!appointmentDate) missing.push('appointmentDate');
    // accept either appointmentSlot (from frontend) or appointmentTime (legacy)
    const slotValue = (req.body && req.body.appointmentSlot) || appointmentTime;
    if (!slotValue) missing.push('appointmentSlot');
    if (missing.length > 0) {
      // map keys to friendly Vietnamese messages
      const map = {
        customerName: 'Vui lòng nhập họ và tên',
        customerPhone: 'Vui lòng nhập số điện thoại',
        petName: 'Vui lòng nhập tên thú cưng',
        petType: 'Vui lòng chọn loài thú cưng',
        appointmentDate: 'Vui lòng chọn ngày hẹn',
        appointmentSlot: 'Vui lòng chọn giờ hẹn',
      };
      const messages = missing.map((k) => map[k] || k);
      return res.status(400).json({ success: false, message: messages.join('; ') });
    }

    // Clean & validate incoming key fields
    const clean = (v) => (typeof v === 'string' ? v.trim() : (v || ''));
    const cleanedName = clean(customerName);
    const cleanedPhone = (customerPhone || '').toString().replace(/\D+/g, '');
    const cleanedPetName = clean(petName);

    // validate phone: VN mobile numbers starting with 03/05/07/08/09 and total 10 digits
    if (!/^(03|05|07|08|09)\d{8}$/.test(cleanedPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ' });
    }

    // validate full name: length 2..50, allow unicode letters, marks, spaces, dot, hyphen, apostrophe
    if (cleanedName.length < 2 || cleanedName.length > 50 || !/^[\p{L}\p{M}.'\- ]+$/u.test(cleanedName)) {
      return res.status(400).json({ success: false, message: 'Họ và tên không hợp lệ' });
    }

    // validate pet name: not empty, length <=40, allow letters, numbers, spaces
    if (cleanedPetName.length < 1 || cleanedPetName.length > 40 || !/^[\p{L}\p{M}0-9\- ]+$/u.test(cleanedPetName)) {
      return res.status(400).json({ success: false, message: 'Tên thú cưng không hợp lệ' });
    }

    // validate date format YYYY-MM-DD
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(appointmentDate)) {
      return res.status(400).json({ success: false, message: 'Invalid appointmentDate format' });
    }


    // validate slot field now (use previously derived slotValue)
    if (!slotValue || !/^[0-9]{2}:[0-9]{2}$/.test(slotValue)) {
      return res.status(400).json({ success: false, message: 'Invalid appointmentSlot format' });
    }
    if (!isSlotValid(slotValue)) {
      return res.status(400).json({ success: false, message: 'Appointment time is outside working hours or not a 30-min slot' });
    }

    // check date/time not in past
    const dt = dayjs(`${appointmentDate}T${slotValue}:00`);
    if (!dt.isValid()) {
      return res.status(400).json({ success: false, message: 'Invalid appointment datetime' });
    }
    if (dt.isBefore(dayjs())) {
      return res.status(400).json({ success: false, message: 'Cannot book past date/time' });
    }

    // count existing bookings for same date+slot
    const existingCount = await Appointment.countDocuments({ appointmentDate, appointmentSlot: slotValue });
    if (existingCount >= MAX_CONCURRENT) {
      return res.status(400).json({ success: false, message: 'Khung giờ này đã đầy' });
    }

    const appt = new Appointment({
      customerId,
      supportId: supportId || null,
      customerName: cleanedName,
      customerPhone: cleanedPhone,
      petName: cleanedPetName,
      petType,
      serviceType: serviceType || '',
      appointmentDate,
      appointmentSlot: slotValue,
      note: note || '',
    });

    await appt.save();

    return res.status(201).json({ success: true, data: appt });
  } catch (err) {
    console.error('createAppointment error', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
