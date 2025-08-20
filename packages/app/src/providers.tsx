import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Tooltip } from 'react-tooltip'

const queryClient = new QueryClient()

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Tooltip id="--tooltip--" className="z-[10000] font-mono !text-xl !rounded-primary" />
    </QueryClientProvider>
  )
}
