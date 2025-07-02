import multer from "multer";

import { Request, Response, NextFunction } from "express";

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_DOCUMENT_TYPES = [
  // PDF
  'application/pdf',
  // Word documents
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel sheets
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // PowerPoint presentations
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text files
  'text/plain',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  // Audio 
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  // Video
  'video/mp4',
  'video/mpeg',
  'video/webm'
];

const storage = multer.memoryStorage();
const multerUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
  fileFilter: (_req, file, cb) => {
   
    if (file.fieldname === 'avatar' || file.fieldname === 'profile') {
      
      if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('File harus berupa gambar (JPG, PNG, GIF)'));
      }
    } else {
     
      if ([...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES].includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Format file tidak didukung. Gunakan file gambar, dokumen, atau media yang umum.'));
      }
    }
  },
});


const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer error:", err);
    

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        meta: {
          status: 400,
          message: `Ukuran file terlalu besar (maksimal 10MB)`
        },
        data: null
      });
    }
    
    return res.status(400).json({
      meta: {
        status: 400,
        message: `Error uploading file: ${err.message}`
      },
      data: null
    });
  }
  
  if (err) {
    console.error("Unknown error in media middleware:", err);
    return res.status(500).json({
      meta: {
        status: 500,
        message: err.message || "Gagal memproses file"
      },
      data: null
    });
  }
  
  next();
};

export default {
  single(fieldName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      multerUpload.single(fieldName)(req, res, (err) => {
        if (err) {
          return handleMulterError(err, req, res, next);
        }
        next();
      });
    };
  },
  multiple(fieldName: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      multerUpload.array(fieldName)(req, res, (err) => {
        if (err) {
          return handleMulterError(err, req, res, next);
        }
        next();
      });
    };
  },
};