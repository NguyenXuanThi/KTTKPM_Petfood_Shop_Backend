const crypto = require("crypto");
const { vnpay } = require("../config/env");

const formatDate = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
};

const createSignature = (data, secret) => {
  return crypto.createHmac("sha512", secret).update(data).digest("hex");
};

const buildQueryString = (params) => {
  return Object.keys(params)
    .sort()
    .map(
      (key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`,
    )
    .join("&");
};

const createPaymentUrl = ({
  txnRef,
  amount,
  orderInfo,
  ipAddr,
  locale = "vn",
}) => {
  const now = new Date();

  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: vnpay.tmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "other",
    vnp_Amount: amount * 100,
    vnp_ReturnUrl: vnpay.returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: formatDate(now),
  };

  const queryString = buildQueryString(params);
  const signature = createSignature(queryString, vnpay.hashSecret);

  return `${vnpay.url}?${queryString}&vnp_SecureHash=${signature}`;
};

const verifyReturnUrl = (query) => {
  const { vnp_SecureHash, vnp_SecureHashType, ...params } = query;

  const queryString = buildQueryString(params);
  const expectedHash = createSignature(queryString, vnpay.hashSecret);

  return vnp_SecureHash === expectedHash;
};

module.exports = {
  createPaymentUrl,
  verifyReturnUrl,
};
