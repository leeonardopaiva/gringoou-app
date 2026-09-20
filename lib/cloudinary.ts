export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() || '',
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim() || '',
};

export const isCloudinaryEnabled =
  Boolean(cloudinaryConfig.cloudName) && Boolean(cloudinaryConfig.uploadPreset);

export type CloudinaryFolder =
  | 'banners'
  | 'businesses'
  | 'events'
  | 'groups'
  | 'profiles'
  | 'community'
  | 'housing'
  | 'jobs';

export const getCloudinaryFolderPath = (folder: CloudinaryFolder) =>
  `emigrei/${folder}`;
