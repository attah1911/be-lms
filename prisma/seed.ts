import "dotenv/config";
import { prisma } from "../src/utils/prisma";
import { encrypt } from "../src/utils/encryption";

// Demo passwords (see README): admin=Admin123, all guru=Guru123, all murid=Murid123
const PW = { admin: "Admin123", guru: "Guru123", murid: "Murid123" };

const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);

async function seedGuru(fullName: string, email: string, nrk: string) {
  const user = await prisma.user.create({
    data: {
      fullName,
      username: email.split("@")[0],
      email,
      password: encrypt(PW.guru),
      role: "guru",
      isActive: true,
    },
  });
  return prisma.teacher.create({
    data: { fullName, email, nrk, noTelp: "081100" + nrk, userId: user.id },
  });
}

async function seedMurid(fullName: string, email: string, nis: string, kelas: string) {
  const user = await prisma.user.create({
    data: {
      fullName,
      username: email.split("@")[0],
      email,
      password: encrypt(PW.murid),
      role: "murid",
      isActive: true,
    },
  });
  return prisma.student.create({
    data: { fullName, email, nis, kelas, noTelp: "082200" + nis, userId: user.id },
  });
}

async function main() {
  // Clean slate — deleting users cascades to teachers/students and everything below.
  await prisma.notification.deleteMany();
  await prisma.mataPelajaran.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      fullName: "Admin Sekolah",
      username: "admin",
      email: "admin@smpn37.sch.id",
      password: encrypt(PW.admin),
      role: "admin",
      isActive: true,
    },
  });

  const [budi, siti, ahmad] = await Promise.all([
    seedGuru("Budi Santoso", "budi@smpn37.sch.id", "197001"),
    seedGuru("Siti Rahayu", "siti@smpn37.sch.id", "198202"),
    seedGuru("Ahmad Wijaya", "ahmad@smpn37.sch.id", "199003"),
  ]);

  const [andi, bella, citra, deni, eka, fajar] = await Promise.all([
    seedMurid("Andi Pratama", "andi@murid.smpn37.sch.id", "70001", "7-A"),
    seedMurid("Bella Kusuma", "bella@murid.smpn37.sch.id", "70002", "7-A"),
    seedMurid("Citra Lestari", "citra@murid.smpn37.sch.id", "70003", "7-B"),
    seedMurid("Deni Saputra", "deni@murid.smpn37.sch.id", "80001", "8-A"),
    seedMurid("Eka Putri", "eka@murid.smpn37.sch.id", "80002", "8-A"),
    seedMurid("Fajar Nugroho", "fajar@murid.smpn37.sch.id", "90001", "9-A"),
  ]);

  // Mata pelajaran + materi (order matters within a subject)
  const mtk7 = await prisma.mataPelajaran.create({
    data: {
      judul: "Matematika 7-A",
      deskripsi: "Matematika dasar untuk kelas 7-A: bilangan, pecahan, aljabar.",
      tingkatKelas: "7-A",
      kategori: "Matematika",
      guruId: budi.id,
      materiPelajaran: {
        create: [
          { judul: "Bilangan Bulat", kontenTeks: "Pengertian bilangan bulat, garis bilangan, dan operasinya.", order: 1 },
          { judul: "Operasi Hitung Pecahan", kontenTeks: "Penjumlahan, pengurangan, perkalian, dan pembagian pecahan.", order: 2 },
        ],
      },
    },
    include: { materiPelajaran: true },
  });

  const mtk8 = await prisma.mataPelajaran.create({
    data: {
      judul: "Matematika 8-A",
      deskripsi: "Matematika kelas 8-A: Pythagoras dan sistem persamaan linear.",
      tingkatKelas: "8-A",
      kategori: "Matematika",
      guruId: budi.id,
      materiPelajaran: {
        create: [
          { judul: "Teorema Pythagoras", kontenTeks: "Hubungan sisi-sisi pada segitiga siku-siku.", order: 1 },
          { judul: "Sistem Persamaan Linear Dua Variabel", kontenTeks: "Metode substitusi dan eliminasi.", order: 2 },
        ],
      },
    },
    include: { materiPelajaran: true },
  });

  const ipa7 = await prisma.mataPelajaran.create({
    data: {
      judul: "IPA Terpadu 7-A",
      deskripsi: "Ilmu Pengetahuan Alam untuk kelas 7-A.",
      tingkatKelas: "7-A",
      kategori: "IPA",
      guruId: siti.id,
      materiPelajaran: {
        create: [
          { judul: "Klasifikasi Makhluk Hidup", kontenTeks: "Kingdom, ciri-ciri, dan dasar pengelompokan makhluk hidup.", order: 1 },
          { judul: "Suhu dan Kalor", kontenTeks: "Konsep suhu, termometer, perpindahan kalor.", order: 2 },
        ],
      },
    },
    include: { materiPelajaran: true },
  });

  const bind7 = await prisma.mataPelajaran.create({
    data: {
      judul: "Bahasa Indonesia 7-A",
      deskripsi: "Bahasa Indonesia untuk kelas 7-A: teks deskripsi dan prosedur.",
      tingkatKelas: "7-A",
      kategori: "Bahasa Indonesia",
      guruId: ahmad.id,
      materiPelajaran: {
        create: [
          { judul: "Teks Deskripsi", kontenTeks: "Struktur dan ciri kebahasaan teks deskripsi.", order: 1 },
          { judul: "Teks Prosedur", kontenTeks: "Langkah-langkah menulis teks prosedur.", order: 2 },
        ],
      },
    },
    include: { materiPelajaran: true },
  });

  const bing9 = await prisma.mataPelajaran.create({
    data: {
      judul: "Bahasa Inggris 9-A",
      deskripsi: "English for grade 9-A: narrative and report text.",
      tingkatKelas: "9-A",
      kategori: "Bahasa Inggris",
      guruId: ahmad.id,
      materiPelajaran: {
        create: [
          { judul: "Narrative Text", kontenTeks: "Generic structure: orientation, complication, resolution.", order: 1 },
          { judul: "Report Text", kontenTeks: "General classification and description.", order: 2 },
        ],
      },
    },
    include: { materiPelajaran: true },
  });

  // Assignments (one includes a past deadline so the grading screen has data)
  const materiOf = (mp: typeof mtk7, order: number) =>
    mp.materiPelajaran.find((m) => m.order === order)!;

  const [tugasBindo] = await Promise.all([
    prisma.assignment.create({
      data: {
        title: "Menulis Teks Deskripsi",
        description: "Tulis satu paragraf teks deskripsi tentang lingkungan sekolahmu.",
        deadline: daysFromNow(-2),
        materiId: materiOf(bind7, 1).id,
        mataPelajaranId: bind7.id,
      },
    }),
    prisma.assignment.create({
      data: {
        title: "Latihan Soal Bilangan Bulat",
        description: "Kerjakan soal 1-10 pada buku paket halaman 24.",
        deadline: daysFromNow(7),
        materiId: materiOf(mtk7, 1).id,
        mataPelajaranId: mtk7.id,
      },
    }),
    prisma.assignment.create({
      data: {
        title: "Tugas Teorema Pythagoras",
        description: "Buktikan teorema Pythagoras dengan dua cara berbeda.",
        deadline: daysFromNow(10),
        materiId: materiOf(mtk8, 1).id,
        mataPelajaranId: mtk8.id,
      },
    }),
    prisma.assignment.create({
      data: {
        title: "Laporan Pengamatan Makhluk Hidup",
        description: "Amati 5 makhluk hidup di sekitarmu dan klasifikasikan.",
        deadline: daysFromNow(5),
        materiId: materiOf(ipa7, 1).id,
        mataPelajaranId: ipa7.id,
      },
    }),
  ]);

  // Enrollments
  await prisma.enrollment.createMany({
    data: [
      { studentId: andi.id, mataPelajaranId: mtk7.id },
      { studentId: andi.id, mataPelajaranId: ipa7.id },
      { studentId: andi.id, mataPelajaranId: bind7.id },
      { studentId: bella.id, mataPelajaranId: mtk7.id },
      { studentId: bella.id, mataPelajaranId: ipa7.id },
      { studentId: citra.id, mataPelajaranId: bind7.id },
      { studentId: deni.id, mataPelajaranId: mtk8.id },
      { studentId: eka.id, mataPelajaranId: mtk8.id },
      { studentId: fajar.id, mataPelajaranId: bing9.id },
    ],
  });

  // Submissions on the past-deadline assignment: one graded, one pending review
  await prisma.submission.create({
    data: {
      assignmentId: tugasBindo.id,
      studentId: andi.id,
      fileUrl: "https://example.com/demo/andi-teks-deskripsi.pdf",
      fileName: "andi-teks-deskripsi.pdf",
      status: "reviewed",
      score: 85,
      feedback: "Struktur sudah baik, perhatikan penggunaan kata sifat.",
      submittedAt: daysFromNow(-3),
    },
  });
  await prisma.submission.create({
    data: {
      assignmentId: tugasBindo.id,
      studentId: citra.id,
      fileUrl: "https://example.com/demo/citra-teks-deskripsi.pdf",
      fileName: "citra-teks-deskripsi.pdf",
      status: "submitted",
      submittedAt: daysFromNow(-2),
    },
  });

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.teacher.count(),
    prisma.student.count(),
    prisma.mataPelajaran.count(),
    prisma.materiPelajaran.count(),
    prisma.assignment.count(),
    prisma.enrollment.count(),
    prisma.submission.count(),
  ]);

  console.log("Seed complete:");
  console.log(`  users=${counts[0]} teachers=${counts[1]} students=${counts[2]}`);
  console.log(`  mataPelajaran=${counts[3]} materi=${counts[4]} assignments=${counts[5]}`);
  console.log(`  enrollments=${counts[6]} submissions=${counts[7]}`);
  console.log("Logins — admin@smpn37.sch.id / Admin123, budi@smpn37.sch.id / Guru123, andi@murid.smpn37.sch.id / Murid123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
