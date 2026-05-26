const axios = require('axios');
const config = require('../config/env');

const BASE = () => config.APPOINTMENT_SERVICE_URL;

/** "8h30", "8:30" → "08:30" */
function normalizeSlot(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const t = timeStr.trim().replace(/h/gi, ':').replace(/\s/g, '');
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const min = m[2];
  if (hour < 0 || hour > 23 || Number(min) > 59) return null;
  return `${String(hour).padStart(2, '0')}:${min}`;
}

/** Chuẩn hóa SĐT VN 10 số (03/05/07/08/09...) */
function normalizePhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 9 && /^[35789]/.test(digits)) {
    digits = `0${digits}`;
  }
  return digits;
}

const PET_TYPE_MAP = {
  chó: 'dog',
  cho: 'dog',
  dog: 'dog',
  mèo: 'cat',
  meo: 'cat',
  cat: 'cat',
  hamster: 'hamster',
  'chuột hamster': 'hamster',
  thỏ: 'rabbit',
  tho: 'rabbit',
  rabbit: 'rabbit',
  sóc: 'squirrel',
  soc: 'squirrel',
  squirrel: 'squirrel',
  khác: 'other',
  khac: 'other',
  other: 'other',
};

function mapPetType(petType) {
  const key = String(petType || '')
    .trim()
    .toLowerCase();
  return PET_TYPE_MAP[key] || petType;
}

function formatConfirmationId(mongoId) {
  const suffix = String(mongoId || '')
    .replace(/[^a-fA-F0-9]/g, '')
    .slice(-5)
    .toUpperCase();
  return `APT-${suffix || '00000'}`;
}

const appointmentClient = {
  async getSlotsForDate(date) {
    const { data } = await axios.get(`${BASE()}/api/appointments/slots`, {
      params: { date },
      timeout: 8000,
    });
    if (!data?.success) {
      return { success: false, message: data?.message || 'Không lấy được khung giờ' };
    }
    const availableSlots = (data.slots || [])
      .filter((s) => !s.isFull && (s.remaining ?? 0) > 0)
      .map((s) => s.slot);
    return {
      success: true,
      date: data.date || date,
      capacity: data.capacity,
      availableSlots,
      slots: data.slots,
    };
  },

  async createAppointment({
    customerId,
    customerName,
    customerPhone,
    petName,
    petType,
    serviceType,
    appointmentDate,
    appointmentSlot,
    note,
  }) {
    const { data, status } = await axios.post(
      `${BASE()}/api/appointments`,
      {
        customerId,
        customerName,
        customerPhone,
        petName,
        petType,
        serviceType,
        appointmentDate,
        appointmentSlot,
        note: note || 'Đặt lịch qua AI chat',
        supportId: null,
      },
      { timeout: 10000, validateStatus: () => true },
    );

    if (status >= 200 && status < 300 && data?.success && data.data) {
      const appt = data.data;
      return {
        success: true,
        data: appt,
        appointmentId: formatConfirmationId(appt._id),
      };
    }

    return {
      success: false,
      message: data?.message || 'Không thể lưu lịch hẹn',
      status,
    };
  },
};

module.exports = {
  appointmentClient,
  normalizeSlot,
  normalizePhone,
  mapPetType,
  formatConfirmationId,
};
