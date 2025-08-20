import { z } from 'zod'

export const YearnFiSchema = z.object({
  name: z.string().default('YearnFi Content'),
  tagline: z.string().default("Defi's yield aggregator"),
})

export type YearnFi = z.infer<typeof YearnFiSchema>
