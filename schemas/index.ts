import z from 'zod'

export const AddressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/)
