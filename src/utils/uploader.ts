import { v2 as cloudinary } from "cloudinary";

import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from "./env";

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// test

const getFolderByFile = (file: Express.Multer.File): string => {
  if (file.fieldname === 'avatar' || file.fieldname === 'profile') {
    return 'profile-pictures';
  }
  
  if (file.mimetype.startsWith('image/')) {
    return 'images';
  }
  
  if (file.mimetype.startsWith('video/')) {
    return 'videos';
  }
  
  if (file.mimetype.startsWith('audio/')) {
    return 'audio';
  }
  
  if (file.mimetype.includes('pdf')) {
    return 'documents/pdf';
  }
  
  if (file.mimetype.includes('word') || file.mimetype.includes('msword')) {
    return 'documents/word';
  }
  
  if (file.mimetype.includes('excel') || file.mimetype.includes('spreadsheet')) {
    return 'documents/excel';
  }
  
  if (file.mimetype.includes('powerpoint') || file.mimetype.includes('presentation')) {
    return 'documents/presentations';
  }
  
  if (file.mimetype.includes('zip') || file.mimetype.includes('rar') || file.mimetype.includes('compressed')) {
    return 'documents/archives';
  }
  
  return 'materials';
};

const getTransformationOptions = (file: Express.Multer.File) => {
  if (file.mimetype.startsWith('image/')) {
    if (file.fieldname === 'avatar' || file.fieldname === 'profile') {
      return [
        { width: 400, height: 400, crop: "fill" },
        { quality: "auto" }
      ];
    }
    
    return [
      { quality: "auto" },
      { fetch_format: "auto" }
    ];
  }
  
  return [];
};

const toDataURL = (file: Express.Multer.File) => {
  try {
    if (!file.buffer) {
      throw new Error("No file buffer found");
    }
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURL = `data:${file.mimetype};base64,${b64}`;
    return dataURL;
  } catch (error) {
    console.error("Error converting file to data URL:", error);
    throw new Error("Failed to process file");
  }
};

const getPublicIdFromFileUrl = (fileUrl: string) => {
  const pathParts = fileUrl.split('/');
  const fileName = pathParts[pathParts.length - 1];
  
  const publicId = fileName.split('.')[0];
  
  return publicId;
};

export default {
  async uploadSingle(file: Express.Multer.File) {
    try {
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        throw new Error("Cloudinary configuration is incomplete");
      }
      
      const folder = getFolderByFile(file);
      const transformations = getTransformationOptions(file);
      
      const resourceType = file.mimetype.includes('pdf') ? 'raw' : 'auto';
      
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: folder,
            transformation: transformations,
            public_id: `${Date.now()}_${file.originalname.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_")}`
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
  
        uploadStream.end(file.buffer);
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      throw error;
    }
  },
  
  async uploadMultiple(files: Express.Multer.File[]) {
    const uploadBatch = files.map((item) => {
      const result = this.uploadSingle(item);
      return result;
    });
    const results = await Promise.all(uploadBatch);
    return results;
  },

  async remove(fileUrl: string) {
    try {
      const urlParts = fileUrl.split('/');
      
      let folderIndex = -1;
      for (let i = 0; i < urlParts.length; i++) {
        if (urlParts[i] === 'documents' || 
            urlParts[i] === 'images' || 
            urlParts[i] === 'videos' || 
            urlParts[i] === 'audio' || 
            urlParts[i] === 'materials' || 
            urlParts[i] === 'profile-pictures') {
          folderIndex = i;
          break;
        }
      }
      
      if (folderIndex === -1) {
        const publicId = getPublicIdFromFileUrl(fileUrl);
        return await cloudinary.uploader.destroy(publicId);
      }
      
      const publicIdParts = urlParts.slice(folderIndex);
      const lastPart = publicIdParts[publicIdParts.length - 1];
      publicIdParts[publicIdParts.length - 1] = lastPart.split('.')[0];
      
      const publicId = publicIdParts.join('/');
      
      let resourceType = 'image';
      if (fileUrl.includes('/video/') || fileUrl.includes('/videos/')) {
        resourceType = 'video';
      } else if (fileUrl.includes('/raw/') || 
                fileUrl.includes('/documents/') || 
                fileUrl.includes('/materials/')) {
        resourceType = 'raw';
      }
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
      
      return result;
    } catch (error) {
      console.error("Error deleting file from Cloudinary:", error);
      throw error;
    }
  },
};