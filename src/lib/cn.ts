import clsx, { type ClassValue } from 'clsx'

/** Une clases condicionales: cn('px-4', activo && 'bg-raised'). */
export const cn = (...inputs: ClassValue[]) => clsx(inputs)
