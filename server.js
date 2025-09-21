require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./database.js'); // Your database connection
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = 3000;
const saltRounds = 10; // Cost factor for hashing

// You can now securely access your API key like this:
const googleApiKey = process.env.GOOGLE_API_KEY;

// --- Middleware ---
app.use(express.json()); // To parse JSON request bodies from fetch

// Session Middleware Setup
app.use(session({
    store: new SQLiteStore({ db: 'database.db', dir: './' }),
    secret: process.env.SESSION_SECRET || 'default-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
}));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Middleware to protect routes
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next(); // User is authenticated, proceed to the route
    } else {
        res.redirect('/index.html'); // User is not authenticated, redirect to login
    }
};

// --- Root Route ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Public Routes for Password Reset ---
app.get('/forgot-password.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'forgot-password.html'));
});

app.get('/reset-password.html', (req, res) => {
    // This page is accessible to anyone with a valid token link
    res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

// --- Protected Routes ---

// Serve home.html only if authenticated
app.get('/home.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Serve profile.html only if authenticated
app.get('/profile.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// --- API Endpoints ---

// Signup Endpoint
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: 'Username, email, and password are required.' });
    }

    try {
        const hash = await bcrypt.hash(password, saltRounds);
        const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        
        // Use a Promise wrapper for db.run to use async/await
        await new Promise((resolve, reject) => {
            db.run(sql, [username, email, hash], function(err) {
                if (err) {
                    // More specific error for UNIQUE constraint
                    if (err.code === 'SQLITE_CONSTRAINT') {
                        return reject({ status: 409, message: 'Username or email already taken.' });
                    }
                    return reject({ status: 500, message: 'Database error during signup.' });
                }
                resolve();
            });
        });

        res.status(201).json({ success: true, message: 'User created successfully.' });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message || 'Error creating user.' });
    }
});

// Login Endpoint
app.post('/api/login', async (req, res) => {
    const { loginIdentifier, password } = req.body;

    if (!loginIdentifier || !password) {
        return res.status(400).json({ success: false, message: 'Username/email and password are required.' });
    }

    try {
        const sql = 'SELECT * FROM users WHERE username = ? OR email = ?';
        
        // Use a Promise wrapper for db.get
        const user = await new Promise((resolve, reject) => {
            db.get(sql, [loginIdentifier, loginIdentifier], (err, row) => {
                if (err) reject({ status: 500, message: 'Database error during login.' });
                resolve(row);
            });
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const match = await bcrypt.compare(password, user.password);

        if (match) {
            // Passwords match, create session
            req.session.user = { id: user.id, username: user.username, email: user.email };
            res.json({ success: true, message: 'Login successful!' });
        } else {
            // Passwords do not match
            res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message || 'An error occurred during login.' });
    }
});

// --- Password Reset Endpoints ---

// 1. Forgot Password: Generate and "send" a reset token
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject({ status: 500, message: 'Database error.' });
                resolve(row);
            });
        });

        // Always send a generic success message to prevent username enumeration
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            const expires_at = Date.now() + 3600000; // Token expires in 1 hour

            await new Promise((resolve, reject) => {
                db.run('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expires_at], (err) => {
                    if (err) reject({ status: 500, message: 'Error saving reset token.' });
                    resolve();
                });
            });

            // Return the token to the client so it can send the email
            return res.json({ success: true, token: token, message: 'If an account with that email exists, a password reset link will be sent.' });
        }

        // Always send a generic success message to prevent username enumeration
        res.json({ success: true, message: 'If an account with that email exists, a password reset link has been generated.' });

    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});

// 2. Reset Password: Validate token and update password
app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const resetRequest = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM password_resets WHERE token = ? AND expires_at > ?', [token, Date.now()], (err, row) => {
                if (err) reject({ status: 500, message: 'Database error.' });
                resolve(row);
            });
        });

        if (!resetRequest) {
            return res.status(400).json({ success: false, message: 'Password reset token is invalid or has expired.' });
        }

        const newHash = await bcrypt.hash(newPassword, saltRounds);
        await db.run('UPDATE users SET password = ? WHERE id = ?', [newHash, resetRequest.user_id]);
        await db.run('DELETE FROM password_resets WHERE token = ?', [token]); // Invalidate the token

        res.json({ success: true, message: 'Password has been reset successfully. You can now log in.' });

    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});

// Get User Profile Endpoint
app.get('/api/user/profile', isAuthenticated, (req, res) => {
    // Send back non-sensitive user data from the session
    res.json({ success: true, username: req.session.user.username, email: req.session.user.email });
});

// Change Password Endpoint
app.put('/api/user/password', isAuthenticated, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { id } = req.session.user;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        // Get current user from DB to check password
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) reject({ status: 500, message: 'Database error.' });
                resolve(row);
            });
        });

        // Verify current password
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Incorrect current password.' });
        }

        // Hash and update new password
        const newHash = await bcrypt.hash(newPassword, saltRounds);
        await new Promise((resolve, reject) => {
            db.run('UPDATE users SET password = ? WHERE id = ?', [newHash, id], (err) => {
                if (err) reject({ status: 500, message: 'Error updating password.' });
                resolve();
            });
        });

        res.json({ success: true, message: 'Password updated successfully.' });

    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});

// Delete Account Endpoint
app.delete('/api/user/account', isAuthenticated, async (req, res) => {
    const { id } = req.session.user;
    try {
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
                if (err) reject({ status: 500, message: 'Error deleting account.' });
                req.session.destroy(() => resolve());
            });
        });
        res.json({ success: true, message: 'Account deleted successfully.' });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});

// Logout Endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Could not log out, please try again.' });
        }
        res.clearCookie('connect.sid'); // The default session cookie name
        res.json({ success: true, message: 'Logout successful.' });
    });
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});