const express = require('express');
const { sendTicketCreatedEmail, sendWelcomeEmail, sendForgotPasswordEmail } = require('./mailer')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('./db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }
});

app.use(cors());
app.use(express.json());

// Uploads folder
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
app.use('/uploads', express.static('uploads'));

// ─── HEALTH CHECK ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running!', timestamp: new Date() });
});

// ─── GET all tickets ───
app.get('/api/tickets', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC');
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST create ticket ───
app.post('/api/tickets', upload.single('image'), async (req, res) => {
  const { title, description, severity, created_by, department, status, assigned_to, roc, man_hour_lost } = req.body
  console.log('PATCH body:', req.body)

  if (!title) {
    return res.status(400).json({ success: false, error: 'Title is required' })
  }

  try {
    const seqResult = await pool.query('SELECT MAX(id) FROM tickets')
    const maxId = parseInt(seqResult.rows[0].max || 0) + 1
    const now = new Date()
    const yyyy = now.getFullYear()
    const shortMonth = now.toLocaleString('default', { month: 'short' });
    //----------------------------------------------------------- 


    // Count tickets in current month for counter
    const counterResult = await pool.query(
      `SELECT COUNT(*) FROM tickets
   WHERE EXTRACT(YEAR FROM created_at) = $1
   AND EXTRACT(MONTH FROM created_at) = $2`,
      [yyyy, now.getMonth() + 1]
    )
    const counter = String(parseInt(counterResult.rows[0].count) + 1).padStart(2, '0')

    const ticket_no = `${yyyy}/${shortMonth}/TKT-${String(maxId).padStart(3, '0')}/${counter}`


    // -----------------------------------------------------------
    const image_url = req.file ? `/uploads/${req.file.filename}` : null
    const dept = department || 'NERLDC IT'
    const deptShort = dept === 'NERLDC IT' ? 'IT' : 'OT'
    // const { title, description, severity, created_by, department } = req.body
    // INSERT TICKET
    const result = await pool.query(
      `INSERT INTO tickets (ticket_no, title, description, severity, created_by, image_url, department)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [ticket_no, title, description || '', severity || 'medium', created_by || 'anonymous', image_url, dept]
    )

    const ticket = result.rows[0]

    // Notify UI immediately
    io.emit('ticket:created', ticket)

    // GET DUTY PERSON
    // GET DUTY PERSON — Debug



    pool.query(`
  SELECT d.*, e.name, e.email
  FROM duty_assignments d
  JOIN employees e ON d.employee_id = e.id
  WHERE d.department = $1
    AND NOW() >= (d.duty_date::text || ' ' || d.start_time::text)::timestamp
    AND NOW() <  (d.end_date::text  || ' ' || d.end_time::text)::timestamp
  LIMIT 1
`, [deptShort])



      .then(dutyResult => {
        const dutyPerson = dutyResult.rows[0] || null
        // SEND EMAIL
        return sendTicketCreatedEmail(ticket, dept, dutyPerson)
      })
      .then(() => {
        io.emit('email:sent', { ticket_no: ticket.ticket_no, department: dept })
      })
      .catch(err => console.error('❌ Email error:', err.message))

    res.status(201).json({ success: true, data: ticket })

  } catch (err) {
    console.error('❌ POST /api/tickets error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})


// ─── PATCH update ticket ───
app.patch('/api/tickets/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, severity, status, assigned_to, roc, man_hour_lost } = req.body;
  try {

    const result = await pool.query(
      `UPDATE tickets
   SET title          = COALESCE($1, title),
       description    = COALESCE($2, description),
       severity       = COALESCE($3, severity),
       status         = COALESCE($4, status),
       assigned_to    = COALESCE($5, assigned_to),
       roc            = COALESCE($6, roc),
       man_hour_lost  = COALESCE($7, man_hour_lost),
       updated_at     = NOW(),
       resolved_at    = CASE
         WHEN $4 = 'resolved' AND resolved_at IS NULL THEN NOW()
         WHEN $4 != 'resolved' THEN NULL
         ELSE resolved_at
       END
   WHERE id = $8 RETURNING *`,
      [title, description, severity, status, assigned_to, roc, man_hour_lost, id]

    )

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const ticket = result.rows[0];

    // Notify all connected clients
    io.emit('ticket:updated', ticket);

    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE ticket ───
app.delete('/api/tickets/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM tickets WHERE id = $1 RETURNING *', [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    // Notify all connected clients
    io.emit('ticket:deleted', { id });

    res.json({ success: true, data: result.rows[0], message: 'Ticket deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET remarks ───
app.get('/api/tickets/:id/remarks', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM remarks WHERE ticket_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── OPERATOR LOGIN ───

app.post('/api/operator-login', (req, res) => {
  const { password } = req.body
  if (password === process.env.OPERATOR_PASSWORD) {
    res.json({ success: true })
  } else {
    res.status(401).json({ success: false, error: 'Wrong password' })
  }
})


// ─── RESOLVER LOGIN ───
app.post('/api/resolver-login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.RESOLVER_PASSWORD) {
    res.json({ success: true })
  } else {
    res.status(401).json({ success: false, error: 'Wrong password' })
  }
});



// ─── ADMIN LOGIN ───
app.post('/api/admin-login', async (req, res) => {
  const { password } = req.body
  if (!password) return res.status(400).json({ success: false, error: 'Password required' })
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE role = 'admin' LIMIT 1"
    )
    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, error: 'Admin not found' })
    }
    const admin = result.rows[0]
    const match = await bcrypt.compare(password, admin.password)
    if (!match) {
      return res.status(401).json({ success: false, error: 'Wrong password' })
    }
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})


// ─── POST add remark ───
app.post('/api/tickets/:id/remarks', async (req, res) => {
  const { id } = req.params;
  const { remark, added_by } = req.body;

  if (!remark) {
    return res.status(400).json({ success: false, error: 'Remark is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO remarks (ticket_id, remark, added_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [id, remark, added_by || 'anonymous']
    );

    const newRemark = result.rows[0];

    // Notify all connected clients
    io.emit('remark:added', newRemark);

    res.status(201).json({ success: true, data: newRemark });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET all employees ───
app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY department, sl_no')
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── POST add employee ───
app.post('/api/employees', async (req, res) => {
  const { name, email, department } = req.body
  if (!name || !email || !department) {
    return res.status(400).json({ success: false, error: 'All fields required' })
  }
  try {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM employees WHERE department = $1', [department]
    )
    const sl_no = parseInt(countResult.rows[0].count) + 1
    const result = await pool.query(
      'INSERT INTO employees (sl_no, name, email, department) VALUES ($1,$2,$3,$4) RETURNING *',
      [sl_no, name, email, department]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── PATCH update employee ───
app.patch('/api/employees/:id', async (req, res) => {
  const { id } = req.params
  const { name, email, department } = req.body
  try {
    const result = await pool.query(
      `UPDATE employees SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        department = COALESCE($3, department)
       WHERE id = $4 RETURNING *`,
      [name, email, department, id]
    )
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── DELETE employee ───
app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('DELETE FROM employees WHERE id = $1', [id])
    res.json({ success: true, message: 'Employee deleted' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── GET duty assignments ───
app.get('/api/duties', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, e.name, e.email
      FROM duty_assignments d
      JOIN employees e ON d.employee_id = e.id
      ORDER BY d.duty_date ASC
    `)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── POST assign duty ───
app.post('/api/duties', async (req, res) => {
  const { employee_id, department, duty_date, end_date, start_time, end_time } = req.body
  if (!employee_id || !department || !duty_date || !end_date) {
    return res.status(400).json({ success: false, error: 'Required fields missing' })
  }
  try {
    const newStart = `${duty_date} ${start_time || '09:00'}`
    const newEnd = `${end_date} ${end_time || '08:59'}`

    const overlap = await pool.query(`
      SELECT d.*, e.name FROM duty_assignments d
      JOIN employees e ON d.employee_id = e.id
      WHERE d.department = $1
        AND (d.duty_date::text || ' ' || d.start_time::text)::timestamp < $2::timestamp
        AND (d.end_date::text  || ' ' || d.end_time::text)::timestamp   > $3::timestamp
    `, [department, newEnd, newStart])

    if (overlap.rowCount > 0) {
      const clash = overlap.rows[0]
      return res.status(409).json({
        success: false,
        error: 'Time overlap with existing duty',
        clash: {
          name: clash.name,
          from: `${clash.duty_date.toISOString().split('T')[0]} ${clash.start_time}`,
          to: `${clash.end_date.toISOString().split('T')[0]} ${clash.end_time}`
        }
      })
    }

    const result = await pool.query(
      `INSERT INTO duty_assignments (employee_id, department, duty_date, end_date, start_time, end_time)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [employee_id, department, duty_date, end_date, start_time || '09:00', end_time || '08:59']
    )
    io.emit('duty:updated')
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── PATCH update duty assignment ───
app.patch('/api/duties/:id', async (req, res) => {
  const { id } = req.params
  const { employee_id, duty_date, end_date, start_time, end_time } = req.body
  try {
    const newStart = `${duty_date} ${start_time}`
    const newEnd = `${end_date} ${end_time}`

    const overlap = await pool.query(`
      SELECT d.*, e.name FROM duty_assignments d
      JOIN employees e ON d.employee_id = e.id
      WHERE d.department = (SELECT department FROM duty_assignments WHERE id = $1)
        AND d.id != $1
        AND (d.duty_date::text || ' ' || d.start_time::text)::timestamp < $2::timestamp
        AND (d.end_date::text  || ' ' || d.end_time::text)::timestamp   > $3::timestamp
    `, [id, newEnd, newStart])

    if (overlap.rowCount > 0) {
      const clash = overlap.rows[0]
      return res.status(409).json({
        success: false,
        error: 'Time overlap with existing duty',
        clash: {
          name: clash.name,
          from: `${clash.duty_date.toISOString().split('T')[0]} ${clash.start_time}`,
          to: `${clash.end_date.toISOString().split('T')[0]} ${clash.end_time}`
        }
      })
    }

    const result = await pool.query(
      `UPDATE duty_assignments SET
        employee_id = COALESCE($1, employee_id),
        duty_date   = COALESCE($2, duty_date),
        end_date    = COALESCE($3, end_date),
        start_time  = COALESCE($4, start_time),
        end_time    = COALESCE($5, end_time)
       WHERE id = $6 RETURNING *`,
      [employee_id, duty_date, end_date, start_time, end_time, id]
    )
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Not found' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── DELETE duty assignment ───
app.delete('/api/duties/:id', async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('DELETE FROM duty_assignments WHERE id = $1', [id])
    io.emit('duty:updated')
    res.json({ success: true, message: 'Duty removed' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── GET today's duty person for a department ───
app.get('/api/duties/today/:department', async (req, res) => {
  const { department } = req.params
  try {
    const result = await pool.query(`
      SELECT d.*, e.name, e.email
      FROM duty_assignments d
      JOIN employees e ON d.employee_id = e.id
      WHERE d.department = $1
        AND NOW() >= (d.duty_date::text || ' ' || d.start_time::text)::timestamp
        AND NOW() <  (d.end_date::text  || ' ' || d.end_time::text)::timestamp
      LIMIT 1
    `, [department])
    if (result.rowCount === 0) {
      return res.json({ success: false, message: 'No duty assigned for today' })
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})


// ─── PATCH upload resolver image ───
app.patch('/api/tickets/:id/resolver-image', upload.single('image'), async (req, res) => {
  const { id } = req.params
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image provided' })
  }
  try {
    const image_url = `/uploads/${req.file.filename}`
    const result = await pool.query(
      `UPDATE tickets SET resolver_image_url = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [image_url, id]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Ticket not found' })
    }
    const ticket = result.rows[0]
    io.emit('ticket:updated', ticket)
    res.json({ success: true, data: ticket })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})


// ─── REGISTER new user ───
app.post('/api/register', async (req, res) => {
  const { emp_id, full_name, email } = req.body
  if (!emp_id || !full_name || !email) {
    return res.status(400).json({ success: false, error: 'All fields required' })
  }
  try {
    // Check if emp_id or email already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE emp_id = $1 OR email = $2',
      [emp_id, email]
    )
    if (existing.rowCount > 0) {
      return res.status(409).json({ success: false, error: 'Employee ID or email already registered' })
    }

    // Generate random password
    const randomPassword = crypto.randomBytes(4).toString('hex').toUpperCase()
    const hashedPassword = await bcrypt.hash(randomPassword, 10)

    // Save user
    const result = await pool.query(
      `INSERT INTO users (emp_id, full_name, email, password, role)
       VALUES ($1, $2, $3, $4, 'operator') RETURNING id, emp_id, full_name, email, role`,
      [emp_id, full_name, email, hashedPassword]
    )

    // Send email with credentials
    await sendWelcomeEmail(full_name, email, emp_id, randomPassword)


    io.emit('user:registered')
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})
//forgot password
// ─── FORGOT PASSWORD ───
app.post('/api/forgot-password', async (req, res) => {
  const { emp_id } = req.body
  if (!emp_id) return res.status(400).json({ success: false, error: 'Employee ID required' })

  try {
    const result = await pool.query('SELECT * FROM users WHERE emp_id = $1', [emp_id])
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'No account found with this Employee ID' })
    }

    const user = result.rows[0]

    // Generate new random password
    const newPassword = crypto.randomBytes(4).toString('hex').toUpperCase()
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update in database
    await pool.query('UPDATE users SET password = $1 WHERE emp_id = $2', [hashedPassword, emp_id])

    // Send email
    await sendForgotPasswordEmail(user.full_name, user.email, emp_id, newPassword)

    res.json({ success: true, message: 'New password sent to registered email' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})
// ─── USER LOGIN ───
app.post('/api/user-login', async (req, res) => {
  const { emp_id, password } = req.body
  if (!emp_id || !password) {
    return res.status(400).json({ success: false, error: 'Employee ID and password required' })
  }
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE emp_id = $1', [emp_id]
    )
    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, error: 'Invalid Employee ID or password' })
    }
    const user = result.rows[0]
    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid Employee ID or password' })
    }
    res.json({
      success: true,
      data: {
        emp_id: user.emp_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── CHANGE PASSWORD ───
app.post('/api/change-password', async (req, res) => {
  const { emp_id, new_password } = req.body
  if (!emp_id || !new_password) {
    return res.status(400).json({ success: false, error: 'Required fields missing' })
  }
  try {
    const hashedPassword = await bcrypt.hash(new_password, 10)
    await pool.query(
      'UPDATE users SET password = $1 WHERE emp_id = $2',
      [hashedPassword, emp_id]
    )
    res.json({ success: true, message: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── GET all users (admin only) ───
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, emp_id, full_name, email, role, created_at FROM users ORDER BY created_at DESC'
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ─── UPDATE user role (admin only) ───
app.patch('/api/users/:id/role', async (req, res) => {
  const { id } = req.params
  const { role } = req.body
  if (!['operator', 'resolver'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role' })
  }
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
      [role, id]
    )
    const updatedUser = result.rows[0]
    // Force logout that user
    io.emit('user:role_changed', { emp_id: updatedUser.emp_id, new_role: role })
    res.json({ success: true, data: updatedUser })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})
// ─── DELETE user (admin only) ───
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id])
    res.json({ success: true, message: 'User deleted' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})


// ─── Socket connection ───
io.on('connection', (socket) => {
  console.log(`🟢 Client connected: ${socket.id}`)
  socket.on('disconnect', () => {
    console.log(`🔴 Client disconnected: ${socket.id}`)
  })
})

// ─── START SERVER ───
const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📊 Health: http://localhost:${PORT}/api/health`)
})