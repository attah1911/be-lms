import mongoose, { Schema } from "mongoose";
import * as Yup from "yup";

export const materiPelajaranDAO = Yup.object({
  judul: Yup.string().required(),
  konten: Yup.object({
    teks: Yup.string(),
    files: Yup.array().of(
      Yup.mixed().transform(value => {
        if (typeof value === 'string') {
          return value;
        } else if (value && typeof value === 'object' && value.url) {
          return value;
        }
        return value;
      })
    )
  }).required(),
  mataPelajaran: Yup.string().required(),
  order: Yup.number().required().min(1)
});

export interface MateriPelajaran {
  judul: string;
  konten: {
    teks?: string;
    files?: Array<string | { url: string; name: string }>;
  };
  mataPelajaran: mongoose.Types.ObjectId;
  order: number;
}

const MateriPelajaranSchema = new Schema<MateriPelajaran>(
  {
    judul: {
      type: String,
      required: true
    },
    konten: {
      teks: {
        type: String
      },
      files: [{
        type: Schema.Types.Mixed,
        validate: {
          validator: function(value: any) {
            return typeof value === 'string' || 
                  (typeof value === 'object' && value !== null && typeof value.url === 'string');
          },
          message: 'Files must be either a URL string or an object with a url property'
        }
      }]
    },
    mataPelajaran: {
      type: Schema.Types.ObjectId,
      ref: 'MataPelajaran',
      required: true
    },
    order: {
      type: Number,
      required: true,
      min: 1
    }
  },
  {
    timestamps: true
  }
);

MateriPelajaranSchema.index({ mataPelajaran: 1, order: 1 });

const MateriPelajaranModel = mongoose.model('MateriPelajaran', MateriPelajaranSchema);

export default MateriPelajaranModel;