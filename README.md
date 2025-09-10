#  Adda_Box Chat-App

A real-time chat application built with **Node.js, Express, MongoDB, and Socket.IO**, featuring:

- User authentication with JWT  
-  MongoDB Atlas for persistent storage  
-  WebSockets (Socket.IO) for live messaging  
-  Online presence tracking (who’s online)  
-  TailwindCSS-powered front-end  
-  Deployed on **Render** (free tier)

---

##  Live Demo
[Adda_Box Chat-App on Render](https://adda-box-chat-app.onrender.com)

---

## 📂 Project Structure
adda_box/
├── public/ # Frontend (HTML + Tailwind + JS)
│ └── index.html
├── src/
│ ├── config/ # DB connection
│ │ └── db.js
│ ├── middleware/ # Auth middleware
│ │ └── auth.js
│ ├── models/ # MongoDB models
│ │ ├── User.js
│ │ └── Message.js
│ ├── routes/ # API routes
│ │ ├── auth.routes.js
│ │ ├── messages.routes.js
│ │ └── users.routes.js
│ ├── socket.js # Socket.IO setup
│ └── server.js # Express + HTTP server
├── .env # Environment variables (not committed)
├── package.json
└── README.md

# Features to Try

Register new users

Login with email & password

Join a room (general by default)

Send and receive real-time messages

See who is online in real time

Auto-login with JWT stored in localStorage

Logout anytime

# Security

Passwords stored as bcrypt hashes

JWT-based authentication

Email validation + strong password rules enforced
