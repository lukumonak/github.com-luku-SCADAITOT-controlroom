import { useState, useEffect } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const socket = io('http://localhost:5000', { autoConnect: true })

export default function TodayDuty () {
  const [itDuty, setItDuty] = useState(null)
  const [otDuty, setOtDuty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchTodayDuties = async () => {
    try {
      const [itRes, otRes] = await Promise.all([
        axios.get(`${API}/duties/today/IT`),
        axios.get(`${API}/duties/today/OT`)
      ])
      setItDuty(itRes.data.success ? itRes.data.data : null)
      setOtDuty(otRes.data.success ? otRes.data.data : null)
      setLastUpdated(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodayDuties()

    // Auto refresh every 60 seconds
    const interval = setInterval(fetchTodayDuties, 60000)

    // Refresh when admin assigns/removes duty
    socket.on('duty:updated', () => {
      fetchTodayDuties()
    })

    return () => {
      clearInterval(interval)
      socket.off('duty:updated')
      // NOTE: do NOT disconnect socket here
    }
  }, [])

  if (loading)
    return (
      <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
        Loading today's duty...
      </div>
    )

  const DutyCard = ({ dept, duty, color, extraText }) => (
    <div
      style={{
        border: '1px solid #cccccc',
        borderTop: `4px solid ${color}`,
        background: '#fff'
      }}
    >
      <div style={{ background: color, padding: '10px 16px' }}>
        <span
          style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            textTransform: 'uppercase'
          }}
        >
          NERLDC {dept} Department
        </span>
      </div>
      <div style={{ padding: 24 }}>
        {duty ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 20
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  background: color,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: '#fff',
                  fontWeight: 700
                }}
              >
                {duty.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div
                  style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}
                >
                  {duty.name}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {dept} Department
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {[
                ['email', `${duty.email}`],

                [
                  'Shift Start',
                  `${new Date(duty.duty_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })} ${duty.start_time?.slice(0, 5)}`
                ],
                [
                  'Shift End',
                  `${new Date(duty.end_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })} ${duty.end_time?.slice(0, 5)}`
                ]
              ].map(([label, value]) => (
                <tr key={label}>
                  <td
                    style={{
                      padding: '8px 0',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      width: 110,
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    {label}
                  </td>
                  <td
                    style={{
                      padding: '8px 0',
                      fontSize: 13,
                      color: '#1a1a1a',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                  >
                    {value}
                  </td>
                </tr>
              ))}
            </table>

            <div
              style={{
                marginTop: 16,
                padding: '10px 14px',
                background: '#8f1a092b',
                border: '1px solid #e72424',
                fontSize: 12,
                color: '#e01111',
                fontWeight: 600
              }}
            >
              <p>{extraText}</p>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚠️</div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#b91c1c',
                marginBottom: 6
              }}
            >
              No duty assigned for today
            </div>
            <div
              style={{
                marginTop: 16,
                padding: '10px 14px',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                fontSize: 12,
                color: '#15803d',
                fontWeight: 600
              }}
            >
              <p>{extraText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#1a3a6b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            Today's Duty Officers
          </div>

          {lastUpdated && (
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Last updated: {lastUpdated}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <DutyCard
          extraText='contact L2 person 6000000000 in case of IT issues'
          dept='IT'
          duty={itDuty}
          color='#1a3a6b'
        />
        <DutyCard
          extraText='contact L2 person 7000000000 in case of OT issues'
          dept='OT'
          duty={otDuty}
          color='#028090'
        />
      </div>

      <div
        style={{
          marginTop: 20,
          padding: '12px 16px',
          background: '#e8eef6',
          border: '1px solid #1a3a6b',
          fontSize: 12,
          color: '#1a3a6b'
        }}
      >
        <strong>How it works:</strong> When an operator raises a ticket and
        selects NERLDC IT or OT — the email goes to today's duty officer for
        that department.
      </div>
    </div>
  )
}
