'use client'
import { useState, useEffect, useRef } from 'react'
import Pusher from 'pusher-js'

const EMPLOYEES = [
  'Nirali',
  'Shraddha',
  'Ishita',
  'Joshphina',
  'Sinchal',
  'Mayank',
  'Neha',
  'Neh',
  'Haider',
  'Keya',
  'Swapnil',
  'Juhi',
  'Shrusti',
  
]

export default function AdminPage() {
  const [authed, setAuthed] = useState(true)
const [pw, setPw] = useState('')
const [pwError, setPwError] = useState('')
  const [message, setMessage] = useState('')
  const [sendMode, setSendMode] = useState('all')
  const [selectedOne, setSelectedOne] = useState(EMPLOYEES[0])
  const [selectedMulti, setSelectedMulti] = useState([])
  const [sending, setSending] = useState(false)
  const [notifications, setNotifications] = useState([])
  const notifIdRef = useRef(0)

  useEffect(() => {
    if (!authed) return
    const pusher = new Pusher('b035f674ea3d1ad971ab', {
  cluster: 'ap2',
    })
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
    return () => pusher.disconnect()
  }, [authed])

  const login = () => {
    if (pw === (process.env.NEXT_PUBLIC_ADMIN_PW || 'admin123')) {
      setAuthed(true)
    } else {
      setPwError('Incorrect password')
    }
  }

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

  if (!authed) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.loginBox}>
          <div style={styles.loginLogo}>🔐</div>
          <h2 style={styles.loginTitle}>ADMIN ACCESS</h2>
          <p style={styles.loginSub}>StudyAbroad Consultancy — Internal System</p>
          <input
            type="password"
            placeholder="Enter admin password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwError('') }}
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{ ...styles.input, marginBottom: '8px' }}
          />
          {pwError && <p style={styles.error}>{pwError}</p>}
          <button onClick={login} style={styles.btnGreen}>LOGIN</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <span style={styles.headerBadge}>ADMIN</span>
