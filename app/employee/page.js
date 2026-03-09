'use client'
import { useState, useEffect } from 'react'
import Pusher from 'pusher-js'

export default function EmployeePage() {
  const [name, setName] = useState('')
  const [nameSet, setNameSet] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [popup, setPopup] = useState(null)
  const [lastSeen, setLastSeen] = useState([])
  const [notifPermission, setNotifPermission] = useState('default')

  useEffect(() => {
    const saved = localStorage.getItem('employee_name')
    if (saved) { setName(saved); setNameSet(true) }
  }, [])

  useEffect(() => {
    if (nameSet) {
      requestNotificationPermission()
    }
  }, [nameSet])

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotifPermission(permission)
    }
  }

  useEffect(() => {
    if (!nameSet || !name) return
    const pusher = new Pusher('b035f674ea3d1ad971ab', {
      cluster: 'ap2',
    })
    const channel = pusher.subscribe('notifications')
    channel.bind('new-notification', (data) => {
      const isForMe = data.targets.includes(name)
      if (!isForMe) return

      // Show in-app popup
      setPopup({ id: data.notifId, message: data.message })

      // Force window focus
      window.focus()

      // Show OS browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const notif = new Notification('📣 IMPORTANT ANNOUNCEMENT', {
          body: data.message,
          requireInteraction: true,
          icon: '/favicon.ico',
        })
        notif.onclick = () => {
          window.focus()
          notif.close()
        }
      }

      // Play alert sound
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        oscillator.frequency.value = 880
        gainNode.gain.value = 0.3
        oscillator.start()
        oscillator.stop(ctx.currentTime + 0.3)
      } catch(e) {}
    })
    return () => pusher.disconnect()
  }, [nameSet, name])

  const saveName = () => {
    if (!nameInput.trim()) return
    localStorage.setItem('employee_name', nameInput.trim())
    setName(nameInput.trim())
    setNameSet(true)
  }

  const acknowledge = async () => {
    await fetch('/api/acknowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifId: popup.id, employee: name }),
    })
    setLastSeen(prev => [{ id: popup.id, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }, ...prev])
    setPopup(null)
  }

  if (!nameSet) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.loginBox}>
          <div style={styles.logo}>👤</div>
          <h2 style={styles.title}>EMPLOYEE LOGIN</h2>
          <p style={styles.sub}>StudyAbroad Consultancy</p>
          <p style={styles.hint}>Enter your name to receive notifications</p>
          <input
            placeholder="Your full name (e.g. Nirali)"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            style={styles.input}
          />
          <button onClick={saveName} style={styles.btnGreen}>CONFIRM & START</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      {popup && (
        <div style={styles.overlay}>
          <div style={styles.popupBox}>
            <div style={styles.popupIcon}>📣</div>
            <div style={styles.popupBadge}>IMPORTANT ANNOUNCEMENT</div>
            <p style={styles.popupFrom}>From: Admin</p>
            <div style={styles.popupMsgBox}>
              <p style={styles.popupMsg}>{popup.message}</p>
            </div>
            <button onClick={acknowledge} style={styles.ackBtn}>
              ✓ &nbsp; I HAVE READ THIS — ACKNOWLEDGE
            </button>
            <p style={styles.ackHint}>You must acknowledge to continue working</p>
          </div>
        </div>
      )}
      <div style={styles.header}>
        <div>
          <span style={styles.badge}>EMPLOYEE</span>
          <h1 style={styles.headerTitle}>Notification Inbox</h1>
        </div>
        <div style={styles.nameTag}>
          <span style={styles.dot}></span>
          {name}
        </div>
      </div>
      <div style={styles.body}>
        <div style={styles.statusCard}>
          <span style={styles.greenDot}></span>
          <span style={styles.statusText}>Connected — waiting for notifications</span>
        </div>
        {notifPermission !== 'granted' && (
          <div style={styles.warningCard}>
            ⚠️ Please allow notifications for full screen alerts!
            <button onClick={requestNotificationPermission} style={styles.allowBtn}>
              ALLOW NOTIFICATIONS
            </button>
          </div>
        )}
        <h3 style={styles.sectionTitle}>ACKNOWLEDGED NOTIFICATIONS</h3>
        {lastSeen.length === 0 && (
          <p style={styles.empty}>No notifications received yet.</p>
        )}
        {lastSeen.map((item, i) => (
          <div key={i} style={styles.seenItem}>
            <span style={styles.seenCheck}>✓</span>
            <span style={styles.seenText}>Acknowledged at {item.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0f0f0f' },
  header: { background: '#111', borderBottom: '2px solid #1a7a4a', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  badge: { background: '#16532f', color: '#22c55e', fontSize: '11px', padding: '2px 10px', borderRadius: '2px', letterSpacing: '2px', display: 'inline-block', marginBottom: '4px' },
  headerTitle: { color: '#e8e8e8', fontSize: '20px', fontWeight: 'bold' },
  nameTag: { color: '#22c55e', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' },
  body: { padding: '32px' },
  statusCard: { background: '#111', border: '1px solid #1a7a4a', borderRadius: '6px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  greenDot: { width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 },
  statusText: { color: '#888', fontSize: '13px' },
  warningCard: { background: '#1a1200', border: '1px solid #5a4000', borderRadius: '6px', padding: '14px 20px', marginBottom: '16px', color: '#ffaa00', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  allowBtn: { background: '#5a4000', color: '#ffaa00', border: '1px solid #ffaa00', borderRadius: '4px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'monospace' },
  sectionTitle: { color: '#555', fontSize: '11px', letterSpacing: '2px', marginBottom: '16px', marginTop: '16px' },
  empty: { color: '#333', fontSize: '14px' },
  seenItem: { background: '#111', border: '1px solid #1e3a2a', borderRadius: '4px', padding: '12px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' },
  seenCheck: { color: '#22c55e', fontSize: '16px' },
  seenText: { color: '#555', fontSize: '13px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.96)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  popupBox: { background: '#111', border: '2px solid #22c55e', borderRadius: '10px', padding: '48px 48px 40px', maxWidth: '560px', width: '90%', textAlign: 'center', boxShadow: '0 0 60px rgba(34,197,94,0.15)' },
  popupIcon: { fontSize: '48px', marginBottom: '16px' },
  popupBadge: { background: '#1a7a4a', color: '#fff', fontSize: '12px', letterSpacing: '2px', padding: '4px 16px', borderRadius: '2px', display: 'inline-block', marginBottom: '16px' },
  popupFrom: { color: '#555', fontSize: '12px', marginBottom: '20px' },
  popupMsgBox: { background: '#0d1a12', border: '1px solid #1a7a4a', borderRadius: '6px', padding: '20px 24px', marginBottom: '28px' },
  popupMsg: { color: '#e8e8e8', fontSize: '18px', lineHeight: '1.7', fontWeight: 'bold' },
  ackBtn: { background: '#1a7a4a', color: '#fff', border: '2px solid #22c55e', borderRadius: '6px', padding: '16px 32px', fontSize: '15px', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace', width: '100%', marginBottom: '12px' },
  ackHint: { color: '#333', fontSize: '11px' },
  loginWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f' },
  loginBox: { background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '8px', padding: '40px', width: '380px', textAlign: 'center' },
  logo: { fontSize: '48px', marginBottom: '16px' },
  title: { color: '#22c55e', fontSize: '20px', letterSpacing: '3px', marginBottom: '8px' },
  sub: { color: '#555', fontSize: '12px', marginBottom: '4px' },
  hint: { color: '#444', fontSize: '12px', marginBottom: '24px' },
  input: { background: '#222', border: '1px solid #2e2e2e', color: '#e8e8e8', borderRadius: '4px', padding: '12px 14px', fontSize: '14px', width: '100%', fontFamily: 'monospace', marginBottom: '16px', outline: 'none' },
  btnGreen: { width: '100%', padding: '13px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '14px', letterSpacing: '2px', fontFamily: 'monospace', cursor: 'pointer' },
}
