const cloudinary = require("cloudinary").v2;
const UploadProvider = require("./uploadProvider");
const {
  cloudinaryCloudName,
  cloudinaryApiKey,
  cloudinaryApiSecret,
} = require("../config/env");

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: cloudinaryApiKey,
  api_secret: cloudinaryApiSecret,
});

class CloudinaryProvider extends UploadProvider {
  async upload({ buffer, key }) {
    const publicId = key.replace(/\.[^.]+$/, "");

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: "image",
          use_filename: false,
          unique_filename: false,
          overwrite: true,
          transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
        },
        (error, response) => {
          if (error) return reject(error);
          return resolve(response);
        },
      );

      stream.end(buffer);
    });

    return {
      url: result.secure_url,
      provider: "cloudinary",
      key: result.public_id,
    };
  }

  async delete({ key }) {
    const result = await cloudinary.uploader.destroy(key, {
      resource_type: "image",
      invalidate: true,
    });

    return {
      provider: "cloudinary",
      key,
      deleted: result.result === "ok" || result.result === "not found",
    };
  }
}

module.exports = CloudinaryProvider;
