import AdminPanel from './AdminPanel'
import TodayDuty from './TodayDuty'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import * as XLSX from 'xlsx'

import Login from './Login'

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

  const isOperator = role === 'operator'
  const isResolver = role === 'resolver' || role === 'admin'
  const isAdmin = role === 'admin'

  const handleLogin = selectedRole => {
    setRole(selectedRole)
  }

  const handleLogout = () => {
    setRole(null)
    sessionStorage.removeItem('crt_role')
    setSelected(null)
    setShowForm(false)
  }

  // ─── App State ───
  const [adminTab, setAdminTab] = useState('tickets')
  const [notification, setNotification] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState(null)
  const [remark, setRemark] = useState('')
  const [remarks, setRemarks] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [pendingStatus, setPendingStatus] = useState(null)
  const [pendingSeverity, setPendingSeverity] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [form, setForm] = useState({
    title: '',
    titleOption: '',
    description: '',
    severity: 'medium',
    created_by: '',
    department: 'NERLDC IT'
  })

  //xls
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
    if (role) fetchTickets()
  }, [role])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  // ─── Socket.IO ───
  useEffect(() => {
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

    return () => {
      socket.off('ticket:created')
      socket.off('ticket:updated')
      socket.off('ticket:deleted')
      socket.off('remark:added')
      socket.off('email:sent')
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
    if (!form.created_by.trim()) return alert('Raised By is required')
    if (!imageFile) return alert('Please attach a photo')

    try {
      setSubmitting(true)
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('description', form.description)
      fd.append('severity', form.severity)
      fd.append('created_by', form.created_by)
      fd.append('department', form.department)
      if (imageFile) fd.append('image', imageFile)
      await axios.post(`${API}/tickets`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setForm({
        title: '',
        titleOption: '',
        description: '',
        severity: 'medium',
        created_by: '',
        department: 'NERLDC IT'
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
  }

  const counts = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  }

  const headerBg = isAdmin ? '#4c1d95' : isResolver ? '#14532d' : '#1a3a6b'

  // ─── Show Login Page ───
  if (!role) return <Login onLogin={handleLogin} />

  // ─── Main App ───
  return (
    <div className='app-container'>
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
            <div className='header-logo'>
              <img
                src='/src/assets/round_gi.png'
                alt='logo'
                style={{
                  height: 45,
                  borderRadius: '50%',
                  objectFit: 'contain'
                }}
              />
            </div>
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
            {isOperator && (
              <button
                onClick={() => setShowForm(!showForm)}
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
          ...(isAdmin || isResolver ? [['assign', 'Duty List']] : []),
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
              background: adminTab === key ? '#4c1d95' : 'transparent',
              color: adminTab === key ? '#fff' : '#4c1d95',
              borderBottom:
                adminTab === key ? '3px solid #4c1d95' : '3px solid transparent'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {adminTab === 'assign' ? (
        <AdminPanel isAdmin={isAdmin} />
      ) : isOperator && adminTab === 'today' ? (
        <TodayDuty />
      ) : (
        <div className='main-content'>
          {/* Stats */}
          <div className='stats-grid'>
            {[
              { label: 'Total Tickets', value: counts.total, color: '#1a3a6b' },
              { label: 'Open', value: counts.open, color: '#b91c1c' },
              {
                label: 'In Progress',
                value: counts.in_progress,
                color: '#c2410c'
              },
              { label: 'Resolved', value: counts.resolved, color: '#15803d' }
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
                    <option value='SCADA Connection Lost'>
                      SCADA Connection Lost
                    </option>
                    <option value='Power Failure'>Power Failure</option>
                    <option value='Network Down'>Network Down</option>
                    <option value='Printer Issue'>Printer Issue</option>
                    <option value='Server Offline'>Server Offline</option>
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
                    value={form.severity}
                    onChange={e =>
                      setForm({ ...form, severity: e.target.value })
                    }
                  >
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
                    value={form.department}
                    onChange={e =>
                      setForm({ ...form, department: e.target.value })
                    }
                  >
                    <option value='NERLDC IT'>NERLDC IT</option>
                    <option value='NERLDC OT'>NERLDC OT</option>
                  </select>
                </div>

                <div>
                  <label className='input-label'>Raised By *</label>
                  <input
                    className='input-field'
                    placeholder='Operator Name'
                    value={form.created_by}
                    onChange={e =>
                      setForm({ ...form, created_by: e.target.value })
                    }
                  />
                </div>
                <div className='full-width'>
                  <label className='input-label'>Attach Photo *</label>
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
          <div>
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
                  onClick={exportTickets}
                  style={{
                    background: '#15803d',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 16px',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  ⬇ Export Excel
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
                      <th>Date & Time</th>
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

            {/* Detail Panel — Modal Popup */}
            {selected && (
              <>
                {/* Dark backdrop — click to close */}
                <div
                  onClick={() => setSelected(null)}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.55)',
                    zIndex: 999
                  }}
                />

                {/* Centered Modal */}
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
                    overflowY: 'auto',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.3)'
                  }}
                >
                  <div className='detail-header'>
                    <h3>Ticket Details — {selected.ticket_no}</h3>
                    <button
                      className='close-btn'
                      onClick={() => setSelected(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className='detail-body'>
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

                    <div className='remarks-section'>
                      <div className='remarks-heading'>
                        Remarks ({remarks.length})
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
                              if (
                                pendingStatus &&
                                pendingStatus !== selected.status
                              ) {
                                await updateStatus(selected.id, pendingStatus)
                              }
                              if (
                                pendingStatus !== null &&
                                pendingSeverity &&
                                pendingStatus !== selected.severity
                              ) {
                                await updateSeverity(
                                  selected.id,
                                  pendingSeverity
                                )
                              }
                              if (remark.trim()) {
                                await addRemark()
                              }
                              setSelected(null)
                              setPendingStatus(null)
                              setPendingSeverity(null)
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
          </div>
        </div>
      )}
    </div>
  )
}
