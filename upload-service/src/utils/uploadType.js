const TYPE_TO_PROVIDER = {
  avatar: "s3",
  product: "s3",
  chat: "cloudinary",
  payment: "cloudinary",
};

const TYPE_TO_FOLDER = {
  avatar: "avatars",
  product: "products",
  chat: "chats",
  payment: "petfood/payment",
};

const resolveProviderByType = (type) => TYPE_TO_PROVIDER[type] || null;
const resolveFolderByType = (type) => TYPE_TO_FOLDER[type] || null;

module.exports = {
  resolveProviderByType,
  resolveFolderByType,
};
