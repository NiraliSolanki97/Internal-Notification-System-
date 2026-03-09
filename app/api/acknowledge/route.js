import Pusher from 'pusher'
import { NextResponse } from 'next/server'

const pusher = new Pusher({
  appId: '2124542',
  key: 'b035f674ea3d1ad971ab',
  secret: '6b75fe7187522c69d09d',
  cluster: 'ap2',
  useTLS: true,
})

export async function POST(req) {
  const { notifId, employee } = await req.json()
  await pusher.trigger('admin-channel', 'acknowledgement', {
    notifId,
    employee,
    time: new Date().toISOString(),
  })
  return NextResponse.json({ ok: true })
}