<img src="/Logo.png" alt="logo" style={{ height: '32px', objectFit: 'contain', marginLeft: 'auto' }} />
<h1 style={styles.headerTitle}>Notification Dashboard</h1>     
   </div>
        <span style={styles.headerSub}>{EMPLOYEES.length} employees</span>
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
              <button
                key={m}
                onClick={() => setSendMode(m)}
                style={sendMode === m ? styles.modeActive : styles.modeBtn}
              >
                {m === 'all' ? '◉ Everyone' : m === 'one' ? '◎ One Person' : '◎ Multiple'}
              </button>
            ))}
          </div>
          {sendMode === 'one' && (
            <select
              value={selectedOne}
              onChange={e => setSelectedOne(e.target.value)}
              style={{ ...styles.input, marginBottom: '16px' }}
            >
              {EMPLOYEES.map(e => <option key={e}>{e}</option>)}
            </select>
          )}
          {sendMode === 'multi' && (
            <div style={styles.multiGrid}>
              {EMPLOYEES.map(e => (
                <div
                  key={e}
                  onClick={() => toggleMulti(e)}
                  style={selectedMulti.includes(e) ? styles.chipSelected : styles.chip}
                >
                  {selectedMulti.includes(e) ? '✓ ' : ''}{e.split(' ')[0]}
                </div>
              ))}
            </div>
          )}
          <button onClick={sendNotification} disabled={sending} style={styles.sendBtn}>
            {sending ? 'SENDING...' : '⚡ SEND NOTIFICATION'}
          </button>
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📋 SENT NOTIFICATIONS</h3>
          {notifications.length === 0 && (
            <p style={styles.empty}>No notifications sent yet.</p>
          )}
          {notifications.map(n => (
            <div key={n.id} style={styles.notifCard}>
              <div style={styles.notifHeader}>
                <span style={styles.notifTime}>{n.time}</span>
                <span style={styles.notifTarget}>
                  → {n.targets.length === EMPLOYEES.length ? 'ALL' : n.targets.length === 1 ? n.targets[0] : `${n.targets.length} people`}
                </span>
              </div>
              <p style={styles.notifMsg}>"{n.message}"</p>
              <div style={styles.seenWrap}>
                <span style={styles.seenLabel}>SEEN ({n.seenBy.length}/{n.targets.length})</span>
                <div style={styles.seenNames}>
                  {n.targets.map(t => (
                    <span key={t} style={n.seenBy.includes(t) ? styles.seenYes : styles.seenNo}>
                      {n.seenBy.includes(t) ? '✓' : '○'} {t.split(' ')[0]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0f0f0f', padding: '0 0 40px 0' },
  header: { background: '#111', borderBottom: '2px solid #1a7a4a', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerBadge: { background: '#1a7a4a', color: '#fff', fontSize: '11px', padding: '2px 10px', borderRadius: '2px', letterSpacing: '2px', display: 'inline-block', marginBottom: '4px' },
  headerTitle: { color: '#22c55e', fontSize: '22px', fontWeight: 'bold', letterSpacing: '1px' },
  headerSub: { color: '#555', fontSize: '13px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '28px 32px' },
  card: { background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '6px', padding: '24px' },
  cardTitle: { color: '#22c55e', fontSize: '13px', letterSpacing: '2px', marginBottom: '20px', borderBottom: '1px solid #2e2e2e', paddingBottom: '12px' },
  label: { display: 'block', color: '#888', fontSize: '11px', letterSpacing: '1.5px', marginBottom: '8px' },
  input: { background: '#222', border: '1px solid #2e2e2e', color: '#e8e8e8', borderRadius: '4px', padding: '10px 14px', fontSize: '14px', width: '100%', fontFamily: 'monospace' },
  modeRow: { display: 'flex', gap: '8px', marginBottom: '16px' },
  modeBtn: { flex: 1, padding: '8px', background: '#222', border: '1px solid #2e2e2e', color: '#888', borderRadius: '4px', fontSize: '12px' },
  modeActive: { flex: 1, padding: '8px', background: '#16532f', border: '1px solid #22c55e', color: '#22c55e', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' },
  multiGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '16px' },
  chip: { padding: '6px 8px', background: '#222', border: '1px solid #2e2e2e', borderRadius: '4px', color: '#888', fontSize: '12px', cursor: 'pointer', textAlign: 'center' },
  chipSelected: { padding: '6px 8px', background: '#16532f', border: '1px solid #22c55e', borderRadius: '4px', color: '#22c55e', fontSize: '12px', cursor: 'pointer', textAlign: 'center', fontWeight: 'bold' },
  sendBtn: { width: '100%', padding: '14px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '14px', letterSpacing: '1.5px', fontWeight: 'bold', marginTop: '8px', fontFamily: 'monospace' },
  empty: { color: '#555', fontSize: '13px', textAlign: 'center', padding: '40px 0' },
  notifCard: { background: '#111', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '14px', marginBottom: '12px' },
  notifHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  notifTime: { color: '#555', fontSize: '11px' },
  notifTarget: { color: '#22c55e', fontSize: '11px', fontWeight: 'bold' },
  notifMsg: { color: '#ccc', fontSize: '13px', marginBottom: '12px', lineHeight: '1.5' },
  seenWrap: {},
  seenLabel: { color: '#555', fontSize: '10px', letterSpacing: '1px' },
  seenNames: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  seenYes: { color: '#22c55e', fontSize: '11px', background: '#0d2e1a', padding: '2px 8px', borderRadius: '2px' },
  seenNo: { color: '#444', fontSize: '11px', background: '#1a1a1a', padding: '2px 8px', borderRadius: '2px' },
  loginWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f' },
  loginBox: { background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '8px', padding: '40px', width: '360px', textAlign: 'center' },
  loginLogo: { fontSize: '40px', marginBottom: '16px' },
  loginTitle: { color: '#22c55e', fontSize: '20px', letterSpacing: '3px', marginBottom: '8px' },
  loginSub: { color: '#555', fontSize: '12px', marginBottom: '28px' },
  btnGreen: { width: '100%', padding: '12px', background: '#1a7a4a', color: '#fff', borderRadius: '4px', fontSize: '14px', letterSpacing: '2px', fontFamily: 'monospace' },
  error: { color: '#c0392b', fontSize: '12px', marginBottom: '12px' },
}
