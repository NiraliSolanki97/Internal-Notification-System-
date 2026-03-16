'use client'
import { useState, useEffect, useRef } from 'react'
import Pusher from 'pusher-js'

const EMPLOYEES = [
  'Nirali', 'Shraddha', 'Ishita', 'Joshphina', 'Sinchal',
  'Mayank', 'Neha', 'Neh', 'Haider', 'Keya', 'Swapnil', 'Juhi', 'Shrusti', 'Pooja'
]

export default function AdminPage() {
  const [message, setMessage] = useState('')
  const [sendMode, setSendMode] = useState('all')
  const [selectedOne, setSelectedOne] = useState(EMPLOYEES[0])
  const [selectedMulti, setSelectedMulti] = useState([])
  const [sending, setSending] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [employeeMessages, setEmployeeMessages] = useState([])
  const notifIdRef = useRef(0)

  useEffect(() => {
    const pusher = new Pusher('b035f674ea3d1ad971ab', { cluster: 'ap2' })
    const channel = pusher.subscribe('admin-channel')

    channel.bind('acknowledgement', (data) => {
      setNotifications(prev =>
        prev.map(n =>
          n.id === data.notifId
            ? { ...n, seenBy: [...new Set([...n.seenBy, data.employee])] }
            : n
        )
      )
    })

    channel.bind('employee-message', (data) => {
      setEmployeeMessages(prev => [{
        from: data.from,
        message: data.message,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        read: false,
      }, ...prev])
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        oscillator.type = 'sine'
        oscillator.frequency.value = 660
        gainNode.gain.setValueAtTime(0.8, ctx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
        oscillator.start(ctx.currentTime)
        oscillator.stop(ctx.currentTime + 0.6)
      } catch (e) {}
    })

    return () => pusher.disconnect()
  }, [])

  const toggleMulti = (name) => {
    setSelectedMulti(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  const getTargets = () => {
    if (sendMode === 'all') return EMPLOYEES
    if (sendMode === 'one') return [selectedOne]
    return selectedMulti
  }

  const sendNotification = async () => {
    const targets = getTargets()
    if (!message.trim()) return alert('Write a message first.')
    if (sendMode === 'multi' && targets.length === 0) return alert('Select at least one person.')
    setSending(true)
    const notifId = `notif_${Date.now()}_${++notifIdRef.current}`
    const newNotif = {
      id: notifId,
      message: message.trim(),
      targets,
      seenBy: [],
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    }
    setNotifications(prev => [newNotif, ...prev])
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim(), targets, notifId }),
    })
    setMessage('')
    setSending(false)
  }

  const markRead = (index) => {
    setEmployeeMessages(prev => prev.map((m, i) => i === index ? { ...m, read: true } : m))
  }

  const unreadCount = employeeMessages.filter(m => !m.read).length

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={styles.headerBadge}>ADMIN</span>
          <h1 style={styles.headerTitle}>Notification Dashboard</h1>
        </div>
        <img src="/Logo.png" alt="logo" style={{ height: '52px', objectFit: 'contain', background: 'white', padding: '4px 10px', borderRadius: '6px' }} />
      </div>
      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📣 SEND NOTIFICATION</h3>
          <label style={styles.label}>MESSAGE</label>
          <textarea
            rows={4}
            placeholder="Type your announcement here..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{ ...styles.input, resize: 'vertical', marginBottom: '20px' }}
          />
          <label style={styles.label}>SEND TO</label>
          <div style={styles.modeRow}>
            {['all', 'one', 'multi'].map(m => (
              <button key={m} onClick={() => setSendMode(m)} style={sendMode === m ? styles.modeActive : styles.modeBtn}>
                {m === 'all' ? '◉ Everyone' : m === 'one' ? '◎ One Person' : '◎ Multiple'}
              </button>
            ))}
          </div>
          {sendMode === 'one' && (
            <select value={selectedOne} onChange={e => setSelectedOne(e.target.value)} style={{ ...styles.input, marginBottom: '16px' }}>
              {EMPLOYEES.map(e => <option key={e}>{e}</option>)}
            </select>
          )}
          {sendMode === 'multi' && (
            <div style={styles.multiGrid}>
              {EMPLOYEES.map(e => (
                <div key={e} onClick={() => toggleMulti(e)} style={selectedMulti.includes(e) ? styles.chipSelected : styles.chip}>
                  {selectedMulti.includes(e) ? '✓ ' : ''}{e}
                </div>
              ))}
            </div>
          )}
          <button onClick={sendNotification} disabled={sending} style={styles.sendBtn}>
            {sending ? 'SENDING...' : '⚡ SEND NOTIFICATION'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              ✉️ MESSAGES FROM EMPLOYEES
              {unreadCount > 0 && <span style={styles.unreadBadge}>{unreadCount} NEW</span>}
            </h3>
            {employeeMessages.length === 0 && <p style={styles.empty}>No messages from employees yet.</p>}
            {employeeMessages.map((m, i) => (
              <div key={i} style={{ ...styles.notifCard, borderColor: m.read ? '#2a2a2a' : '#2255aa' }}>
                <div style={styles.notifHeader}>
                  <span style={{ ...styles.notifTarget, color: m.read ? '#555' : '#60aaff' }}>From: {m.from}</span>
                  <span style={styles.notifTime}>{m.time}</span>
                </div>
                <p style={styles.notifMsg}>"{m.message}"</p>
                {!m.read && <button onClick={() => markRead(i)} style={styles.markReadBtn}>✓ Mark as Read</button>}
              </div>
            ))}
          </div>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📋 SENT NOTIFICATIONS</h3>
            {notifications.length === 0 && <p style={styles.empty}>No notifications sent yet.</p>}
            {notifications.map(n => (
              <div key={n.id} style={styles.notifCard}>
                <div style={styles.notifHeader}>
                  <span style={styles.notifTime}>{n.time}</span>
                  <span style={styles.notifTarget}>→ {n.targets.length === EMPLOYEES.length ? 'ALL' : n.targets.length === 1 ? n.targets[0] : `${n.targets.length} people`}</span>
                </div>
                <p style={styles.notifMsg}>"{n.message}"</p>
                <div style={styles.seenWrap}>
                  <span style={styles.seenLabel}>SEEN ({n.seenBy.length}/{n.targets.length})</span>
                  <div style={styles.seenNames}>
                    {n.targets.map(t => (
                      <span key={t} style={n.seenBy.includes(t) ? styles.seenYes : styles.seenNo}>
                        {n.seenBy.includes(t) ? '✓' : '○'} {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0f0f0f', padding: '0 0 40px 0' },
  header: { background: '#111', borderBottom: '2px solid #1a7a4a', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerBadge: { background: '#1a7a4a', color: '#fff', fontSize: '11px', padding: '2px 10px', borderRadius: '2px', letterSpacing: '2px', display: 'inline-block', marginBottom: '4px' },
  headerTitle: { color: '#22c55e', fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '28px 32px' },
  card: { background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '24px' },
  cardTitle: { color: '#22c55e', fontSize: '13px', letterSpacing: '2px', marginBottom: '20px', borderBottom: '1px solid #2e2e2e', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' },
  unreadBadge: { background: '#1a3a6a', color: '#60aaff', fontSize: '10px', padding: '2px 8px', borderRadius: '2px', letterSpacing: '1px' },
  label: { display: 'block', color: '#888', fontSize: '11px', letterSpacing: '1.5px', marginBottom: '8px' },
  input: { background: '#222', border: '1px solid #2e2e2e', color: '#e8e8e8', borderRadius: '4px', padding: '10px 14px', fontSize: '14px', width: '100%', fontFamily: 'monospace', boxSizing: 'border-box' },
  modeRow: { display: 'flex', gap: '8px', marginBottom: '16px' },
  modeBtn: { flex: 1, padding: '8px', background: '#222', border: '1px solid #2e2e2e', color: '#888', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' },
  modeActive: { flex: 1, padding: '8px', background: '#16532f', border: '1px solid #22c55e', color: '#22c55e', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  multiGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '16px' },
  chip: { padding: '6px 8px', background: '#222', border: '1px solid #2e2e2e', borderRadius: '4px', color: '#888', fontSize: '12px', cursor: 'pointer', textAlign: 'center' },
  chipSelected: { padding: '6px 8px', background: '#16532f', border: '1px solid #22c55e', borderRadius: '4px', color: '#22c55e', fontSize: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold' },
  sendBtn: { width: '100%', padding: '14px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '14px', letterSpacing: '1.5px', fontWeight: 'bold', marginTop: '8px', fontFamily: 'monospace', cursor: 'pointer' },
  empty: { color: '#555', fontSize: '13px', textAlign: 'center', padding: '20px 0' },
  notifCard: { background: '#111', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '14px', marginBottom: '12px' },
  notifHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  notifTime: { color: '#555', fontSize: '11px' },
  notifTarget: { color: '#22c55e', fontSize: '11px', fontWeight: 'bold' },
  notifMsg: { color: '#ccc', fontSize: '13px', marginBottom: '12px', lineHeight: '1.5' },
  markReadBtn: { background: 'none', border: '1px solid #2255aa', color: '#60aaff', borderRadius: '3px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' },
  seenWrap: {},
  seenLabel: { color: '#555', fontSize: '10px', letterSpacing: '1px' },
  seenNames: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  seenYes: { color: '#22c55e', fontSize: '11px', background: '#0d2e1a', padding: '2px 8px', borderRadius: '2px' },
  seenNo: { color: '#444', fontSize: '11px', background: '#1a1a1a', padding: '2px 8px', borderRadius: '2px' },
}
