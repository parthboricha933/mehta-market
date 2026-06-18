export interface Product {
  id: string
  name: string
  description?: string
  price: number
  mrp?: number | null
  unit?: string
  images: string[]
  categoryId: string
  category?: { id: string; name: string; slug: string; icon?: string | null }
  stock: number
  isActive: boolean
  soldCount: number
  createdAt: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon?: string | null
  _count?: { products: number }
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  mobile: string
  address: string
  landmark?: string
  notes?: string
  items: OrderItem[]
  subtotal: number
  deliveryCharge: number
  total: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELIVERED'
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  image?: string | null
  product?: Product
}

export interface OfferPopup {
  enabled: boolean
  title: string
  description: string
  image: string
  ctaText: string
}

export interface ShopInfo {
  name: string
  city: string
  phone: string
  whatsapp: string
  address: string
  hours: string
  minOrderForFreeDelivery: number
  deliveryCharge: number
  deliveryArea: string
}
