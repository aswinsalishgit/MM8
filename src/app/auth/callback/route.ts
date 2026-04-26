import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding/role'

  console.log("AUTH_CALLBACK_INITIATED", { hasCode: !!code, origin });

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', user.id)
          .single()

        console.log("USER_PROFILE_STATUS", { id: user.id, status: profile?.status });

        if (profile?.status === 'VERIFIED') {
          return NextResponse.redirect(`${origin}/dashboard`)
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error("AUTH_EXCHANGE_ERROR", error);
    }
  }

  // Fallback to error page if code is missing or exchange failed
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
