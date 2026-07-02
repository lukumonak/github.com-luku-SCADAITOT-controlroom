import { useState, useEffect } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
const socket = io('http://localhost:5000', { autoConnect: true })
import * as XLSX from 'xlsx'
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function AdminPanel ({ isAdmin = false, onExport }) {
  const [tab, setTab] = useState('master')

  // ── Master list state ──
  const [employees, setEmployees] = useState([])
  const [editingEmp, setEditingEmp] = useState(null)
  const [showAddEmp, setShowAddEmp] = useState(false)
  const [newEmp, setNewEmp] = useState({
    name: '',
    email: '',
    department: ''
  })

  // ── Duty state ──
  const [duties, setDuties] = useState([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [overlapError, setOverlapError] = useState(null)
  const [assignForm, setAssignForm] = useState({
    department: '',
    employee_id: '',
    duty_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '08:59'
  })
  const [users, setUsers] = useState([])

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`)
      setUsers(res.data.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchEmployees()
    fetchDuties()
    if (isAdmin) fetchUsers()
  }, [])

  useEffect(() => {
    socket.on('user:registered', () => {
      if (isAdmin) fetchUsers()
    })
    socket.on('duty:updated', () => {
      fetchDuties()
    })
    return () => {
      socket.off('user:registered')
      socket.off('duty:updated')
    }
  }, [])
  // ══════════════════════════════════
  // Master list functions
  // ══════════════════════════════════
  const fetchEmployees = async () => {
    const res = await axios.get(`${API}/employees`)
    setEmployees(res.data.data)
  }

  const addEmployee = async () => {
    if (!newEmp.name) return alert('Name is required')
    if (!newEmp.email) return alert('Email is required')
    if (!newEmp.department) return alert('Please select a department')
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

  // ══════════════════════════════════
  // Duty functions
  // ══════════════════════════════════
  const fetchDuties = async () => {
    const res = await axios.get(`${API}/duties`)
    setDuties(res.data.data)
  }

  const openAddModal = () => {
    setAssignForm({
      department: '',
      employee_id: '',
      duty_date: '',
      end_date: '',
      start_time: '09:00',
      end_time: '08:59'
    })
    setOverlapError(null)
    setShowAssignModal(true)
  }

  const assignDuty = async () => {
    const {
      department,
      employee_id,
      duty_date,
      end_date,
      start_time,
      end_time
    } = assignForm

    if (!department) return alert('Select a department')
    if (!employee_id) return alert('Select an employee')
    if (!duty_date) return alert('Select start date')
    if (!end_date) return alert('Select end date')
    if (end_date === duty_date && end_time <= start_time) {
      return alert(
        'End time must be after start time when end date is same as start date'
      )
    }

    setOverlapError(null)

    try {
      await axios.post(`${API}/duties`, {
        employee_id,
        department,
        duty_date,
        end_date,
        start_time,
        end_time
      })
      setShowAssignModal(false)
      fetchDuties()
    } catch (err) {
      if (err.response?.status === 409) {
        const clash = err.response.data.clash
        setOverlapError(
          `⚠️ Time overlap with ${clash.name} — ${clash.from} → ${clash.to}`
        )
      } else {
        alert(
          'Error saving duty: ' + (err.response?.data?.error || err.message)
        )
      }
    }
  }

  const deleteDuty = async id => {
    if (!window.confirm('Remove this duty assignment?')) return
    await axios.delete(`${API}/duties/${id}`)
    fetchDuties()
  }

  //

  // ── Helpers ──
  const formatDate = raw => {
    if (!raw) return '—'
    const d = new Date(raw)
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }
  const exportMasterList = () => {
    const itData = itEmployees.map((e, i) => ({
      'Sl. No': i + 1,
      Name: e.name,
      Email: e.email,
      Department: 'IT'
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(itData),
      'NERLDC IT'
    )
    XLSX.writeFile(
      wb,
      `CRT-MasterList-${new Date().toISOString().split('T')[0]}.xlsx`
    )
  }

  const exportMasterList2 = () => {
    const otData = otEmployees.map((e, i) => ({
      'Sl. No': i + 1,
      Name: e.name,
      Email: e.email,
      Department: 'OT'
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(otData),
      'NERLDC OT'
    )
    XLSX.writeFile(
      wb,
      `CRT-MasterList-${new Date().toISOString().split('T')[0]}.xlsx`
    )
  }

  //duty assignmet

  const exportDutyList = () => {
    const itData = itDuties.map(d => ({
      'Start Date': formatDate(d.duty_date),
      'Start Time': d.start_time?.slice(0, 5),
      'End Date': formatDate(d.end_date),
      'End Time': d.end_time?.slice(0, 5),
      Name: d.name,
      Email: d.email,
      Department: 'IT'
    }))
    // ✅ Check BEFORE writing
    console.log('IT rows:', itData.length)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(itData),
      'NERLDC IT Duty'
    )
    XLSX.writeFile(
      wb,
      `CRT-DutyList-${new Date().toISOString().split('T')[0]}.xlsx`
    )
  }

  const exportDutyList2 = () => {
    const otData = otDuties.map(d => ({
      'Start Date': formatDate(d.duty_date),
      'Start Time': d.start_time?.slice(0, 5),
      'End Date': formatDate(d.end_date),
      'End Time': d.end_time?.slice(0, 5),
      Name: d.name,
      Email: d.email,
      Department: 'OT'
    }))
    // Check BEFORE writing
    console.log('OT rows:', otData.length)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(otData),
      'NERLDC OT Duty'
    )
    XLSX.writeFile(
      wb,
      `CRT-DutyList-${new Date().toISOString().split('T')[0]}.xlsx`
    )
  }

  const itEmployees = employees.filter(e => e.department === 'IT')
  const otEmployees = employees.filter(e => e.department === 'OT')
  const itDuties = duties
    .filter(d => d.department === 'IT')
    .sort((a, b) => new Date(a.duty_date) - new Date(b.duty_date))
  const otDuties = duties
    .filter(d => d.department === 'OT')
    .sort((a, b) => new Date(a.duty_date) - new Date(b.duty_date))

  return (
    <div style={{ padding: 20 }}>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          marginBottom: 20,
          borderBottom: '2px solid #1a3a6b'
        }}
      >
        {[
          ['master', 'Employee Master List'],
          ['calendar', 'Duty Assignment'],
          ...(isAdmin ? [['users', 'User Management']] : [])
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

      {/* ══════════════════════════════════
          MASTER LIST TAB
      ══════════════════════════════════ */}
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
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%'
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
            </div>

            {isAdmin && (
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
            )}
          </div>

          {/* <button onClick={exportMasterList}>&#128229; Export Data</button> */}

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
                  placeholder='name + cont. no'
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
                <label style={labelStyle}>Department</label>
                <select
                  className='input-field'
                  value={newEmp.department}
                  onChange={e =>
                    setNewEmp({ ...newEmp, department: e.target.value })
                  }
                  style={{ width: 100 }}
                >
                  <option value=''>SELECT</option>
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
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'inline' }}>
                {' '}
                <div style={{ display: 'inline' }}>NERLDC IT — Duty List</div>
              </div>
              <div style={{ display: 'inline' }}>
                {' '}
                <button
                  onClick={exportMasterList}
                  style={{
                    border: '2px solid #1a3a6b',
                    borderRadius: 6,
                    padding: '6px 16px',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  &#128229;Export
                </button>
              </div>
            </div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {[
                    'Sl. No',
                    'Employee Name',
                    'Email ID',
                    ...(isAdmin ? ['Actions'] : [])
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
                      colSpan={4}
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

                      {isAdmin && (
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
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* OT Table */}

          {/* <button onClick={exportMasterList2}>&#128229; Export Data</button> */}

          <div>
            <div
              style={{
                background: '#028090',
                color: '#fff',
                padding: '8px 14px',
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'inline' }}>NERLDC OT — Duty List</div>
              <div style={{ display: 'inline' }}>
                {' '}
                <button
                  onClick={exportMasterList2}
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
            </div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {[
                    'Sl. No',
                    'Employee Name',
                    'Email ID',
                    ...(isAdmin ? ['Actions'] : [])
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
                      colSpan={4}
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

                      {isAdmin && (
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
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          DUTY ASSIGNMENT TAB
      ══════════════════════════════════ */}
      {tab === 'calendar' && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%'
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
            </div>

            {isAdmin && (
              <button
                onClick={openAddModal}
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
            )}
          </div>

          <div style={{ display: 'flex', gap: 20 }}>
            {/* IT Duty List */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  background: '#1a3a6b',
                  color: '#fff',
                  padding: '8px 14px',
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: 'uppercase',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'inline' }}>NERLDC IT — Duty List</div>
                <div style={{ display: 'inline' }}>
                  {' '}
                  <button
                    onClick={exportDutyList}
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
              </div>

              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Start</th>
                    <th style={thStyle}>End</th>
                    <th style={thStyle}>Assigned Person</th>
                    {isAdmin && <th style={thStyle}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {itDuties.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
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
                    itDuties.map(duty => (
                      <tr key={duty.id}>
                        <td
                          style={{
                            ...tdStyle,
                            fontSize: 12,
                            fontFamily: 'monospace'
                          }}
                        >
                          {formatDate(duty.duty_date)}
                          <br />
                          <span style={{ color: '#1a3a6b', fontWeight: 700 }}>
                            {duty.start_time?.slice(0, 5)}
                          </span>
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            fontSize: 12,
                            fontFamily: 'monospace'
                          }}
                        >
                          {formatDate(duty.end_date)}
                          <br />
                          <span style={{ color: '#028090', fontWeight: 700 }}>
                            {duty.end_time?.slice(0, 5)}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600 }}>{duty.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            {duty.email}
                          </div>
                        </td>
                        {isAdmin && (
                          <td style={tdStyle}>
                            <button
                              onClick={() => deleteDuty(duty.id)}
                              style={btnRed}
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* OT Duty List */}

            <div style={{ flex: 1 }}>
              <div
                style={{
                  background: 'rgb(2, 128, 144)',
                  color: '#fff',
                  padding: '8px 14px',
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: 'uppercase',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'inline' }}>NERLDC OT — Duty List</div>
                <div style={{ display: 'inline' }}>
                  {' '}
                  <button
                    onClick={exportDutyList2}
                    style={{
                      border: '2px solid #1a3a6b',
                      borderRadius: 6,
                      padding: '6px 16px',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    &#128229; Excel
                  </button>
                </div>
              </div>

              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Start</th>
                    <th style={thStyle}>End</th>
                    <th style={thStyle}>Assigned Person</th>
                    {isAdmin && <th style={thStyle}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {otDuties.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
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
                    otDuties.map(duty => (
                      <tr key={duty.id}>
                        <td
                          style={{
                            ...tdStyle,
                            fontSize: 12,
                            fontFamily: 'monospace'
                          }}
                        >
                          {formatDate(duty.duty_date)}
                          <br />
                          <span style={{ color: '#1a3a6b', fontWeight: 700 }}>
                            {duty.start_time?.slice(0, 5)}
                          </span>
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            fontSize: 12,
                            fontFamily: 'monospace'
                          }}
                        >
                          {formatDate(duty.end_date)}
                          <br />
                          <span style={{ color: '#028090', fontWeight: 700 }}>
                            {duty.end_time?.slice(0, 5)}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 600 }}>{duty.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            {duty.email}
                          </div>
                        </td>

                        {isAdmin && (
                          <td style={tdStyle}>
                            <button
                              onClick={() => deleteDuty(duty.id)}
                              style={btnRed}
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          USER MANAGEMENT TAB
      ══════════════════════════════════ */}
      {tab === 'users' && isAdmin && (
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#1a3a6b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 16
            }}
          >
            Registered Users
          </div>
          <table style={tableStyle}>
            <thead>
              <tr>
                {[
                  'Emp ID',
                  'Full Name',
                  'Email',
                  'Role',
                  'Registered On',
                  'Actions'
                ].map(h => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ ...tdStyle, textAlign: 'center', color: '#888' }}
                  >
                    No registered users yet
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {user.emp_id}
                    </td>
                    <td style={tdStyle}>{user.full_name}</td>
                    <td style={tdStyle}>{user.email}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          background:
                            user.role === 'resolver' ? '#f0fdf4' : '#e8eef6',
                          color:
                            user.role === 'resolver' ? '#15803d' : '#1a3a6b',
                          padding: '2px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontSize: 12,
                        fontFamily: 'monospace'
                      }}
                    >
                      {new Date(user.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    <td style={tdStyle}>
                      {user.role === 'admin' ? (
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          —
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={async () => {
                              const newRole =
                                user.role === 'operator'
                                  ? 'resolver'
                                  : 'operator'
                              await axios.patch(
                                `${API}/users/${user.id}/role`,
                                { role: newRole }
                              )
                              fetchUsers()
                            }}
                            style={{
                              background:
                                user.role === 'operator'
                                  ? '#15803d'
                                  : '#c2410c',
                              color: '#fff',
                              border: 'none',
                              padding: '4px 10px',
                              fontSize: 11,
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            {user.role === 'operator'
                              ? '↑ Make Resolver'
                              : '↓ Make Operator'}
                          </button>
                          <button
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  `Delete user ${user.full_name}?`
                                )
                              )
                                return
                              await axios.delete(`${API}/users/${user.id}`)
                              fetchUsers()
                            }}
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
      )}

      {/* ══════════════════════════════════
          ASSIGN MODAL
      ══════════════════════════════════ */}
      {showAssignModal && (
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
              borderTop: '4px solid #1a3a6b',
              padding: 28,
              width: 420,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }}
          >
            <h3
              style={{
                color: '#1a3a6b',
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: 20
              }}
            >
              Assign Duty Responsibility
            </h3>

            {/* Department */}
            <label style={labelStyle}>Department</label>
            <select
              className='input-field'
              value={assignForm.department}
              onChange={e =>
                setAssignForm({
                  ...assignForm,
                  department: e.target.value,
                  employee_id: ''
                })
              }
              style={{ marginBottom: 14 }}
            >
              <option value=''>-SELECT-</option>
              <option value='IT'>NERLDC IT</option>
              <option value='OT'>NERLDC OT</option>
            </select>

            {/* Employee */}
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
                .filter(e => e.department === assignForm.department)
                .map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>

            {/* Start date + time */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Start Date</label>
                <input
                  type='date'
                  className='input-field'
                  value={assignForm.duty_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e =>
                    setAssignForm({ ...assignForm, duty_date: e.target.value })
                  }
                />
              </div>
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

            {/* End date + time */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>End Date</label>
                <input
                  type='date'
                  className='input-field'
                  value={assignForm.end_date}
                  min={
                    assignForm.duty_date ||
                    new Date().toISOString().split('T')[0]
                  }
                  onChange={e =>
                    setAssignForm({ ...assignForm, end_date: e.target.value })
                  }
                />
              </div>
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

            {/* Overlap error */}
            {overlapError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  padding: '10px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 12
                }}
              >
                {overlapError}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={assignDuty}
                style={{ ...btnGreen, flex: 1, padding: 10 }}
              >
                Assign
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false)
                  setOverlapError(null)
                }}
                style={{ ...btnGray, padding: '10px 16px' }}
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

// ── Styles ──
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
