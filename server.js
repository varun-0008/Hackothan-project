require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./database.js'); // Your database connection
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const port = 3000;
const saltRounds = 10; // Cost factor for hashing

// You can now securely access your API key like this:
const weatherApiKey = "729cb632096643bf91684003252209"; // For weatherapi.com
const aiApiKey = "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"; // For AI services (OpenRouter, etc.)

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

// Serve market.html only if authenticated
app.get('/market.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'market.html'));
});

// Serve crop.html only if authenticated
app.get('/crop.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'crop.html'));
});

// Serve chat.html only if authenticated
app.get('/chat.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// --- Mock Market Data Function ---
const getMockMarketData = (location) => {
    const basePrices = {
        'Wheat': 2150,
        'Rice': 3600,
        'Cotton': 7800,
        'Sugarcane': 320,
        'Soybean': 4900,
    };

    // Simulate slightly different prices for different locations
    let locationMultiplier = 1.0;
    if (location === 'Maharashtra') {
        locationMultiplier = 1.02;
    } else if (location === 'Telangana') {
        locationMultiplier = 1.05; // Cotton and Rice are important here
    } else { // Karnataka
        locationMultiplier = 0.98;
    }

    const marketData = Object.entries(basePrices).map(([commodity, price]) => {
        const finalPrice = Math.round(price * locationMultiplier + (Math.random() - 0.5) * 50);
        return { commodity, price: finalPrice };
    });

    return { location, data: marketData };
};

// --- API Endpoints ---

// Weather API Endpoint
app.get('/api/weather', isAuthenticated, async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
        return res.status(400).json({ success: false, message: 'Latitude and Longitude are required.' });
    }

    if (!weatherApiKey) {
        return res.status(500).json({ success: false, message: 'Weather API key is not configured on the server.' });
    }

    try {
        const weatherApiUrl = `http://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${lat},${lon}`;
        const response = await axios.get(weatherApiUrl);
        res.json({ success: true, weather: response.data }); // Forward the weatherapi.com response
    } catch (error) {
        console.error('Error fetching weather data:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch weather data.' });
    }
});

// Market Data Endpoint
app.get('/api/market-data', isAuthenticated, async (req, res) => {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.status(400).json({ success: false, message: 'Latitude and Longitude are required.' });
    }

    try {
        // In a real app, you would use a geocoding service with your API key.
        // For this example, we'll simulate a location based on latitude.
        let location = 'Karnataka'; // Default
        const latitude = parseFloat(lat);
        if (latitude > 19) {
            location = 'Maharashtra';
        } else if (latitude > 16) {
            location = 'Telangana';
        }

        const marketData = getMockMarketData(location);
        res.json({ success: true, marketData });
    } catch (error) {
        console.error('Error fetching market data:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch market data.' });
    }
});

// AI Feedback Endpoint
app.post('/api/crop-feedback', isAuthenticated, async (req, res) => {
    const {
        cropName,
        variety,
        sowingDate,
        harvestDate,
        landArea,
        soilType,
        irrigationMethod
    } = req.body.formData;
    const language = req.body.language || 'English';

    if (!cropName || !soilType) {
        return res.status(400).json({ success: false, message: 'Crop name and soil type are required for feedback.' });
    }

    if (!aiApiKey) {
        return res.status(500).json({ success: false, message: 'AI API key is not configured on the server.' });
    }

    const prompt = `
        As an expert agricultural advisor, provide brief feedback and suggestions for the following crop plan in India. Respond in ${language}.
        Keep the feedback concise, using bullet points for suggestions.

        Crop Plan:
        - Crop: ${cropName}
        - Variety: ${variety || 'Not specified'}
        - Sowing Date: ${sowingDate || 'Not specified'}
        - Expected Harvest Date: ${harvestDate || 'Not specified'}
        - Land Area: ${landArea || 'Not specified'} acres
        - Soil Type: ${soilType}
        - Irrigation Method: ${irrigationMethod}

        Provide feedback on the suitability of the crop for the soil, timing, and suggest any potential improvements or things to watch out for.
    `;

    try {
        const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
        const headers = {
            'Authorization': `Bearer ${aiApiKey}`,
            'HTTP-Referer': `http://localhost:${port}`, // Required by some providers like OpenRouter
            'X-Title': 'Farmer AI App' // Optional, for identification
        };
        const data = {
            model: "mistralai/mistral-7b-instruct:free", // Using a free model from OpenRouter
            messages: [
                { "role": "user", "content": prompt }
            ]
        };

        const apiResponse = await axios.post(openRouterUrl, data, { headers });

        if (!apiResponse.data.choices || apiResponse.data.choices.length === 0) {
            console.error('AI API returned no choices.');
            return res.status(500).json({ success: false, message: 'The AI assistant returned an empty response.' });
        }

        const feedback = apiResponse.data.choices[0].message.content;
        res.json({ success: true, feedback });
    } catch (error) {
        console.error('Error calling AI API:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Failed to get feedback from AI assistant.' });
    }
});

