// src/types/index.ts

export interface User {
  id: string
  name: string
  email: string
  role: 'PRODUCER' | 'STUDENT' | 'ADMIN'
  avatarUrl: string | null
  createdAt: string
}

export interface Product {
  id: string
  producerId: string
  title: string
  slug: string
  description: string | null
  price: number
  type: 'COURSE' | 'EBOOK' | 'MENTORING' | 'WORKSHOP'
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  coverUrl: string | null
  createdAt: string
  producer?: Pick<User, 'id' | 'name' | 'avatarUrl'>
  _count?: { enrollments: number; orders: number }
}

export interface Order {
  id: string
  status: 'PENDING' | 'PAID' | 'REFUNDED' | 'CANCELLED' | 'FAILED'
  paymentMethod: 'CARD' | 'PIX' | 'BOLETO'
  amount: number
  productId: string
}

export interface PaymentData {
  pixQrCode: string | null
  pixQrCodeUrl: string | null
  boletoPdf: string | null
  boletoBarcode: string | null
}

export interface Enrollment {
  id: string
  studentId: string
  productId: string
  progress: number
  enrolledAt: string
  product: Product & { _count: { lessons: number } }
}

export interface ApiError {
  code: string
  message: string
  errors?: Array<{ field: string; message: string }>
}
