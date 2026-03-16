'use client'
import { useState, useEffect, useRef } from 'react'
import Pusher from 'pusher-js'

const EMPLOYEES = [
  'Nirali', 'Shraddha', 'Ishita', 'Joshphina', 'Sinchal',
  'Mayank', 'Neha', 'Neh', 'Haider', 'Keya', 'Swapnil', 'Juhi', 'Shrusti','Pooja'
]

export default function EmployeePage() {
  const [name, setName] = useState('')
  const [nameSet, setNameSet] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [popup, setPopup] = useState(null)
  const [lastSeen, setLastSeen] = useState([])
  const [notifPermission, setNotifPermission] = useState('default')
  const [showMsgAdmin, setShowMsgAdmin] = useState(false)
  const [adminMsg, setAdminMsg] = useState('')
  const [sendingAdmin, setSendingAdmin] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatTarget, setChatTarget] = useState('')
  const [chatMsg, setChatMsg] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [screenFlash, setScreenFlash] = useState(false)
  const chatEndRef = useRef(null)
  const originalTitle = useRef('Notification Inbox')
  const blinkInterval = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('employee_name')
    if (saved) { setName(saved); setNameSet(true) }
  }, [])

  useEffect(() => {
    if (nameSet) requestNotificationPermission()
  }, [nameSet])

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotifPermission(permission)
    }
  }

  // Screen flash effect
  const triggerScreenFlash = () => {
    setScreenFlash(true)
    setTimeout(() => setScreenFlash(false), 600)
  }

  // Tab title blink
  const startTitleBlink = (msg) => {
    let visible = true
    if (blinkInterval.current) clearInterval(blinkInterval.current)
    blinkInterval.current = setInterval(() => {
      document.title = visible ? `🔔 NEW MESSAGE!` : originalTitle.current
      visible = !visible
    }, 800)
  }

  const stopTitleBlink = () => {
    if (blinkInterval.current) clearInterval(blinkInterval.current)
    document.title = originalTitle.current
  }

  // Beep sound — 4 times, loud
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      for (let i = 0; i < 4; i++) {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        oscillator.frequency.value = 880
        gainNode.gain.value = 1.0
        oscillator.start(ctx.currentTime + i * 0.4)
        oscillator.stop(ctx.currentTime + i * 0.4 + 0.3)
      }
    } catch (e) {}
  }

  // OS level browser notification
  const showOSNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body,
        requireInteraction: true,
        icon: '/Logo.png',
      })
      notif.onclick = () => { window.focus(); notif.close(); stopTitleBlink() }
    }
  }

  useEffect(() => {
    if (!nameSet || !name) return
    const pusher = new Pusher('b035f674ea3d1ad971ab', { cluster: 'ap2' })

    // Admin broadcast notification
    const notifChannel = pusher.subscribe('notifications')
    notifChannel.bind('new-notification', (data) => {
      const isForMe = data.targets.includes(name)
      if (!isForMe) return
      setPopup({ id: data.notifId, message: data.message })
      window.focus()
      playBeep()
      triggerScreenFlash()
      startTitleBlink()
      showOSNotification('📣 IMPORTANT ANNOUNCEMENT', data.message)
    })

    // Employee to employee chat — WITH OS popup + screen flash (no beep)
    const myChannel = pusher.subscribe(`employee-${name.toLowerCase()}`)
    myChannel.bind('chat-message', (data) => {
      setChatHistory(prev => [...prev, {
        from: data.from,
        to: data.to,
        message: data.message,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        mine: false,
      }])
      // OS popup + screen flash but NO beep
      triggerScreenFlash()
      startTitleBlink()
      showOSNotification(`💬 Message from ${data.from}`, data.message)
    })

    return () => pusher.disconnect()
  }, [nameSet, name])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, showChat])

  // Stop blinking when user focuses back
  useEffect(() => {
    const handleFocus = () => stopTitleBlink()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

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
    stopTitleBlink()
  }

  const sendToAdmin = async () => {
    if (!adminMsg.trim()) return
    setSendingAdmin(true)
    await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: name, message: adminMsg.trim(), type: 'to-admin' }),
    })
    setAdminMsg('')
    setSendingAdmin(false)
    setShowMsgAdmin(false)
    alert('Message sent to Admin!')
  }

  const sendChatMessage = async () => {
    if (!chatMsg.trim() || !chatTarget) return
    const msgData = {
      from: name,
      to: chatTarget,
      message: chatMsg.trim(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      mine: true,
    }
    setChatHistory(prev => [...prev, msgData])
    await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: name, to: chatTarget, message: chatMsg.trim(), type: 'employee-chat' }),
    })
    setChatMsg('')
  }

  const chatMessages = chatHistory.filter(m =>
    (m.from === name && m.to === chatTarget) ||
    (m.from === chatTarget && m.to === name)
  )

  if (!nameSet) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.loginBox}>
          <img src="/Logo.png" alt="logo" style={{ height: '68px', objectFit: 'contain', background: 'white', padding: '6px 14px', borderRadius: '6px', marginBottom: '20px' }} />
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
    <div style={{ ...styles.page, position: 'relative' }}>

      {/* Screen Flash Overlay */}
      {screenFlash && (
        <div style={styles.flashOverlay} />
      )}

      {/* Admin Broadcast Popup */}
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

      {/* Message Admin Modal */}
      {showMsgAdmin && (
        <div style={styles.overlay}>
          <div style={{ ...styles.popupBox, maxWidth: '480px' }}>
            <div style={styles.popupIcon}>✉️</div>
            <div style={styles.popupBadge}>MESSAGE TO ADMIN</div>
            <textarea
              rows={4}
              placeholder="Type your message to Admin..."
              value={adminMsg}
              onChange={e => setAdminMsg(e.target.value)}
              style={{ ...styles.input, resize: 'vertical', margin: '16px 0', textAlign: 'left' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowMsgAdmin(false)} style={styles.cancelBtn}>CANCEL</button>
              <button onClick={sendToAdmin} disabled={sendingAdmin} style={styles.ackBtn}>
                {sendingAdmin ? 'SENDING...' : '⚡ SEND TO ADMIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Chat Modal */}
      {showChat && (
        <div style={styles.overlay}>
          <div style={styles.chatBox}>
            <div style={styles.chatHeader}>
              <span style={styles.popupBadge}>💬 INTERNAL CHAT</span>
              <button onClick={() => { setShowChat(false); stopTitleBlink() }} style={styles.closeBtn}>✕</button>
            </div>
            {!chatTarget ? (
              <div style={styles.chatSelectWrap}>
                <p style={styles.chatSelectHint}>Select a colleague to chat with:</p>
                <div style={styles.employeeGrid}>
                  {EMPLOYEES.filter(e => e !== name).map(e => (
                    <div key={e} onClick={() => setChatTarget(e)} style={styles.employeeChip}>
                      {e}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={styles.chatWrap}>
                <div style={styles.chatTargetBar}>
                  <button onClick={() => setChatTarget('')} style={styles.backBtn}>← Back</button>
                  <span style={styles.chatTargetName}>Chatting with: <strong style={{ color: '#22c55e' }}>{chatTarget}</strong></span>
                </div>
                <div style={styles.chatMessages}>
                  {chatMessages.length === 0 && (
                    <p style={styles.noChatMsg}>No messages yet. Say hi! 👋</p>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} style={m.mine ? styles.msgRight : styles.msgLeft}>
                      <div style={m.mine ? styles.bubbleRight : styles.bubbleLeft}>
                        {m.message}
                      </div>
                      <div style={styles.msgTime}>{m.time}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div style={styles.chatInputRow}>
                  <input
                    placeholder="Type a message..."
                    value={chatMsg}
                    onChange={e => setChatMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                    style={styles.chatInput}
                  />
                  <button onClick={sendChatMessage} style={styles.sendChatBtn}>SEND</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Dashboard */}
      <div style={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={styles.badge}>EMPLOYEE</span>
          <h1 style={styles.headerTitle}>Notification Inbox</h1>
        </div>
        <img src="/Logo.png" alt="logo" style={{ height: '68px', objectFit: 'contain', background: 'white', padding: '4px 10px', borderRadius: '6px' }} />
      </div>

      <div style={styles.body}>
        <div style={styles.statusCard}>
          <span style={styles.greenDot}></span>
          <span style={styles.statusText}>Connected — waiting for notifications · <strong style={{ color: '#22c55e' }}>{name}</strong></span>
        </div>
        {notifPermission !== 'granted' && (
          <div style={styles.warningCard}>
            ⚠️ Please allow notifications for full screen alerts!
            <button onClick={requestNotificationPermission} style={styles.allowBtn}>ALLOW NOTIFICATIONS</button>
          </div>
        )}
        <div style={styles.actionRow}>
          <button onClick={() => setShowMsgAdmin(true)} style={styles.msgAdminBtn}>
            ✉️ &nbsp; MESSAGE ADMIN
          </button>
          <button onClick={() => { setShowChat(true); stopTitleBlink() }} style={styles.chatBtn}>
            💬 &nbsp; CHAT WITH COLLEAGUE
          </button>
        </div>
        <h3 style={styles.sectionTitle}>ACKNOWLEDGED NOTIFICATIONS</h3>
        {lastSeen.length === 0 && <p style={styles.empty}>No notifications received yet.</p>}
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
  flashOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(34, 197, 94, 0.25)',
    zIndex: 99999, pointerEvents: 'none',
    animation: 'none',
  },
  header: { background: '#111', borderBottom: '2px solid #1a7a4a', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  badge: { background: '#16532f', color: '#22c55e', fontSize: '11px', padding: '2px 10px', borderRadius: '2px', letterSpacing: '2px', display: 'inline-block', marginBottom: '4px' },
  headerTitle: { color: '#e8e8e8', fontSize: '20px', fontWeight: 'bold' },
  body: { padding: '32px' },
  statusCard: { background: '#111', border: '1px solid #1a7a4a', borderRadius: '6px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  greenDot: { width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 },
  statusText: { color: '#888', fontSize: '13px' },
  warningCard: { background: '#1a1200', border: '1px solid #5a4000', borderRadius: '6px', padding: '14px 20px', marginBottom: '16px', color: '#ffaa00', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  allowBtn: { background: '#5a4000', color: '#ffaa00', border: '1px solid #ffaa00', borderRadius: '4px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'monospace' },
  actionRow: { display: 'flex', gap: '12px', marginBottom: '28px' },
  msgAdminBtn: { padding: '12px 24px', background: '#1a3a6a', border: '1px solid #2255aa', color: '#60aaff', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px', fontFamily: 'monospace', cursor: 'pointer' },
  chatBtn: { padding: '12px 24px', background: '#2a1a4a', border: '1px solid #6633aa', color: '#bb88ff', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px', fontFamily: 'monospace', cursor: 'pointer' },
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
  ackBtn: { background: '#1a7a4a', color: '#fff', border: '2px solid #22c55e', borderRadius: '6px', padding: '16px 32px', fontSize: '15px', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace', width: '100%', marginBottom: '12px', cursor: 'pointer' },
  cancelBtn: { background: '#2a2a2a', color: '#888', border: '1px solid #444', borderRadius: '6px', padding: '16px 24px', fontSize: '13px', fontFamily: 'monospace', cursor: 'pointer', flex: 1 },
  ackHint: { color: '#333', fontSize: '11px' },
  input: { background: '#222', border: '1px solid #2e2e2e', color: '#e8e8e8', borderRadius: '4px', padding: '12px 14px', fontSize: '14px', width: '100%', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' },
  loginWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f0f' },
  loginBox: { background: '#1a1a1a', border: '1px solid #2e2e2e', borderRadius: '8px', padding: '40px', width: '380px', textAlign: 'center' },
  title: { color: '#22c55e', fontSize: '20px', letterSpacing: '3px', marginBottom: '8px' },
  sub: { color: '#555', fontSize: '12px', marginBottom: '4px' },
  hint: { color: '#444', fontSize: '12px', marginBottom: '24px' },
  btnGreen: { width: '100%', padding: '13px', background: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '14px', letterSpacing: '2px', fontFamily: 'monospace', cursor: 'pointer' },
  chatBox: { background: '#111', border: '2px solid #6633aa', borderRadius: '10px', width: '90%', maxWidth: '520px', height: '560px', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  chatHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #2a2a2a' },
  closeBtn: { background: 'none', border: 'none', color: '#888', fontSize: '18px', cursor: 'pointer' },
  chatSelectWrap: { padding: '20px', overflowY: 'auto', flex: 1 },
  chatSelectHint: { color: '#888', fontSize: '12px', marginBottom: '16px', letterSpacing: '1px' },
  employeeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' },
  employeeChip: { padding: '10px 8px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', color: '#ccc', fontSize: '13px', cursor: 'pointer', textAlign: 'center' },
  chatWrap: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  chatTargetBar: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid #222' },
  backBtn: { background: 'none', border: 'none', color: '#888', fontSize: '12px', cursor: 'pointer' },
  chatTargetName: { color: '#888', fontSize: '13px' },
  chatMessages: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  noChatMsg: { color: '#444', fontSize: '13px', textAlign: 'center', marginTop: '40px' },
  msgRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
  msgLeft: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
  bubbleRight: { background: '#16532f', color: '#e8e8e8', padding: '8px 14px', borderRadius: '12px 12px 2px 12px', fontSize: '13px', maxWidth: '80%' },
  bubbleLeft: { background: '#1e1e2e', color: '#e8e8e8', padding: '8px 14px', borderRadius: '12px 12px 12px 2px', fontSize: '13px', maxWidth: '80%', border: '1px solid #333' },
  msgTime: { color: '#444', fontSize: '10px', marginTop: '2px' },
  chatInputRow: { display: 'flex', gap: '8px', padding: '12px 16px', borderTop: '1px solid #222' },
  chatInput: { flex: 1, background: '#1a1a1a', border: '1px solid #333', color: '#e8e8e8', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', fontFamily: 'monospace', outline: 'none' },
  sendChatBtn: { background: '#6633aa', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 18px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' },
}
