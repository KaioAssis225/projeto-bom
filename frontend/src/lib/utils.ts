import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDecimal(value: number | string, places: number = 2): string {
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  })
}

export function formatCurrency(value: number | string): string {
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function itemTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    RAW_MATERIAL: 'Matéria-Prima',
    FINISHED_PRODUCT: 'Produto Acabado',
    SEMI_FINISHED: 'Semiacabado',
    PACKAGING: 'Embalagem',
    SERVICE: 'Serviço',
  }
  return labels[type] ?? type
}

export function itemTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    RAW_MATERIAL: 'bg-blue-100 text-blue-800',
    FINISHED_PRODUCT: 'bg-green-100 text-green-800',
    SEMI_FINISHED: 'bg-orange-100 text-orange-800',
    PACKAGING: 'bg-purple-100 text-purple-800',
    SERVICE: 'bg-gray-100 text-gray-700',
  }
  return colors[type] ?? 'bg-gray-100 text-gray-700'
}

export function statusBadgeColor(status: 'SUCCESS' | 'ERROR' | 'PARTIAL'): string {
  const colors = {
    SUCCESS: 'bg-green-100 text-green-800',
    ERROR: 'bg-red-100 text-red-800',
    PARTIAL: 'bg-yellow-100 text-yellow-800',
  }
  return colors[status]
}

export function supplierLabel(supplier: { name: string } | null | undefined): string {
  return supplier?.name ?? "—"
}

export function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { detail?: string; message?: string } } }).response
    return response?.data?.detail ?? response?.data?.message ?? 'Erro inesperado'
  }
  if (err instanceof Error) return err.message
  return 'Erro inesperado'
}
