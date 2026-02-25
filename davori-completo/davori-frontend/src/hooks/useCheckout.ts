// src/hooks/useCheckout.ts
import { useMutation, useQuery } from 'react-query'
import api from '@/lib/api'
import { Order, PaymentData, Enrollment } from '@/types'

interface CheckoutInput {
  productId: string
  paymentMethod: 'CARD' | 'PIX' | 'BOLETO'
  customer: { name: string; email: string; document: string }
  card?: { token: string; installments?: number }
  affiliateCode?: string
}

interface CheckoutResult {
  order: Order
  paymentData: PaymentData
}

export function useCheckout() {
  return useMutation<CheckoutResult, Error, CheckoutInput>(async (body) => {
    const { data } = await api.post('/orders', body)
    return data
  })
}

export function useOrderStatus(orderId: string, enabled: boolean) {
  return useQuery<Order>(
    ['order-status', orderId],
    async () => {
      const { data } = await api.get(`/orders/${orderId}/status`)
      return data.order
    },
    {
      enabled: enabled && !!orderId,
      refetchInterval: (data) => {
        // Para de fazer polling quando o pagamento for confirmado
        if (data?.status === 'PAID' || data?.status === 'FAILED') return false
        return 3000 // Polling a cada 3s
      },
    }
  )
}

export function useMyEnrollments() {
  return useQuery<Enrollment[]>('my-enrollments', async () => {
    const { data } = await api.get('/enrollments/me')
    return data.enrollments
  })
}

export function useMarkProgress() {
  return useMutation(async (body: { productId: string; lessonId: string }) => {
    const { data } = await api.post('/enrollments/progress', body)
    return data.enrollment
  })
}
