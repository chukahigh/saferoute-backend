require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { runMigrations } = require('./db');

const authRouter = require('./routes/auth');
const reportsRouter = require('./routes/reports');
const adminRouter = require('./routes/admin');
const facilitiesRouter = require('./routes/facilities');
const usersRouter = require('./routes/users');
const commentsRouter = require('./routes/comments');
const notificationsRouter = require('./routes/notifications');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/info', (req, res) => res.json({ name: 'SafeRoute API', version: '0.4.0' }));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/reports', commentsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/facilities', facilitiesRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/notifications', notificationsRouter);

const PORT = process.env.PORT || 3000;

runMigrations().then(() => {
  app.listen(PORT, () => console.log(`SafeRoute backend listening on ${PORT}`));
}).catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
