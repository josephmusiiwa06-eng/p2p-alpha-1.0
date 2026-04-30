import { redirect } from 'next/navigation'

// Root → redirect to dashboard (or login if not authed)
export default function RootPage() {
  redirect('/dashboard')
}
