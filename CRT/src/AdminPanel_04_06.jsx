import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function AdminPanel () {
  const [tab, setTab] = useState('master')
  const [editingDuty, setEditingDuty] = useState(null)
  // Master list state
  const [employees, setEmployees] = useState([])
  const [editingEmp, setEditingEmp] = useState(null)
  const [newEmp, setNewEmp] = useState({
    name: '',
    email: '',
    department: 'IT'
  })
  const [showAddEmp, setShowAddEmp] = useState(false)

  // Calendar state
  const [duties, setDuties] = useState([])
  const [overlapError, setOverlapError] = useState(null)
  const [itMonth, setItMonth] = useState(new Date())
  const [otMonth, setOtMonth] = useState(new Date())
  const [selectedCell, setSelectedCell] = useState(null)
  const [assignForm, setAssignForm] = useState({
    employee_id: '',
    start_time: '09:00',
    end_time: '08:59',
    end_date: ''
  })
  const [showAssignModal, setShowAssignModal] = useState(false)

  useEffect(() => {
    fetchEmployees()
    fetchDuties()
  }, [])

  const fetchEmployees = async () => {
    const res = await axios.get(`${API}/employees`)
    setEmployees(res.data.data)
  }

  const fetchDuties = async () => {
    const res = await axios.get(`${API}/duties`)
    setDuties(res.data.data)
  }

  const addEmployee = async () => {
    if (!newEmp.name || !newEmp.email) return alert('Name and email required')
    await axios.post(`${API}/employees`, newEmp)
    setNewEmp({ name: '', email: '', department: 'IT' })
    setShowAddEmp(false)
    fetchEmployees()
  }

  const saveEmployee = async id => {
    await axios.patch(`${API}/employees/${id}`, editingEmp)
    setEditingEmp(null)
    fetchEmployees()
  }

  const deleteEmployee = async id => {
    if (!window.confirm('Delete this employee?')) return
    await axios.delete(`${API}/employees/${id}`)
    fetchEmployees()
  }

  const getDutyForDate = (dept, date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    return duties.find(d => {
      if (d.department !== dept) return false
      const raw = d.duty_date || ''
      let serverDate
      if (raw.includes('T') || raw.endsWith('Z')) {
        // UTC datetime from DB e.g. "2025-06-01T18:30:00.000Z"
        // new Date() parses it correctly, then read LOCAL date parts
        const localDate = new Date(raw)
        serverDate = `${localDate.getFullYear()}-${String(
          localDate.getMonth() + 1
        ).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`
      } else {
        // Plain "YYYY-MM-DD" — parse as local midnight to avoid UTC shift
        const [y, m, day] = raw.split('-').map(Number)
        const localDate = new Date(y, m - 1, day)
        serverDate = `${localDate.getFullYear()}-${String(
          localDate.getMonth() + 1
        ).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`
      }
      return serverDate === dateStr
    })
  }

  const openAssignModal = (dept, date) => {
    const existing = getDutyForDate(dept, date)
    setSelectedCell({ dept, date })
    setAssignForm({
      employee_id: existing?.employee_id || '',
      start_time: existing?.start_time || '09:00',
      end_time: existing?.end_time || '08:59'
    })
    setShowAssignModal(true)
  }

  const assignDuty = async () => {
    if (!assignForm.employee_id) return alert('Select an employee')
    if (!assignForm.end_date) return alert('Select end date')
    setOverlapError(null)

    const year = selectedCell.date.getFullYear()
    const month = String(selectedCell.date.getMonth() + 1).padStart(2, '0')
    const day = String(selectedCell.date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`

    try {
      if (editingDuty) {
        await axios.patch(`${API}/duties/${editingDuty.id}`, {
          employee_id: assignForm.employee_id,
          duty_date: dateStr,
          end_date: assignForm.end_date,
          start_time: assignForm.start_time,
          end_time: assignForm.end_time
        })
        setEditingDuty(null)
      } else {
        await axios.post(`${API}/duties`, {
          employee_id: assignForm.employee_id,
          department: selectedCell.dept,
          duty_date: dateStr,
          end_date: assignForm.end_date,
          start_time: assignForm.start_time,
          end_time: assignForm.end_time
        })
      }
      setShowAssignModal(false)
      setAssignForm({
        employee_id: '',
        start_time: '09:00',
        end_time: '08:59',
        end_date: ''
      })
      fetchDuties()
    } catch (err) {
      if (err.response?.status === 409) {
        const clash = err.response.data.clash
        setOverlapError(
          `⚠️ Time overlap with ${clash.name} (${clash.from} → ${clash.to})`
        )
      } else {
        alert('Error saving duty')
      }
    }
  }

  const removeDuty = async () => {
    const _d = selectedCell.date
    const dateStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(_d.getDate()).padStart(2, '0')}`
    const duty = getDutyForDate(selectedCell.dept, selectedCell.date)
    if (duty) {
      await axios.delete(`${API}/duties/${duty.id}`)
      fetchDuties()
    }
    setShowAssignModal(false)
  }

  const renderCalendar = (dept, currentMonth, setMonth) => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

    const empList = employees.filter(e => e.department === dept)

    return (
      <div
        style={{
          flex: 1,
          background: '#fff',
          border: '1px solid #cccccc',
          borderTop: `3px solid ${dept === 'IT' ? '#1a3a6b' : '#028090'}`
        }}
      >
        {/* Calendar Header */}
        <div
          style={{
            background: dept === 'IT' ? '#1a3a6b' : '#028090',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <button
            onClick={() => setMonth(new Date(year, month - 1, 1))}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              padding: '2px 10px',
              cursor: 'pointer',
              fontSize: 16
            }}
          >
            ‹
          </button>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
            {dept} — {MONTHS[month]} {year}
          </span>
          <button
            onClick={() => setMonth(new Date(year, month + 1, 1))}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              padding: '2px 10px',
              cursor: 'pointer',
              fontSize: 16
            }}
          >
            ›
          </button>
        </div>

        {/* Day headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderBottom: '1px solid #e0e0e0'
          }}
        >
          {DAYS.map(d => (
            <div
              key={d}
              style={{
                padding: '6px 0',
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: '#64748b',
                background: '#f5f7fa'
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((date, i) => {
            if (!date)
              return (
                <div
                  key={`empty-${i}`}
                  style={{
                    minHeight: 60,
                    background: '#fafafa',
                    border: '1px solid #f0f0f0'
                  }}
                />
              )
            const duty = getDutyForDate(dept, date)
            const isPast = date < today
            const isToday = date.toDateString() === today.toDateString()

            return (
              <div
                key={i}
                onClick={() => !isPast && openAssignModal(dept, date)}
                style={{
                  minHeight: 60,
                  padding: 4,
                  border: '1px solid #e0e0e0',
                  cursor: isPast ? 'default' : 'pointer',
                  background: isToday
                    ? '#fffbeb'
                    : isPast
                    ? '#fafafa'
                    : duty
                    ? '#f0fdf4'
                    : '#fff',
                  opacity: isPast ? 0.6 : 1,
                  transition: 'background 0.15s'
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: isToday ? '#f0a500' : '#1a1a1a',
                    marginBottom: 2
                  }}
                >
                  {date.getDate()}
                </div>
                {duty && (
                  <div
                    style={{
                      fontSize: 10,
                      background: dept === 'IT' ? '#1a3a6b' : '#028090',
                      color: '#fff',
                      padding: '1px 4px',
                      borderRadius: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {duty.name}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const itEmployees = employees.filter(e => e.department === 'IT')
  const otEmployees = employees.filter(e => e.department === 'OT')

  return (
    <div style={{ padding: 20 }}>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          marginBottom: 20,
          borderBottom: '2px solid #1a3a6b'
        }}
      >
        {[
          ['master', 'Employee Master List'],
          ['calendar', 'Duty Calendar']
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '10px 24px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: tab === key ? '#1a3a6b' : '#e8eef6',
              color: tab === key ? '#fff' : '#1a3a6b',
              borderRadius: '4px 4px 0 0'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── MASTER LIST TAB ── */}
      {tab === 'master' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#1a3a6b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Employee Master List
            </div>
            <button
              onClick={() => setShowAddEmp(!showAddEmp)}
              style={{
                background: '#1a3a6b',
                color: '#fff',
                border: 'none',
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              {showAddEmp ? '✕ Cancel' : '+ Add Employee'}
            </button>
          </div>

          {/* Add employee form */}
          {showAddEmp && (
            <div
              style={{
                background: '#e8eef6',
                border: '1px solid #1a3a6b',
                padding: 16,
                marginBottom: 16,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-end',
                flexWrap: 'wrap'
              }}
            >
              <div>
                <label style={labelStyle}>Name *</label>
                <input
                  className='input-field'
                  placeholder='Employee name'
                  value={newEmp.name}
                  onChange={e => setNewEmp({ ...newEmp, name: e.target.value })}
                  style={{ width: 180 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input
                  className='input-field'
                  placeholder='email@example.com'
                  value={newEmp.email}
                  onChange={e =>
                    setNewEmp({ ...newEmp, email: e.target.value })
                  }
                  style={{ width: 220 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Department</label>/
                <select
                  className='input-field'
                  value={newEmp.department}
                  onChange={e =>
                    setNewEmp({ ...newEmp, department: e.target.value })
                  }
                  style={{ width: 100 }}
                >
                  <option value='IT'>IT</option>
                  <option value='OT'>OT</option>
                </select>
              </div>
              <button
                onClick={addEmployee}
                style={{
                  background: '#15803d',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                Save
              </button>
            </div>
          )}

          {/* IT Table */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                background: '#1a3a6b',
                color: '#fff',
                padding: '8px 14px',
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'uppercase'
              }}
            >
              NERLDC IT Department ({itEmployees.length} employees)
            </div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {[
                    'Sl. No',
                    'Employee Name',
                    'Email ID',
                    // 'Deptartment',
                    'Actions'
                  ].map(h => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ ...tdStyle, color: '#888', textAlign: 'center' }}
                    >
                      No IT employees added yet
                    </td>
                  </tr>
                ) : (
                  itEmployees.map((emp, i) => (
                    <tr key={emp.id}>
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={tdStyle}>
                        {editingEmp?.id === emp.id ? (
                          <input
                            className='input-field'
                            value={editingEmp.name}
                            onChange={e =>
                              setEditingEmp({
                                ...editingEmp,
                                name: e.target.value
                              })
                            }
                            style={{ width: '100%' }}
                          />
                        ) : (
                          emp.name
                        )}
                      </td>
                      <td style={tdStyle}>
                        {editingEmp?.id === emp.id ? (
                          <input
                            className='input-field'
                            value={editingEmp.email}
                            onChange={e =>
                              setEditingEmp({
                                ...editingEmp,
                                email: e.target.value
                              })
                            }
                            style={{ width: '100%' }}
                          />
                        ) : (
                          emp.email
                        )}
                      </td>

                      {/* drop 1 */}
                      <td style={tdStyle}>
                        {editingEmp?.id === emp.id ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => saveEmployee(emp.id)}
                              style={btnGreen}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingEmp(null)}
                              style={btnGray}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => setEditingEmp({ ...emp })}
                              style={btnBlue}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteEmployee(emp.id)}
                              style={btnRed}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* OT Table */}
          <div>
            <div
              style={{
                background: '#028090',
                color: '#fff',
                padding: '8px 14px',
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'uppercase'
              }}
            >
              NERLDC OT Department ({otEmployees.length} employees)
            </div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {[
                    'Sl. No',
                    'Employee Name',
                    'Email ID',
                    // 'Dept',
                    'Actions'
                  ].map(h => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {otEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ ...tdStyle, color: '#888', textAlign: 'center' }}
                    >
                      No OT employees added yet
                    </td>
                  </tr>
                ) : (
                  otEmployees.map((emp, i) => (
                    <tr key={emp.id}>
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={tdStyle}>
                        {editingEmp?.id === emp.id ? (
                          <input
                            className='input-field'
                            value={editingEmp.name}
                            onChange={e =>
                              setEditingEmp({
                                ...editingEmp,
                                name: e.target.value
                              })
                            }
                            style={{ width: '100%' }}
                          />
                        ) : (
                          emp.name
                        )}
                      </td>
                      <td style={tdStyle}>
                        {editingEmp?.id === emp.id ? (
                          <input
                            className='input-field'
                            value={editingEmp.email}
                            onChange={e =>
                              setEditingEmp({
                                ...editingEmp,
                                email: e.target.value
                              })
                            }
                            style={{ width: '100%' }}
                          />
                        ) : (
                          emp.email
                        )}
                      </td>

                      {/* drop2 */}
                      <td style={tdStyle}>
                        {editingEmp?.id === emp.id ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => saveEmployee(emp.id)}
                              style={btnGreen}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingEmp(null)}
                              style={btnGray}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => setEditingEmp({ ...emp })}
                              style={btnBlue}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteEmployee(emp.id)}
                              style={btnRed}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#1a3a6b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Duty Assignment List
            </div>
            <button
              onClick={() => {
                setSelectedCell({ dept: 'IT', date: new Date() })
                setAssignForm({
                  employee_id: '',
                  start_time: '09:00',
                  end_time: '08:59'
                })
                setShowAssignModal(true)
              }}
              style={{
                background: '#1a3a6b',
                color: '#fff',
                border: 'none',
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                textTransform: 'uppercase'
              }}
            >
              + Add Assignment
            </button>
          </div>

          <div style={{ display: 'flex', gap: 20 }}>
            {/* IT List */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  background: '#1a3a6b',
                  color: '#fff',
                  padding: '8px 14px',
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: 'uppercase'
                }}
              >
                NERLDC IT — Duty List
              </div>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date & Time</th>
                    <th style={thStyle}>Assigned Person</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {duties
                    .filter(d => d.department === 'IT')
                    .sort(
                      (a, b) => new Date(a.duty_date) - new Date(b.duty_date)
                    ).length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          ...tdStyle,
                          color: '#888',
                          textAlign: 'center'
                        }}
                      >
                        No assignments yet
                      </td>
                    </tr>
                  ) : (
                    duties
                      .filter(d => d.department === 'IT')
                      .sort(
                        (a, b) => new Date(a.duty_date) - new Date(b.duty_date)
                      )
                      .map(duty => {
                        const dateDisplay = new Date(
                          duty.duty_date
                        ).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                        const endDisplay = duty.end_date
                          ? new Date(duty.end_date).toLocaleDateString(
                              'en-IN',
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }
                            )
                          : '—'
                        return (
                          <tr key={duty.id}>
                            <td
                              style={{
                                ...tdStyle,
                                fontFamily: 'monospace',
                                fontSize: 12
                              }}
                            >
                              <div>
                                {dateDisplay} {duty.start_time.slice(0, 5)}
                              </div>
                              <div style={{ color: '#64748b', fontSize: 11 }}>
                                to {endDisplay} {duty.end_time.slice(0, 5)}
                              </div>
                            </td>

                            <td style={tdStyle}>
                              <div style={{ fontWeight: 600 }}>{duty.name}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                {duty.email}
                              </div>
                            </td>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => {
                                    setEditingDuty(null)
                                    setSelectedCell({
                                      dept: duty.department,
                                      date: new Date(
                                        duty.duty_date.split('T')[0] +
                                          'T12:00:00'
                                      )
                                    })
                                    setAssignForm({
                                      employee_id: '',
                                      start_time: duty.start_time,
                                      end_time: duty.end_time,
                                      end_date: duty.end_date
                                        ? duty.end_date.split('T')[0]
                                        : ''
                                    })
                                    setOverlapError(null)
                                    setShowAssignModal(true)
                                  }}
                                  style={{
                                    ...btnGreen,
                                    padding: '4px 10px',
                                    fontSize: 16
                                  }}
                                  title='Add person on this date'
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingDuty(duty)
                                    setSelectedCell({
                                      dept: duty.department,
                                      date: new Date(
                                        duty.duty_date.split('T')[0] +
                                          'T12:00:00'
                                      )
                                    })
                                    setAssignForm({
                                      employee_id: duty.employee_id,
                                      start_time: duty.start_time,
                                      end_time: duty.end_time,
                                      end_date: duty.end_date
                                        ? duty.end_date.split('T')[0]
                                        : ''
                                    })
                                    setOverlapError(null)
                                    setShowAssignModal(true)
                                  }}
                                  style={btnBlue}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    axios
                                      .delete(`${API}/duties/${duty.id}`)
                                      .then(fetchDuties)
                                  }
                                  style={btnRed}
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* OT List */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  background: '#028090',
                  color: '#fff',
                  padding: '8px 14px',
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: 'uppercase'
                }}
              >
                NERLDC OT — Duty List
              </div>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date & Time</th>
                    <th style={thStyle}>Assigned Person</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {duties
                    .filter(d => d.department === 'OT')
                    .sort(
                      (a, b) => new Date(a.duty_date) - new Date(b.duty_date)
                    ).length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          ...tdStyle,
                          color: '#888',
                          textAlign: 'center'
                        }}
                      >
                        No assignments yet
                      </td>
                    </tr>
                  ) : (
                    duties
                      .filter(d => d.department === 'OT')
                      .sort(
                        (a, b) => new Date(a.duty_date) - new Date(b.duty_date)
                      )
                      .map(duty => {
                        const dateDisplay = new Date(
                          duty.duty_date
                        ).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                        const endDisplay = duty.end_date
                          ? new Date(duty.end_date).toLocaleDateString(
                              'en-IN',
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              }
                            )
                          : '—'
                        return (
                          <tr key={duty.id}>
                            <td
                              style={{
                                ...tdStyle,
                                fontFamily: 'monospace',
                                fontSize: 12
                              }}
                            >
                              <div>
                                {dateDisplay} {duty.start_time.slice(0, 5)}
                              </div>
                              <div style={{ color: '#64748b', fontSize: 11 }}>
                                to {endDisplay} {duty.end_time.slice(0, 5)}
                              </div>
                            </td>

                            <td style={tdStyle}>
                              <div style={{ fontWeight: 600 }}>{duty.name}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>
                                {duty.email}
                              </div>
                            </td>

                            <td style={tdStyle}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => {
                                    setEditingDuty(null)
                                    setSelectedCell({
                                      dept: duty.department,
                                      date: new Date(
                                        duty.duty_date.split('T')[0] +
                                          'T12:00:00'
                                      )
                                    })
                                    setAssignForm({
                                      employee_id: '',
                                      start_time: duty.start_time,
                                      end_time: duty.end_time,
                                      end_date: duty.end_date
                                        ? duty.end_date.split('T')[0]
                                        : ''
                                    })
                                    setOverlapError(null)
                                    setShowAssignModal(true)
                                  }}
                                  style={{
                                    ...btnGreen,
                                    padding: '4px 10px',
                                    fontSize: 16
                                  }}
                                  title='Add person on this date'
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingDuty(duty)
                                    setSelectedCell({
                                      dept: duty.department,
                                      date: new Date(
                                        duty.duty_date.split('T')[0] +
                                          'T12:00:00'
                                      )
                                    })
                                    setAssignForm({
                                      employee_id: duty.employee_id,
                                      start_time: duty.start_time,
                                      end_time: duty.end_time,
                                      end_date: duty.end_date
                                        ? duty.end_date.split('T')[0]
                                        : ''
                                    })
                                    setOverlapError(null)
                                    setShowAssignModal(true)
                                  }}
                                  style={btnBlue}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    axios
                                      .delete(`${API}/duties/${duty.id}`)
                                      .then(fetchDuties)
                                  }
                                  style={btnRed}
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSIGN MODAL ── */}
      {showAssignModal && selectedCell && (
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
              border: '1px solid #ccc',
              borderTop: `4px solid ${
                selectedCell.dept === 'IT' ? '#1a3a6b' : '#028090'
              }`,
              padding: 28,
              width: 380
            }}
          >
            <h3
              style={{
                color: '#1a3a6b',
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: 16
              }}
            >
              {editingDuty
                ? 'Edit Duty Assignment'
                : 'Assign Duty Responsibility'}
            </h3>

            <label style={labelStyle}>Department</label>
            <select
              className='input-field'
              value={selectedCell.dept}
              onChange={e =>
                setSelectedCell({ ...selectedCell, dept: e.target.value })
              }
              style={{ marginBottom: 14 }}
            >
              <option value='IT'>NERLDC IT</option>
              <option value='OT'>NERLDC OT</option>
            </select>
            <label style={labelStyle}>Date</label>
            {editingDuty ? (
              <div
                style={{
                  padding: '8px 12px',
                  marginBottom: 14,
                  background: '#f5f7fa',
                  border: '1px solid #b8cce4',
                  fontSize: 13,
                  color: '#1a3a6b',
                  fontWeight: 600
                }}
              >
                {`${selectedCell.date.getFullYear()}-${String(
                  selectedCell.date.getMonth() + 1
                ).padStart(2, '0')}-${String(
                  selectedCell.date.getDate()
                ).padStart(2, '0')}`}
                <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
                  (not editable)
                </span>
              </div>
            ) : (
              <input
                type='date'
                className='input-field'
                value={`${selectedCell.date.getFullYear()}-${String(
                  selectedCell.date.getMonth() + 1
                ).padStart(2, '0')}-${String(
                  selectedCell.date.getDate()
                ).padStart(2, '0')}`}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => {
                  const parts = e.target.value.split('-')
                  if (parts.length === 3) {
                    setSelectedCell({
                      ...selectedCell,
                      date: new Date(
                        parseInt(parts[0]),
                        parseInt(parts[1]) - 1,
                        parseInt(parts[2])
                      )
                    })
                  }
                }}
                style={{ marginBottom: 14 }}
                onClick={e => e.target.showPicker && e.target.showPicker()}
              />
            )}

            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
              {selectedCell.date.toDateString()}
            </p>

            {selectedCell.date && (
              <div
                style={{
                  fontSize: 12,
                  color: '#1a3a6b',
                  fontWeight: 600,
                  marginTop: -10,
                  marginBottom: 14
                }}
              >
                Selected: {selectedCell.date.toDateString()}
              </div>
            )}

            <label style={labelStyle}>Employee</label>
            <select
              className='input-field'
              value={assignForm.employee_id}
              onChange={e =>
                setAssignForm({ ...assignForm, employee_id: e.target.value })
              }
              style={{ marginBottom: 14 }}
            >
              <option value=''>— Select employee —</option>
              {employees
                .filter(e => e.department === selectedCell.dept)
                .map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Start Time</label>
                <input
                  type='time'
                  className='input-field'
                  value={assignForm.start_time}
                  onChange={e =>
                    setAssignForm({ ...assignForm, start_time: e.target.value })
                  }
                />
              </div>
            </div>

            <label style={labelStyle}>End Date</label>
            <input
              type='date'
              className='input-field'
              value={assignForm.end_date}
              min={`${selectedCell.date.getFullYear()}-${String(
                selectedCell.date.getMonth() + 1
              ).padStart(2, '0')}-${String(
                selectedCell.date.getDate()
              ).padStart(2, '0')}`}
              onChange={e =>
                setAssignForm({ ...assignForm, end_date: e.target.value })
              }
              style={{ marginBottom: 14 }}
            />

            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>End Time</label>
                <input
                  type='time'
                  className='input-field'
                  value={assignForm.end_time}
                  onChange={e =>
                    setAssignForm({ ...assignForm, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                onClick={assignDuty}
                style={{ ...btnGreen, flex: 1, padding: '9px' }}
              >
                Assign
              </button>
              {getDutyForDate(selectedCell.dept, selectedCell.date) && (
                <button
                  onClick={removeDuty}
                  style={{ ...btnRed, padding: '9px 14px' }}
                >
                  Remove
                </button>
              )}
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setEditingDuty(null)
                  setOverlapError(null)
                }}
                style={{ ...btnGray, padding: '9px 14px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: '#333',
  marginBottom: 5,
  textTransform: 'uppercase',
  letterSpacing: '0.4px'
}
const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  background: '#fff',
  border: '1px solid #ccc'
}
const thStyle = {
  background: '#f5f7fa',
  border: '1px solid #ccc',
  padding: '9px 12px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#333'
}
const tdStyle = {
  border: '1px solid #e0e0e0',
  padding: '9px 12px',
  fontSize: 13
}
const btnBlue = {
  background: '#1a3a6b',
  color: '#fff',
  border: 'none',
  padding: '4px 12px',
  fontSize: 11,
  cursor: 'pointer',
  fontWeight: 600
}
const btnGreen = {
  background: '#15803d',
  color: '#fff',
  border: 'none',
  padding: '4px 12px',
  fontSize: 11,
  cursor: 'pointer',
  fontWeight: 600
}
const btnRed = {
  background: '#b91c1c',
  color: '#fff',
  border: 'none',
  padding: '4px 12px',
  fontSize: 11,
  cursor: 'pointer',
  fontWeight: 600
}
const btnGray = {
  background: '#64748b',
  color: '#fff',
  border: 'none',
  padding: '4px 12px',
  fontSize: 11,
  cursor: 'pointer',
  fontWeight: 600
}
