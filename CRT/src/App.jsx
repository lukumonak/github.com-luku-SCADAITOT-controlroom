import AdminPanel from './AdminPanel'
import TodayDuty from './TodayDuty'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import * as XLSX from 'xlsx'

import Login from './Login'
import Register from './Register'
import Profile from './Profile'
import './styles/app.css'
import './styles/header.css'
import './styles/stats.css'
import './styles/form.css'
import './styles/ticket.css'
import './styles/detail.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const socket = io('http://localhost:5000')

export default function App () {
  // ─── Auth ───
  const [role, setRole] = useState(
    () => sessionStorage.getItem('crt_role') || null
  )
  const [serverOnline, setServerOnline] = useState(true)
  const isOperator = role === 'operator'
  const isResolver = role === 'resolver' || role === 'admin'
  const isAdmin = role === 'admin'

  const handleLogin = (selectedRole, name, empId, email) => {
    setRole(selectedRole)
    setUserName(name || '')
    setUserEmpId(empId || '')
    setUserEmail(email || '')
  }

  const handleLogout = () => {
    setRole(null)
    setUserName('')
    setUserEmpId('')
    setUserEmail('')
    sessionStorage.removeItem('crt_role')
    sessionStorage.removeItem('crt_name')
    sessionStorage.removeItem('crt_emp_id')
    sessionStorage.removeItem('crt_email')
    setSelected(null)
    setShowForm(false)
  }

  //cheak server status
  useEffect(() => {
    const check = async () => {
      try {
        await axios.get(`${API}/health`)
        setServerOnline(true)
      } catch (err) {
        setServerOnline(false)
      }
    }

    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [])

  // ─── App State ───

  const [showRegister, setShowRegister] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [userName, setUserName] = useState(
    () => sessionStorage.getItem('crt_name') || ''
  )
  const [userEmpId, setUserEmpId] = useState(
    () => sessionStorage.getItem('crt_emp_id') || ''
  )
  const [userEmail, setUserEmail] = useState(
    () => sessionStorage.getItem('crt_email') || ''
  )
  const [adminTab, setAdminTab] = useState('tickets')
  const [notification, setNotification] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [resolverImageFile, setResolverImageFile] = useState(null)
  const [resolverImagePreview, setResolverImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [remark, setRemark] = useState('')
  const [remarks, setRemarks] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [todayIT, setTodayIT] = useState(null)
  const [todayOT, setTodayOT] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [pendingStatus, setPendingStatus] = useState(null)
  const [pendingSeverity, setPendingSeverity] = useState(null)
  const [pendingRoc, setPendingRoc] = useState('')
  const [pendingManHour, setPendingManHour] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [form, setForm] = useState({
    title: '',
    titleOption: '',
    description: '',
    severity: '',
    department: ''
  })

  //xls
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportType, setExportType] = useState(null)
  const [exportFrom, setExportFrom] = useState('')
  const [exportTo, setExportTo] = useState('')
  const [employees, setEmployees] = useState([])
  const [duties, setDuties] = useState([])

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API}/employees`)
      setEmployees(res.data.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchDuties = async () => {
    try {
      const res = await axios.get(`${API}/duties`)
      setDuties(res.data.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleExport = type => {
    setExportType(type)
    setExportFrom('')
    setExportTo('')
    setShowExportModal(true)
  }

  const doExport = () => {
    if (!exportFrom || !exportTo) return alert('Please select both dates')
    if (exportFrom > exportTo) return alert('From date cannot be after To date')
    const from = new Date(exportFrom)
    const to = new Date(exportTo)
    to.setHours(23, 59, 59, 999)
    const wb = XLSX.utils.book_new()

    if (exportType === 'tickets') {
      const filtered = tickets.filter(t => {
        const d = new Date(t.created_at)
        return d >= from && d <= to
      })
      if (filtered.length === 0)
        return alert('No tickets found in this date range')
      const data = filtered.map(t => ({
        'Ticket No': t.ticket_no,
        Title: t.title,
        Department: t.department || '—',
        Severity: t.severity,
        Status: t.status?.replace('_', ' '),
        'Raised By': t.created_by || '—',
        'Date & Time': new Date(t.created_at).toLocaleString('en-IN'),
        'Resolved At': t.resolved_at
          ? new Date(t.resolved_at).toLocaleString('en-IN')
          : '—'
      }))
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(data),
        'Tickets'
      )
      XLSX.writeFile(wb, `CRT-Tickets-${exportFrom}-to-${exportTo}.xlsx`)
    } else if (exportType === 'master') {
      const itData = employees
        .filter(e => e.department === 'IT')
        .map((e, i) => ({
          'Sl. No': i + 1,
          Name: e.name,
          Email: e.email,
          Department: 'IT'
        }))
      const otData = employees
        .filter(e => e.department === 'OT')
        .map((e, i) => ({
          'Sl. No': i + 1,
          Name: e.name,
          Email: e.email,
          Department: 'OT'
        }))
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          itData.length > 0 ? itData : [{ Info: 'No IT employees' }]
        ),
        'NERLDC IT'
      )
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          otData.length > 0 ? otData : [{ Info: 'No OT employees' }]
        ),
        'NERLDC OT'
      )
      XLSX.writeFile(wb, `CRT-MasterList-${exportFrom}-to-${exportTo}.xlsx`)
    } else if (exportType === 'duty') {
      const filtered = duties.filter(d => {
        const date = new Date(d.duty_date)
        return date >= from && date <= to
      })
      if (filtered.length === 0)
        return alert('No duty assignments found in this date range')
      const itData = filtered
        .filter(d => d.department === 'IT')
        .map(d => ({
          'Start Date': new Date(d.duty_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }),
          'Start Time': d.start_time?.slice(0, 5),
          'End Date': new Date(d.end_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }),
          'End Time': d.end_time?.slice(0, 5),
          Name: d.name,
          Email: d.email
        }))
      const otData = filtered
        .filter(d => d.department === 'OT')
        .map(d => ({
          'Start Date': new Date(d.duty_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }),
          'Start Time': d.start_time?.slice(0, 5),
          'End Date': new Date(d.end_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }),
          'End Time': d.end_time?.slice(0, 5),
          Name: d.name,
          Email: d.email
        }))
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          itData.length > 0 ? itData : [{ Info: 'No IT duties' }]
        ),
        'NERLDC IT Duty'
      )
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          otData.length > 0 ? otData : [{ Info: 'No OT duties' }]
        ),
        'NERLDC OT Duty'
      )
      XLSX.writeFile(wb, `CRT-DutyList-${exportFrom}-to-${exportTo}.xlsx`)
    }

    setShowExportModal(false)
  }

  //xls — old function kept for reference, no longer used
  const exportTickets = () => {
    const data = tickets.map(t => ({
      'Ticket No': t.ticket_no,
      Title: t.title,
      Department: t.department || '—',
      Severity: t.severity,
      Status: t.status?.replace('_', ' '),
      'Raised By': t.created_by || '—',
      'Date & Time': new Date(t.created_at).toLocaleString('en-IN')
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets')
    XLSX.writeFile(
      wb,
      `CRT-Tickets-${new Date().toISOString().split('T')[0]}.xlsx`
    )
  }

  const fetchTodayDuties = async () => {
    try {
      const [itRes, otRes] = await Promise.all([
        axios.get(`${API}/duties/today/IT`),
        axios.get(`${API}/duties/today/OT`)
      ])
      setTodayIT(itRes.data.success ? itRes.data.data : null)
      setTodayOT(otRes.data.success ? otRes.data.data : null)
    } catch (err) {
      console.error(err)
    }
  }

  //RESOLVER IMAGE UPLOAD

  const uploadResolverImage = async () => {
    if (!resolverImageFile) return
    try {
      setUploadingImage(true)
      const fd = new FormData()
      fd.append('image', resolverImageFile)
      await axios.patch(`${API}/tickets/${selected.id}/resolver-image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResolverImageFile(null)
      setResolverImagePreview(null)
      showNotification('✅ Photo uploaded successfully')
    } catch (err) {
      showNotification('❌ Failed to upload photo', 'error')
    } finally {
      setUploadingImage(false)
    }
  }

  // ─── Helpers ───
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // ─── Fetch tickets ───
  const fetchTickets = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API}/tickets`)
      setTickets(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    if (role) {
      fetchTickets()
      fetchTodayDuties()
      fetchEmployees()
      fetchDuties()
    }
  }, [role])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  // ─── Socket.IO ───
  useEffect(() => {
    socket.on('user:role_changed', ({ emp_id, new_role }) => {
      if (userEmpId && emp_id === userEmpId) {
        alert(`Your role has been changed to ${new_role}. Please login again.`)
        handleLogout()
      }
    })

    socket.on('ticket:created', ticket => {
      setTickets(prev => [ticket, ...prev])
    })
    socket.on('ticket:updated', ticket => {
      setTickets(prev => prev.map(t => (t.id === ticket.id ? ticket : t)))
      setSelected(prev => (prev?.id === ticket.id ? ticket : prev))
    })
    socket.on('ticket:deleted', ({ id }) => {
      setTickets(prev => prev.filter(t => t.id !== id))
      setSelected(prev => (prev?.id === id ? null : prev))
    })
    socket.on('remark:added', remark => {
      setRemarks(prev => [...prev, remark])
    })

    socket.on('email:sent', ({ ticket_no, department }) => {
      showNotification(`📧 ${ticket_no} — Notified to ${department} team`)
    })

    socket.on('duty:updated', fetchTodayDuties)

    return () => {
      socket.off('ticket:created')
      socket.off('ticket:updated')
      socket.off('ticket:deleted')
      socket.off('remark:added')
      socket.off('email:sent')
      socket.off('user:role_changed')
    }
  }, [])

  // ─── Ticket Actions ───
  const fetchRemarks = async id => {
    try {
      const res = await axios.get(`${API}/tickets/${id}/remarks`)
      setRemarks(res.data.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleImageChange = e => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return alert('Only PNG, JPEG and WEBP allowed')
    }
    if (file.size > 5 * 1024 * 1024) return alert('Max 5MB')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const createTicket = async () => {
    if (!form.title) return alert('Please select an issue title')
    if (!imageFile && form.department === 'NERLDC OT')
      return alert('Please attach a photo for OT tickets')
    try {
      setSubmitting(true)
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('description', form.description)
      fd.append('severity', form.severity)
      fd.append('created_by', userName || form.created_by)
      fd.append('department', form.department)
      if (imageFile) fd.append('image', imageFile)
      await axios.post(`${API}/tickets`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setForm({
        title: '',
        titleOption: '',
        description: '',
        severity: '',
        department: ''
      })

      setImageFile(null)
      setImagePreview(null)
      setShowForm(false)
      showNotification('✅ Ticket submitted successfully')
      fetchTickets()
    } catch (err) {
      console.error(err)
      showNotification('❌ Failed to create ticket', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`${API}/tickets/${id}`, { status })
      await fetchTickets()
      setSelected(prev => (prev?.id === id ? { ...prev, status } : prev))
    } catch (err) {
      console.error(err)
    }
  }

  const updateSeverity = async (id, severity) => {
    try {
      await axios.patch(`${API}/tickets/${id}`, { severity })
      await fetchTickets()
      setSelected(prev => (prev?.id === id ? { ...prev, severity } : prev))
    } catch (err) {
      console.error(err)
    }
  }

  const deleteTicket = async id => {
    if (!window.confirm('Delete this ticket?')) return
    try {
      await axios.delete(`${API}/tickets/${id}`)
      if (selected?.id === id) setSelected(null)
      fetchTickets()
    } catch (err) {
      console.error(err)
    }
  }

  const addRemark = async () => {
    if (!remark.trim()) return
    try {
      await axios.post(`${API}/tickets/${selected.id}/remarks`, {
        remark,
        added_by: role
      })
      setRemark('')
      fetchRemarks(selected.id)
    } catch (err) {
      console.error(err)
    }
  }
  const openTicket = ticket => {
    setSelected(ticket)
    fetchRemarks(ticket.id)
    setPendingStatus(null)
    setPendingSeverity(null)
    setPendingRoc(ticket.roc || '')
    setPendingManHour(ticket.man_hour_lost || '')
    setResolverImageFile(null)
    setResolverImagePreview(null)
  }

  const counts = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  }

  const headerBg = isAdmin ? '#1a3a6b' : isResolver ? '#1a3a6b' : '#1a3a6b'

  // ─── Show Login Page ───
  if (showRegister) return <Register onBack={() => setShowRegister(false)} />
  if (!role)
    return (
      <Login onLogin={handleLogin} onRegister={() => setShowRegister(true)} />
    )

  // ─── Main App ───
  if (showProfile)
    return (
      <Profile
        user={{ name: userName, empId: userEmpId, email: userEmail, role }}
        onBack={() => setShowProfile(false)}
      />
    )

  return (
    <div className='app-container'>
      {!serverOnline && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            style={{
              background: '#fff',
              borderTop: '5px solid #b91c1c',
              padding: '36px 40px',
              width: 400,
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2
              style={{
                color: '#b91c1c',
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 12
              }}
            >
              Server Not Connected
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
              Cannot reach the backend server. Please make sure the server is
              running.
            </p>
            <button
              onClick={async () => {
                try {
                  await axios.get(`${API}/health`)
                  setServerOnline(true)
                } catch (err) {
                  setServerOnline(false)
                }
              }}
              style={{
                background: '#1a3a6b',
                color: '#fff',
                border: 'none',
                padding: '10px 28px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              🔄 Retry
            </button>
            <p style={{ fontSize: 11, color: '#999', marginTop: 16 }}>
              Auto-retrying every 10 sec.
            </p>
          </div>
        </div>
      )}

      {/* Notification Bar */}
      {notification && (
        <div
          style={{
            background: notification.type === 'error' ? '#f3f2fe' : '#f0fdf4',
            borderBottom: `3px solid ${
              notification.type === 'error' ? '#b91c1c' : '#15803d'
            }`,
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13,
            fontWeight: 600,
            color: notification.type === 'error' ? '#b91c1c' : '#15803d'
          }}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: notification.type === 'error' ? '#b91c1c' : '#15803d'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div
        className='header'
        style={{ background: headerBg, transition: 'background 0.3s' }}
      >
        <div className='header-top'>
          <div className='header-logo-row'>
            {/* <div className='header-logo'></div> */}
            <div>
              <div className='header-title'>Control Room Ticketing System</div>
              <div className='header-subtitle'>
                Integrated Operations Management Portal —&nbsp;
                <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                  {role}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Logout
            </button>

            <button
              onClick={() => setShowProfile(true)}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              👤 {userName || 'Profile'}
            </button>

            {isOperator && (
              <button
                onClick={() => {
                  if (!showForm) {
                    setAdminTab('tickets')
                  }
                  setShowForm(!showForm)
                }}
                style={{
                  background: showForm ? '#b91c1c' : '#f0a500',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 18px',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {showForm ? '✕ Cancel' : '+ Raise Ticket'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2june */}

      <div
        style={{
          background: '#f0f0f0',
          borderBottom: '1px solid #ccc',
          padding: '0 24px',
          display: 'flex',
          gap: 0
        }}
      >
        {[
          ['tickets', 'Ticket Register'],
          ...(isAdmin || isResolver ? [['assign', 'MORE']] : []),
          ...(isOperator ? [['today', "Today's Duty"]] : [])
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setAdminTab(key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 12,
              textTransform: 'uppercase',
              background: adminTab === key ? '#1a3a6b' : 'transparent',
              color: adminTab === key ? '#fff' : '#1a3a6b',
              borderBottom:
                adminTab === key ? '3px solid #1a3a6b' : '3px solid transparent'
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {adminTab === 'assign' ? (
        <AdminPanel isAdmin={isAdmin} onExport={handleExport} />
      ) : isOperator && adminTab === 'today' ? (
        <TodayDuty
          itDuty={todayIT}
          otDuty={todayOT}
          onRefresh={fetchTodayDuties}
        />
      ) : (
        <div className='main-content'>
          {/* Stats */}
          <div className='stats-grid'>
            {[
              { label: 'Total Tickets', value: counts.total, color: '#1b71f2' },
              { label: 'Open', value: counts.open, color: '#fe2121' },
              {
                label: 'In Progress',
                value: counts.in_progress,
                color: '#d812ea'
              },
              { label: 'Resolved', value: counts.resolved, color: '#38f31f' }
            ].map(s => (
              <div key={s.label} className='stats-card'>
                <p className='stats-label'>{s.label}</p>
                <p className='stats-value' style={{ color: s.color }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Raise Ticket Form */}
          {showForm && isOperator && (
            <div className='ticket-form'>
              <h2>Raise New Ticket</h2>
              <div className='form-grid'>
                <div className='full-width'>
                  <label className='input-label'>Issue Title *</label>
                  <select
                    className='input-field'
                    value={form.titleOption || ''}
                    onChange={e => {
                      const val = e.target.value
                      setForm({
                        ...form,
                        titleOption: val,
                        title: val === 'Other' ? '' : val
                      })
                    }}
                  >
                    <option value=''>— Select Issue —</option>
                    <option value='SCADA issue'>SCADA issue</option>
                    <option value='PMU issue'>PMU issue</option>
                    <option value='VIP issue'>VIP issue</option>
                    <option value='IT Issue'>IT Issue</option>
                    <option value='Other'>Other</option>
                  </select>
                  {form.titleOption === 'Other' && (
                    <input
                      className='input-field'
                      placeholder='Describe the issue title...'
                      style={{ marginTop: 8 }}
                      value={form.title}
                      onChange={e =>
                        setForm({ ...form, title: e.target.value })
                      }
                    />
                  )}
                </div>
                <div className='full-width'>
                  <label className='input-label'>Description</label>
                  <textarea
                    className='input-field textarea-field'
                    placeholder='Describe the issue in detail...'
                    value={form.description}
                    onChange={e =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className='input-label'>Severity</label>
                  <select
                    className='input-field'
                    value={form.severity || ''}
                    onChange={e =>
                      setForm({ ...form, severity: e.target.value })
                    }
                  >
                    <option value=''>— Select Severity —</option>
                    <option value='critical'>Critical</option>

                    <option value='high'>High</option>
                    <option value='medium'>Medium</option>
                    <option value='low'>Low</option>
                  </select>
                </div>

                <div>
                  <label className='input-label'>Department *</label>
                  <select
                    className='input-field'
                    value={form.department || ''}
                    onChange={e =>
                      setForm({ ...form, department: e.target.value })
                    }
                  >
                    <option value=''>— Select department —</option>

                    <option value='NERLDC IT'>NERLDC IT</option>
                    <option value='NERLDC OT'>NERLDC OT</option>
                  </select>
                </div>

                <div className='full-width'>
                  <label className='input-label'>
                    Attach Photo{' '}
                    {form.department === 'NERLDC OT' ? '*' : '(Optional)'}
                  </label>
                  <input
                    type='file'
                    accept='image/*'
                    className='input-field'
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt='preview'
                      className='preview-image'
                    />
                  )}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: 16
                }}
              >
                <button
                  onClick={createTicket}
                  disabled={submitting}
                  style={{
                    background: '#1a3a6b',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 24px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  Submit Ticket
                </button>
              </div>
            </div>
          )}

          {/* Main Layout */}
          <div className='grid-layout'>
            {/* Ticket Table */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8
                }}
              >
                <div className='section-heading' style={{ marginBottom: 0 }}>
                  Ticket Register — {tickets.length} Record
                  {tickets.length !== 1 ? 's' : ''}
                </div>
                <button
                  onClick={() => handleExport('tickets')}
                  style={{
                    border: '2px solid #1a3a6b',
                    borderRadius: 6,
                    padding: '6px 16px',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  &#128229; Export
                </button>
              </div>
              {loading ? (
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #ccc',
                    padding: 20,
                    textAlign: 'center',
                    color: '#555'
                  }}
                >
                  Loading records...
                </div>
              ) : tickets.length === 0 ? (
                <div className='no-tickets'>No tickets found.</div>
              ) : (
                <table className='ticket-table'>
                  <thead>
                    <tr>
                      <th>Ticket No.</th>
                      <th>Title</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Department</th>
                      <th>Raised By</th>
                      <th>Raised At</th>
                      <th>Resolved At</th>
                      {isResolver && <th>RCA</th>}
                      {isResolver && <th>Man Hour Lost</th>}
                      {isAdmin && <th>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(ticket => (
                      <tr
                        key={ticket.id}
                        onClick={() => openTicket(ticket)}
                        className={
                          selected?.id === ticket.id ? 'selected-row' : ''
                        }
                      >
                        <td style={{ fontWeight: 600, color: '#1a3a6b' }}>
                          {ticket.ticket_no}
                        </td>
                        <td>{ticket.title}</td>
                        <td>
                          <span className={`badge badge-${ticket.severity}`}>
                            {ticket.severity}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${ticket.status}`}>
                            {ticket.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{ticket.department || '—'}</td>
                        <td>{ticket.created_by || '—'}</td>
                        <td>{new Date(ticket.created_at).toLocaleString()}</td>
                        <td
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 14,
                            color: ticket.resolved_at ? '#15803d' : '#64748b'
                          }}
                        >
                          {ticket.resolved_at
                            ? new Date(ticket.resolved_at).toLocaleString(
                                'en-IN',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }
                              )
                            : '—'}
                        </td>

                        {isResolver && (
                          <td
                            style={{
                              fontSize: 12,
                              maxWidth: 150,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {ticket.roc || '—'}
                          </td>
                        )}
                        {isResolver && (
                          <td style={{ fontSize: 12, textAlign: 'center' }}>
                            {ticket.man_hour_lost
                              ? `${ticket.man_hour_lost} hrs`
                              : '—'}
                          </td>
                        )}
                        {isAdmin && (
                          <td>
                            <button
                              className='delete-btn'
                              onClick={e => {
                                e.stopPropagation()
                                deleteTicket(ticket.id)
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Detail Modal Popup — outside grid so layout never shifts */}
          {selected && (
            <>
              {/* Backdrop */}
              <div
                onClick={() => setSelected(null)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.55)',
                  zIndex: 999
                }}
              />
              {/* Modal */}
              <div
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1000,
                  background: '#fff',
                  borderRadius: 10,
                  width: '90%',
                  maxWidth: 580,
                  maxHeight: '85vh',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.3)'
                }}
              >
                <div
                  className='detail-header'
                  style={{
                    flexShrink: 0,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    background: '#fff'
                  }}
                >
                  <h3>Ticket Details — {selected.ticket_no}</h3>
                  <button
                    className='close-btn'
                    onClick={() => setSelected(null)}
                  >
                    ✕
                  </button>
                </div>
                <div
                  className='detail-body'
                  style={{ overflowY: 'auto', flex: 1 }}
                >
                  {selected?.image_url && (
                    <img
                      src={`http://localhost:5000${selected.image_url}`}
                      alt='ticket'
                      className='detail-image'
                    />
                  )}

                  <div className='detail-field'>
                    <div className='detail-field-label'>Title</div>
                    <div className='detail-field-value'>{selected.title}</div>
                  </div>

                  <div className='detail-field'>
                    <div className='detail-field-label'>Description</div>
                    <div className='detail-field-value'>
                      {selected.description || '—'}
                    </div>
                  </div>

                  <div className='detail-field'>
                    <div className='detail-field-label'>Raised By</div>
                    <div className='detail-field-value'>
                      {selected.created_by || '—'}
                    </div>
                  </div>

                  <div className='detail-field'>
                    <div className='detail-field-label'>Severity</div>
                    {isResolver ? (
                      <select
                        className='input-field'
                        value={
                          pendingStatus !== null
                            ? pendingSeverity ?? selected.severity
                            : selected.severity
                        }
                        onChange={e => setPendingSeverity(e.target.value)}
                      >
                        <option value='critical'>Critical</option>
                        <option value='high'>High</option>
                        <option value='medium'>Medium</option>
                        <option value='low'>Low</option>
                      </select>
                    ) : (
                      <span className={`badge badge-${selected.severity}`}>
                        {selected.severity}
                      </span>
                    )}
                  </div>

                  <div className='detail-field'>
                    <div className='detail-field-label'>Status</div>
                    {isResolver ? (
                      <select
                        className='input-field'
                        value={pendingStatus ?? selected.status}
                        onChange={e => setPendingStatus(e.target.value)}
                      >
                        <option value='open'>Open</option>
                        <option value='in_progress'>In Progress</option>
                        <option value='resolved'>Resolved</option>
                      </select>
                    ) : (
                      <span className={`badge badge-${selected.status}`}>
                        {selected.status?.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  {/* ROC and Man Hour — resolver/admin only */}
                  {isResolver && (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#1a3a6b',
                          textTransform: 'uppercase',
                          marginBottom: 8
                        }}
                      >
                        Root Cause Analysis & Man Hour
                      </div>

                      <label
                        style={{
                          display: 'block',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#555',
                          marginBottom: 4,
                          textTransform: 'uppercase'
                        }}
                      >
                        ROC (Root Cause Analysis)
                      </label>
                      <textarea
                        className='input-field textarea-field'
                        placeholder='Describe the root cause...'
                        value={pendingRoc}
                        onChange={e => setPendingRoc(e.target.value)}
                        style={{ height: 70, marginBottom: 10 }}
                      />

                      <label
                        style={{
                          display: 'block',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#555',
                          marginBottom: 4,
                          textTransform: 'uppercase'
                        }}
                      >
                        Man Hour Lost
                      </label>
                      <input
                        type='number'
                        min='0'
                        step='0.5'
                        className='input-field'
                        placeholder='e.g. 4.5'
                        value={pendingManHour}
                        onChange={e => setPendingManHour(e.target.value)}
                        style={{ marginBottom: 10 }}
                      />
                    </div>
                  )}

                  {/* Show ROC and Man Hour to resolver/admin read-only if filled */}
                  {!isResolver && isResolver === false && selected?.roc && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 12,
                        background: '#f5f7fa',
                        border: '1px solid #e0e0e0'
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#1a3a6b',
                          textTransform: 'uppercase',
                          marginBottom: 6
                        }}
                      >
                        Root Cause
                      </div>
                      <div style={{ fontSize: 13 }}>{selected.roc}</div>
                      {selected.man_hour_lost && (
                        <>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#1a3a6b',
                              textTransform: 'uppercase',
                              margin: '8px 0 4px'
                            }}
                          >
                            Man Hour Lost
                          </div>
                          <div style={{ fontSize: 13 }}>
                            {selected.man_hour_lost} hrs
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <div className='remarks-section'>
                    <div className='remarks-heading'>
                      Remarks *({remarks.length})
                    </div>
                    <div className='remarks-list'>
                      {remarks.length === 0 ? (
                        <div className='remark-box' style={{ color: '#888' }}>
                          No remarks added yet.
                        </div>
                      ) : (
                        remarks.map(r => (
                          <div key={r.id} className='remark-box'>
                            <div style={{ fontSize: 13 }}>{r.remark}</div>
                            <div className='remark-meta'>
                              {r.added_by} ·{' '}
                              {new Date(r.created_at).toLocaleString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Resolver Photo — show to all, upload only for resolver */}
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 12,
                        background: '#f5f7fa',
                        border: '1px solid #e0e0e0'
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#1a3a6b',
                          textTransform: 'uppercase',
                          marginBottom: 8
                        }}
                      >
                        Resolver Photo
                      </div>

                      {selected?.resolver_image_url ? (
                        <img
                          src={`http://localhost:5000${selected.resolver_image_url}`}
                          alt='resolver'
                          style={{
                            width: '100%',
                            maxHeight: 180,
                            objectFit: 'cover',
                            marginBottom: 8,
                            border: '1px solid #ccc'
                          }}
                        />
                      ) : (
                        !isResolver && (
                          <div
                            style={{
                              fontSize: 12,
                              color: '#888',
                              marginBottom: 8
                            }}
                          >
                            No photo uploaded yet
                          </div>
                        )
                      )}

                      {isResolver && (
                        <>
                          {resolverImagePreview && (
                            <img
                              src={resolverImagePreview}
                              alt='preview'
                              style={{
                                width: '100%',
                                maxHeight: 180,
                                objectFit: 'cover',
                                marginBottom: 8,
                                border: '1px solid #86efac'
                              }}
                            />
                          )}
                          <input
                            type='file'
                            accept='image/*'
                            onChange={e => {
                              const file = e.target.files[0]
                              if (!file) return
                              if (file.size > 5 * 1024 * 1024)
                                return alert('Max 5MB')
                              setResolverImageFile(file)
                              setResolverImagePreview(URL.createObjectURL(file))
                            }}
                            style={{
                              fontSize: 12,
                              marginBottom: 8,
                              width: '100%'
                            }}
                          />
                          {resolverImageFile && (
                            <button
                              onClick={uploadResolverImage}
                              disabled={uploadingImage}
                              style={{
                                width: '100%',
                                background: '#028090',
                                color: '#fff',
                                border: 'none',
                                padding: '7px',
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                opacity: uploadingImage ? 0.7 : 1
                              }}
                            >
                              {uploadingImage
                                ? 'Uploading...'
                                : '⬆ Upload Photo'}
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {isResolver && (
                      <>
                        <textarea
                          className='input-field textarea-field'
                          placeholder='Type remark here...'
                          value={remark}
                          onChange={e => setRemark(e.target.value)}
                          style={{ height: 60, marginBottom: 8 }}
                        />

                        <button
                          onClick={async () => {
                            if (!remark.trim()) {
                              alert('Remark is required before submitting')
                              return
                            }
                            // Save ROC and Man Hour if changed
                            if (
                              pendingRoc !== (selected.roc || '') ||
                              pendingManHour !== (selected.man_hour_lost || '')
                            ) {
                              await axios.patch(
                                `${API}/tickets/${selected.id}`,
                                {
                                  roc: pendingRoc || null,
                                  man_hour_lost: pendingManHour || null
                                }
                              )
                            }
                            if (
                              pendingStatus &&
                              pendingStatus !== selected.status
                            ) {
                              await updateStatus(selected.id, pendingStatus)
                            }
                            if (
                              pendingSeverity &&
                              pendingSeverity !== selected.severity
                            ) {
                              await updateSeverity(selected.id, pendingSeverity)
                            }
                            await addRemark()
                            setSelected(null)
                            setPendingStatus(null)
                            setPendingSeverity(null)
                            setPendingRoc('')
                            setPendingManHour('')
                          }}
                          style={{
                            width: '100%',
                            background: '#1a3a6b',
                            color: '#fff',
                            border: 'none',
                            padding: '8px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: 13,
                            textTransform: 'uppercase'
                          }}
                        >
                          Submit
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Export Date Range Modal */}
          {showExportModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}
            >
              <div
                style={{
                  background: '#fff',
                  borderTop: '4px solid #15803d',
                  padding: 28,
                  width: 380,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                }}
              >
                <h3
                  style={{
                    color: '#15803d',
                    fontSize: 14,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    marginBottom: 20
                  }}
                >
                  Export — Select Date Range
                </h3>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#333',
                    marginBottom: 5,
                    textTransform: 'uppercase'
                  }}
                >
                  From Date
                </label>
                <input
                  type='date'
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    marginBottom: 14,
                    border: '1px solid #b8cce4',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                  value={exportFrom}
                  onChange={e => setExportFrom(e.target.value)}
                />
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#333',
                    marginBottom: 5,
                    textTransform: 'uppercase'
                  }}
                >
                  To Date
                </label>
                <input
                  type='date'
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    marginBottom: 14,
                    border: '1px solid #b8cce4',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                  value={exportTo}
                  min={exportFrom}
                  onChange={e => setExportTo(e.target.value)}
                />
                {exportFrom && exportTo && (
                  <div
                    style={{
                      fontSize: 12,
                      color: '#64748b',
                      marginBottom: 14,
                      background: '#f5f7fa',
                      padding: '8px 12px'
                    }}
                  >
                    Exporting from{' '}
                    <strong>
                      {new Date(exportFrom).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </strong>{' '}
                    to{' '}
                    <strong>
                      {new Date(exportTo).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </strong>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    onClick={doExport}
                    style={{
                      flex: 1,
                      background: '#15803d',
                      color: '#fff',
                      border: 'none',
                      padding: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                  >
                    ⬇ Export
                  </button>
                  <button
                    onClick={() => setShowExportModal(false)}
                    style={{
                      background: '#64748b',
                      color: '#fff',
                      border: 'none',
                      padding: '10px 16px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
