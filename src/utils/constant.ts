export enum ROLES {
  ADMIN = "admin",
  GURU = "guru",
  MURID = "murid",
}

// Moved here from the (deleted) mataPelajaran Mongoose model.
export const TINGKAT_KELAS = {
  KELAS_7A: "7-A", KELAS_7B: "7-B", KELAS_7C: "7-C", KELAS_7D: "7-D",
  KELAS_7E: "7-E", KELAS_7F: "7-F", KELAS_7G: "7-G", KELAS_7H: "7-H",
  KELAS_8A: "8-A", KELAS_8B: "8-B", KELAS_8C: "8-C", KELAS_8D: "8-D",
  KELAS_8E: "8-E", KELAS_8F: "8-F", KELAS_8G: "8-G", KELAS_8H: "8-H",
  KELAS_9A: "9-A", KELAS_9B: "9-B", KELAS_9C: "9-C", KELAS_9D: "9-D",
  KELAS_9E: "9-E", KELAS_9F: "9-F", KELAS_9G: "9-G", KELAS_9H: "9-H",
} as const;

export const KATEGORI = {
  MATEMATIKA: "Matematika",
  IPA: "IPA",
  IPS: "IPS",
  BAHASA_INDONESIA: "Bahasa Indonesia",
  BAHASA_INGGRIS: "Bahasa Inggris",
  PENDIDIKAN_AGAMA: "Pendidikan Agama",
  PPKN: "PPKN",
  SENI_BUDAYA: "Seni Budaya",
  PENDIDIKAN_JASMANI: "Pendidikan Jasmani",
  PRAKARYA: "Prakarya",
} as const;

export type TingkatKelas = (typeof TINGKAT_KELAS)[keyof typeof TINGKAT_KELAS];
export type Kategori = (typeof KATEGORI)[keyof typeof KATEGORI];
