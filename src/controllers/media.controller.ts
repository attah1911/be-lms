import { Response } from "express";
import response from "../utils/response";
import uploader from "../utils/uploader";
import { CloudinaryResponse, IReqUser } from "../utils/interfaces";
import { ROLES } from "../utils/constant";

const mediaController = {
  /**
   * @swagger
   * /media/upload-single:
   *   post:
   *     tags: [Media]
   *     summary: Upload single file
   *     security:
   *       - bearerAuth: []
   *     consumes:
   *       - multipart/form-data
   *     parameters:
   *       - in: formData
   *         name: file
   *         type: file
   *         required: true
   *         description: File to upload
   */
  async single(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Media']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.consumes = ['multipart/form-data']
     #swagger.parameters['file'] = {
       in: 'formData',
       type: 'file',
       required: true,
       description: 'File to upload'
     }
     */
    try {
      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('multipart/form-data')) {
        return response.badRequest(res, "Invalid request format. Expected multipart/form-data");
      }

      const file = req.file;

      if (!file) {
        return response.badRequest(res, "Tidak ada file yang dipilih");
      }

      
      const result = await uploader.uploadSingle(file, req.user!.id) as CloudinaryResponse;
      
      const fileData = {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resource_type: result.resource_type,
        originalName: file.originalname,
        size: result.bytes,
        ...(result.resource_type === 'image' ? { 
          width: result.width, 
          height: result.height 
        } : {})
      };

      return response.success(res, fileData, "Sukses upload file");
    } catch (error: any) {
      if (error.message.includes("Cloudinary configuration")) {
        return response.error(res, error, "Konfigurasi upload tidak valid");
      }
      
      if (error.message.includes("buffer")) {
        return response.error(res, error, "File tidak dapat diproses");
      }

      const errorMessage = error.message || "Gagal upload file";
      return response.error(res, error, errorMessage);
    }
  },

  /**
   * @swagger
   * /media/upload-multiple:
   *   post:
   *     tags: [Media]
   *     summary: Upload multiple files
   *     security:
   *       - bearerAuth: []
   *     consumes:
   *       - multipart/form-data
   *     parameters:
   *       - in: formData
   *         name: files
   *         type: array
   *         items:
   *           type: file
   *         required: true
   *         description: Files to upload
   */
  async multiple(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Media']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.consumes = ['multipart/form-data']
     #swagger.parameters['files'] = {
       in: 'formData',
       type: 'array',
       items: {
         type: 'file'
       },
       required: true,
       description: 'Files to upload'
     }
     */
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || !files.length) {
        return response.badRequest(res, "Tidak ada file yang dipilih");
      }
      
      const results = await uploader.uploadMultiple(files, req.user!.id) as CloudinaryResponse[];
      
      const processedResults = results.map((result, index) => {
        return {
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          resource_type: result.resource_type,
          originalName: files[index].originalname,
          size: result.bytes,
          ...(result.resource_type === 'image' ? { 
            width: result.width, 
            height: result.height 
          } : {})
        };
      });
      
      return response.success(res, processedResults, "Sukses upload file");
    } catch (error) {
      return response.error(res, error, "Gagal upload file");
    }
  },

  /**
   * @swagger
   * /media/remove:
   *   delete:
   *     tags: [Media]
   *     summary: Delete file
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: fileUrl
   *         schema:
   *           type: string
   *         required: true
   *         description: URL of file to delete
   */
  async remove(req: IReqUser, res: Response) {
    /**
     #swagger.tags = ['Media']
     #swagger.security = [{
       "bearerAuth": []
     }]
     #swagger.parameters['fileUrl'] = {
       in: 'query',
       type: 'string',
       required: true,
       description: 'URL of file to delete'
     }
     */
    try {
      const { fileUrl } = req.query;

      if (!fileUrl || typeof fileUrl !== 'string') {
        return response.badRequest(res, "URL file tidak valid");
      }

      if (req.user?.role !== ROLES.ADMIN) {
        const owner = await uploader.getOwner(fileUrl);
        if (owner !== req.user?.id) {
          return response.unauthorized(res, "Anda tidak memiliki akses untuk menghapus file ini");
        }
      }

      const result = await uploader.remove(fileUrl);
      return response.success(res, result, "Sukses menghapus file");
    } catch (error) {
      return response.error(res, error, "Gagal menghapus file");
    }
  },
};

export default mediaController;
