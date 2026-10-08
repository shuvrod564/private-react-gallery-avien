import { v2 as cloudinary } from 'cloudinary';
import { serverEnv } from './env.js';

// Cloudinary server SDK — holds the API secret. Never imported by frontend code.
cloudinary.config({
  cloud_name: serverEnv.cloudinaryCloudName,
  api_key: serverEnv.cloudinaryApiKey,
  api_secret: serverEnv.cloudinaryApiSecret,
  secure: true,
});

export { cloudinary };
