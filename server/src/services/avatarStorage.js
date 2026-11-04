import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";

export const uploadAvatarToCloudinary = (buffer, userId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "edunexa/avatars",
        public_id: `user-${userId}`,
        overwrite: true,
        invalidate: true,
        resource_type: "image",
        transformation: [
          {
            width: 512,
            height: 512,
            crop: "limit",
          },
        ],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};