// src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from 'react-query'
import api from '@/lib/api'
import { Product } from '@/types'

export function useMyProducts() {
  return useQuery<Product[]>('my-products', async () => {
    const { data } = await api.get('/products')
    return data.products
  })
}

export function useProduct(slug: string) {
  return useQuery<Product>(['product', slug], async () => {
    const { data } = await api.get(`/products/slug/${slug}`)
    return data.product
  }, { enabled: !!slug })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation(
    async (body: { title: string; description?: string; price: number; type: string }) => {
      const { data } = await api.post('/products', body)
      return data.product
    },
    { onSuccess: () => qc.invalidateQueries('my-products') }
  )
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation(
    async ({ id, ...body }: { id: string; [key: string]: any }) => {
      const { data } = await api.patch(`/products/${id}`, body)
      return data.product
    },
    { onSuccess: () => qc.invalidateQueries('my-products') }
  )
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation(
    async (id: string) => api.delete(`/products/${id}`),
    { onSuccess: () => qc.invalidateQueries('my-products') }
  )
}