// AI Chat Endpoint
app.post('/api/chat', isAuthenticated, async (req, res) => {
    const { message, language } = req.body;
    const lang = language || 'English';

    if (!message) {
        return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    if (!aiApiKey) {
        return res.status(500).json({ success: false, message: 'AI API key is not configured on the server.' });
    }

    const prompt = `You are an expert agricultural assistant for Indian farmers. Your goal is to provide helpful, concise, and practical advice. Answer the following user query in ${lang}: "${message}"`;

    try {
        const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
        const headers = {
            'Authorization': `Bearer ${aiApiKey}`,
            'HTTP-Referer': `http://localhost:${port}`,
            'X-Title': 'Farmer AI App'
        };
        const data = {
            model: "mistralai/mistral-7b-instruct:free",
            messages: [
                { "role": "user", "content": prompt }
            ]
        };
        const apiResponse = await axios.post(openRouterUrl, data, { headers });

        if (!apiResponse.data.choices || apiResponse.data.choices.length === 0) {
            return res.status(500).json({ success: false, message: 'The AI assistant returned an empty response.' });
        }

        const reply = apiResponse.data.choices[0].message.content;
        res.json({ success: true, reply });
    } catch (error) {
        console.error('Error calling AI API for chat:', error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: 'Failed to get a response from the AI assistant.' });
    }
});

// Signup Endpoint
app.post('/api/signup', async (req, res) => {
    const { username, email, mobile, password } = req.body;

    if (!username || !email || !mobile || !password) {
        return res.status(400).json({ success: false, message: 'Username, email, mobile number, and password are required.' });
    }

    try {
        const hash = await bcrypt.hash(password, saltRounds);
        const sql = 'INSERT INTO users (username, email, mobile, password) VALUES (?, ?, ?, ?)';
        
        // Use a Promise wrapper for db.run to use async/await
        await new Promise((resolve, reject) => {
            db.run(sql, [username, email, mobile, hash], function(err) {
                if (err) {
                    // More specific error for UNIQUE constraint
                    if (err.code === 'SQLITE_CONSTRAINT') {
                        return reject({ status: 409, message: 'Username, email, or mobile number already taken.' });
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
        return res.status(400).json({ success: false, message: 'Identifier (username, email, or mobile) and password are required.' });
    }

    try {
        const sql = 'SELECT * FROM users WHERE username = ? OR email = ? OR mobile = ?';
        
        // Use a Promise wrapper for db.get
        const user = await new Promise((resolve, reject) => {
            db.get(sql, [loginIdentifier, loginIdentifier, loginIdentifier], (err, row) => {
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
    const { identifier } = req.body; // Can be email or mobile
    try {
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id, email FROM users WHERE email = ? OR mobile = ?', [identifier, identifier], (err, row) => {
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
            return res.json({ success: true, token: token, email: user.email, message: 'If an account exists, a password reset link will be sent to the registered email.' });
        }

        // Always send a generic success message to prevent username enumeration
        res.json({ success: true, message: 'If an account exists, a password reset link has been generated.' });

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
app.get('/api/user/profile', isAuthenticated, async (req, res) => {
    const { id } = req.session.user;
    try {
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id, username, email, mobile FROM users WHERE id = ?', [id], (err, row) => {
                if (err) reject({ status: 500, message: 'Database error.' });
                resolve(row);
            });
        });

        if (user) {
            res.json({ success: true, user });
        } else {
            res.status(404).json({ success: false, message: 'User not found.' });
        }
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
});

// Update User Profile Endpoint
app.put('/api/user/profile', isAuthenticated, async (req, res) => {
    const { username, email, mobile } = req.body;
    const { id } = req.session.user;

    if (!username || !email || !mobile) {
        return res.status(400).json({ success: false, message: 'Username, email, and mobile are required.' });
    }

    try {
        const sql = 'UPDATE users SET username = ?, email = ?, mobile = ? WHERE id = ?';
        await new Promise((resolve, reject) => {
            db.run(sql, [username, email, mobile, id], function(err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT') {
                        return reject({ status: 409, message: 'Username, email, or mobile already in use.' });
                    }
                    return reject({ status: 500, message: 'Error updating profile.' });
                }
                resolve();
            });
        });

        res.json({ success: true, message: 'Profile updated successfully.' });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
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