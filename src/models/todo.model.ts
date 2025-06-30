import mongoose, { Schema, Document } from "mongoose";
import Joi from "joi";
import { ROLES } from "../utils/constant";

export interface ITodo extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TodoSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    dueDate: {
      type: Date,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const todoDAO = {
  validate: async (data: any) => {
    const schema = Joi.object({
      title: Joi.string().required().messages({
        "string.empty": "Judul tidak boleh kosong",
        "any.required": "Judul harus diisi",
      }),
      description: Joi.string().allow('', null),
      dueDate: Joi.date().allow(null),
      completed: Joi.boolean(),
    });

    try {
      await schema.validateAsync(data);
    } catch (error) {
      throw error;
    }
  },
};

export default mongoose.model<ITodo>("Todo", TodoSchema); 