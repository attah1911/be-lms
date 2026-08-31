import * as Yup from "yup";
import { ROLES, TINGKAT_KELAS, KATEGORI } from "./utils/constant";

// All request-body validation schemas. Previously scattered across the Mongoose
// model files (src/models/*.model.ts) and inline in auth.controller.

// ─────────────────────────────  Auth / User  ─────────────────────────────

const passwordValidation = Yup.string()
  .min(6, "Password setidaknya harus 6 karakter")
  .test(
    "at-least-one-uppercase-letter",
    "Password harus memiliki setidaknya satu huruf kapital",
    (value) => !!value && /[A-Z]/.test(value)
  )
  .test(
    "at-least-one-number",
    "Password harus memiliki setidaknya satu angka",
    (value) => !!value && /\d/.test(value)
  );

export const registerDAO = Yup.object({
  fullName: Yup.string().required(),
  username: Yup.string().required(),
  email: Yup.string().email().required(),
  password: passwordValidation.required(),
  confirmPassword: Yup.string()
    .required()
    .oneOf([Yup.ref("password"), ""], "Password tidak sesuai"),
});

export const userDAO = Yup.object({
  fullName: Yup.string().required(),
  username: Yup.string().required(),
  email: Yup.string().email().required(),
  password: passwordValidation.required(),
  role: Yup.string().oneOf([ROLES.ADMIN, ROLES.GURU, ROLES.MURID]).required(),
  profilePicture: Yup.string(),
  isActive: Yup.boolean(),
});

export const userUpdateDAO = Yup.object({
  fullName: Yup.string().required("Nama lengkap harus diisi"),
  username: Yup.string().required("Username harus diisi"),
  email: Yup.string().email("Format email tidak valid").required("Email harus diisi"),
  profilePicture: Yup.string().nullable(),
});

// ─────────────────────────────  Teacher / Student  ──────────────────────

export const teacherDAO = Yup.object({
  fullName: Yup.string().required(),
  email: Yup.string().email().required(),
  nrk: Yup.string().required(),
  noTelp: Yup.string().required(),
});

export const studentDAO = Yup.object({
  fullName: Yup.string().required(),
  email: Yup.string().email().required(),
  nis: Yup.string().required(),
  kelas: Yup.string().required(),
  noTelp: Yup.string().required(),
});

// ─────────────────────────────  Mata / Materi Pelajaran  ────────────────

export const mataPelajaranDAO = Yup.object({
  judul: Yup.string().required("Judul mata pelajaran wajib diisi"),
  deskripsi: Yup.string().required("Deskripsi mata pelajaran wajib diisi"),
  tingkatKelas: Yup.string()
    .oneOf(Object.values(TINGKAT_KELAS), "Tingkat kelas tidak valid")
    .required("Tingkat kelas wajib diisi"),
  kategori: Yup.string()
    .oneOf(Object.values(KATEGORI), "Kategori mata pelajaran tidak valid")
    .required("Kategori mata pelajaran wajib diisi"),
  guru: Yup.string().required("Guru pengajar wajib diisi"),
});

export const materiPelajaranDAO = Yup.object({
  judul: Yup.string().required(),
  konten: Yup.object({
    teks: Yup.string(),
    files: Yup.array().of(Yup.mixed()),
  }).required(),
  order: Yup.number().min(1),
});

// ─────────────────────────────  Assignment  ─────────────────────────────

export const assignmentDAO = Yup.object({
  title: Yup.string().required("Title is required"),
  description: Yup.string().required("Description is required"),
  deadline: Yup.date().required("Deadline is required"),
  materiId: Yup.string().required("Materi ID is required"),
  mataPelajaranId: Yup.string().required("Mata Pelajaran ID is required"),
  attachments: Yup.array()
    .of(Yup.object({ url: Yup.string().required(), name: Yup.string().required() }))
    .optional(),
});

// ─────────────────────────────  Todo  ──────────────────────────────────

export const todoDAO = Yup.object({
  title: Yup.string().required("Judul tidak boleh kosong"),
  description: Yup.string().nullable(),
  dueDate: Yup.date().nullable(),
  completed: Yup.boolean(),
});
