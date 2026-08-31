import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    version: "v.0.0.1",
    title: "Dokumentasi API E-Learning",
    description: "Dokumentasi API E-Learning",
  },
  servers: [
    {
      url: "http://localhost:3000/api",
      description: "Local Server",
    },
    {
      url: "https://back-end-e-learning.vercel.app/api",
      description: "Deploy Server",
    },
  ],
  tags: [
    { name: "Auth" },
    { name: "User" },
    { name: "Teacher" },
    { name: "Student" },
    { name: "MataPelajaran" },
    { name: "MateriPelajaran" },
    { name: "Media" }
  ],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RegisterRequest"
              }
            }
          }
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginRequest"
              }
            }
          }
        }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user info",
        security: [{ bearerAuth: [] }]
      }
    },
    "/auth/activation": {
      post: {
        tags: ["Auth"],
        summary: "Activate user account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ActivationRequest"
              }
            }
          }
        }
      }
    },
    "/users/teachers": {
      get: {
        tags: ["Teacher"],
        summary: "Get all teachers",
        security: [{ bearerAuth: [] }]
      },
      post: {
        tags: ["Teacher"],
        summary: "Create a new teacher",
        security: [{ bearerAuth: [] }]
      }
    },
    "/users/students": {
      get: {
        tags: ["Student"],
        summary: "Get all students",
        security: [{ bearerAuth: [] }]
      },
      post: {
        tags: ["Student"],
        summary: "Create a new student",
        security: [{ bearerAuth: [] }]
      }
    },
    "/mata-pelajaran": {
      get: {
        tags: ["MataPelajaran"],
        summary: "Get all mata pelajaran",
        security: [{ bearerAuth: [] }]
      },
      post: {
        tags: ["MataPelajaran"],
        summary: "Create a new mata pelajaran",
        security: [{ bearerAuth: [] }]
      },
    },
    "/mata-pelajaran/{id}": {
      get: {
        tags: ["MataPelajaran"],
        summary: "Get mata pelajaran by ID",
        security: [{ bearerAuth: [] }]
      },
      put: {
        tags: ["MataPelajaran"],
        summary: "Update mata pelajaran by ID",
        security: [{ bearerAuth: [] }]
      },
      delete: {
        tags: ["MataPelajaran"],
        summary: "Delete mata pelajaran by ID",
        security: [{ bearerAuth: [] }]
      },
    },
    "/mata-pelajaran/{mataPelajaranId}/materi": {
      get: {
        tags: ["MateriPelajaran"],
        summary: "Get all materi pelajaran for a mata pelajaran",
        security: [{ bearerAuth: [] }]
      },
      post: {
        tags: ["MateriPelajaran"],
        summary: "Create a new materi pelajaran for a mata pelajaran",
        security: [{ bearerAuth: [] }]
      },
    },
    "/mata-pelajaran/{mataPelajaranId}/materi/{id}": {
      get: {
        tags: ["MateriPelajaran"],
        summary: "Get materi pelajaran by ID",
        security: [{ bearerAuth: [] }]
      },
      put: {
        tags: ["MateriPelajaran"],
        summary: "Update materi pelajaran by ID",
        security: [{ bearerAuth: [] }]
      },
      delete: {
        tags: ["MateriPelajaran"],
        summary: "Delete materi pelajaran by ID",
        security: [{ bearerAuth: [] }]
      },
    },
    "/media/upload-single": {
      post: {
        tags: ["Media"],
        summary: "Upload a single file",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: {
                    type: "string",
                    format: "binary"
                  }
                }
              }
            }
          }
        }
      }
    },
    "/media/upload-multiple": {
      post: {
        tags: ["Media"],
        summary: "Upload multiple files",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  files: {
                    type: "array",
                    items: {
                      type: "string",
                      format: "binary"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/media/remove": {
      delete: {
        tags: ["Media"],
        summary: "Remove a file",
        security: [{ bearerAuth: [] }]
      }
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
      },
    },
    schemas: {
      LoginRequest: {
        identifier: "admin@smpn37.sch.id",
        password: "Admin123"
      },
      RegisterRequest: {
        fullName: "Budi Santoso",
        username: "budisantoso",
        email: "budi@example.com",
        password: "Password123",
        confirmPassword: "Password123"
      },
      ActivationRequest: {
        code: "abcdef"
      },
      CreateUserRequest: {
        fullName: "John Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "Password123",
        role: "ADMIN"
      },
      UpdateUserRequest: {
        fullName: "John Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "NewPassword123",
        role: "ADMIN"
      },
      CreateTeacherRequest: {
        fullName: "Teacher Name",
        email: "teacher@example.com",
        nrk: "1234567890",
        noTelp: "081234567890"
      },
      UpdateTeacherRequest: {
        fullName: "Teacher Name",
        email: "teacher@example.com",
        nrk: "1234567890",
        noTelp: "081234567890"
      },
      CreateStudentRequest: {
        fullName: "Student Name",
        email: "student@example.com",
        nis: "1234567890",
        kelas: "X IPA 1",
        noTelp: "081234567890"
      },
      UpdateStudentRequest: {
        fullName: "Student Name",
        email: "student@example.com",
        nis: "1234567890",
        kelas: "X IPA 1",
        noTelp: "081234567890"
      },
      CreateMataPelajaranRequest: {
        judul: "Matematika Dasar",
        deskripsi: "Pelajaran matematika dasar",
        kategori: "KELAS_7" // Pilihan: KELAS_7, KELAS_8, KELAS_9
      },
      UpdateMataPelajaranRequest: {
        judul: "Matematika Dasar",
        deskripsi: "Pelajaran matematika dasar",
        kategori: "KELAS_7" // Pilihan: KELAS_7, KELAS_8, KELAS_9
      },
      CreateMateriPelajaranRequest: {
        judul: "Persamaan Linear",
        deskripsi: "Materi tentang persamaan linear",
        konten: "Konten materi dalam format HTML",
        order: 1
      },
      UpdateMateriPelajaranRequest: {
        judul: "Persamaan Linear",
        deskripsi: "Materi tentang persamaan linear",
        konten: "Konten materi dalam format HTML",
        order: 1
      }
    }
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const outputFile = "./swagger-output.json";
const endpointsFiles = ["../routes/api.ts"];

swaggerAutogen({ openapi: "3.0.0" })(outputFile, endpointsFiles, doc);
