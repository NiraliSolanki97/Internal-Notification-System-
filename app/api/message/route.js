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
  const { from, to, message, type } = await req.json()

  if (type === 'to-admin') {
    await pusher.trigger('admin-channel', 'employee-message', {
      from,
      message,
      time: new Date().toISOString(),
      beep: true,
    })
  } else if (type === 'employee-chat') {
    await pusher.trigger(`employee-${to.toLowerCase()}`, 'chat-message', {
      from,
      to,
      message,
      time: new Date().toISOString(),
      beep: false,
    })
  }

  return NextResponse.json({ ok: true })
}

