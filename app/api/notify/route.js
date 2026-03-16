import Pusher from 'pusher'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const pusher = new Pusher({
  appId: '2124542',
  key: 'b035f674ea3d1ad971ab',
  secret: '6b75fe7187522c69d09d',
  cluster: 'ap2',
  useTLS: true,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req) {
  const { message, targets, notifId } = await req.json()

  // Supabase mein save karo
  await supabase.from('notifications').insert({
    notif_id: notifId,
    message,
    targets,
    sent_at: new Date().toISOString(),
  })

  // Pusher se real-time bhejo
  await pusher.trigger('notifications', 'new-notification', {
    message,
    targets,
    notifId,
    sentAt: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
