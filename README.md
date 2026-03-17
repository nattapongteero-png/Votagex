# Votagex — Trip Planning App

แอปวางแผนท่องเที่ยวแบบกลุ่ม สร้างทริป เชิญเพื่อน และติดตามค่าใช้จ่ายได้ในที่เดียว

**Live:** https://votagex-7ab43.web.app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| UI | MUI (Material UI) + Custom CSS |
| Backend / Auth | Firebase (Firestore + Google Auth) |
| Hosting | Firebase Hosting |
| Routing | React Router v7 |

---

## Features

### Trip Management
- **สร้างทริป** — ตั้งชื่อ, วันเดินทาง, งบประมาณ, กิจกรรม, รูปปก
- **เข้าร่วมทริป** — Swipe card stack (ซ้าย/ขวา) เพื่อดูและเข้าร่วมทริปของคนอื่น
- **แก้ไข/ลบทริป** — เจ้าของทริปเท่านั้น
- **ออกจากทริป** — สมาชิกออกได้เมื่อไหร่ก็ได้

### Trip Detail
- ดูรายละเอียด Day-by-Day พร้อมค่าใช้จ่ายแต่ละวัน
- สรุปค่าใช้จ่ายทั้งหมดแยกตามหมวดหมู่
- แสดงสมาชิกทริปและสิทธิ์แต่ละคน

### Join Screen (Card Stack)
- แสดงทริปทั้งหมดในรูปแบบ card stack แบบ Tinder-style
- ทริปของตัวเองหรือที่เข้าร่วมอยู่แล้วจะแสดงขึ้นมาก่อน
- Swipe ซ้าย/ขวา หรือกดลูกศรเพื่อเปลี่ยน card
- 3-dot menu บน card สำหรับแก้ไขหรือลบทริปของตัวเอง

### Calendar
- ป้องกันการเลือกวันในอดีต
- แสดง blocked dates สำหรับวันที่มีทริปอยู่แล้ว
- แจ้งเตือนเมื่อวันทริปทับซ้อนกัน

### Permission System
- **เจ้าของทริป** — แก้ไข, ลบ, จัดการสมาชิก
- **สมาชิก** — ดูข้อมูล, ออกจากทริปได้
- Firestore Rules บังคับ permission ระดับ server

---

## Project Structure

```
votagex-react/
├── src/
│   ├── pages/
│   │   ├── LandingPage.jsx       # หน้าแรก / login
│   │   ├── HomePage.jsx          # ทริปของฉัน
│   │   ├── ITripPage.jsx         # ค้นหาทริป
│   │   ├── JoinScreen.jsx        # Swipe card stack
│   │   ├── TripDetailPage.jsx    # รายละเอียดทริป
│   │   ├── MePage.jsx            # โปรไฟล์
│   │   └── creation/             # Wizard สร้างทริป (5 steps)
│   ├── components/
│   │   ├── common/               # TripCard, BottomNav, etc.
│   │   └── modals/               # Modal ทุกตัว
│   ├── contexts/
│   │   ├── AuthContext.jsx       # Google Auth state
│   │   └── TripContext.jsx       # Trip CRUD + Firestore realtime
│   ├── services/
│   │   ├── firebase.js           # Firebase init + auth
│   │   └── storage.js            # Firestore CRUD helpers
│   └── styles/                   # CSS per-page/component
├── firestore.rules               # Firestore security rules
├── firebase.json                 # Hosting + Firestore config
└── vite.config.js
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project พร้อม Firestore + Google Auth เปิดอยู่

### Install

```bash
cd votagex-react
npm install
```

### Environment Variables

สร้างไฟล์ `.env` ใน `votagex-react/`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Run Dev Server

```bash
npm run dev
# http://localhost:5174
```

### Build & Deploy

```bash
npm run build
firebase deploy
```

---

## Firestore Rules

```
/trips/{tripId}
  - read:   ทุกคนที่ login
  - create: ทุกคนที่ login
  - update: เจ้าของทริป (ทุก field) หรือ ทุกคน (เฉพาะ members/memberUids เพื่อ join)
  - delete: เจ้าของทริปเท่านั้น
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (port 5174) |
| `npm run build` | Build production |
| `npm run preview` | Preview production build |
| `firebase deploy` | Deploy rules + hosting |
