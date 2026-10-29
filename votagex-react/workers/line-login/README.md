# ล็อกอิน LINE (Cloudflare Worker)

Firebase ไม่มีล็อกอิน LINE ให้ตรงๆ Worker ตัวนี้เลยเป็นตัวกลาง:
แอป → `/start` → หน้าล็อกอินของ LINE → `/callback` → Worker ถาม LINE ว่าเป็นใคร
→ ออกบัตรผ่านของ Firebase (custom token) ให้บัญชี `line:<LINE id>` → ส่งกลับไปหน้าเดิมของแอปหลัง `#`
→ แอปล็อกอินด้วยบัตรนั้น และตั้งชื่อกับรูปตาม LINE

ใช้ฟรีทั้งหมด ไม่ต้องผูกบัตร (Cloudflare Workers แผนฟรี 100,000 ครั้งต่อวัน, LINE Login ฟรี)
บัญชี LINE กับบัญชี Google เป็นคนละบัญชีกัน (ยังไม่ผูกรวม)

## ตั้งค่าครั้งแรก

ทุกคำสั่งรันในโฟลเดอร์นี้ (`votagex-react/workers/line-login`)

1. **Cloudflare:** สมัครที่ https://dash.cloudflare.com/sign-up (ฟรี ไม่ใส่บัตร) แล้วรัน
   `npx wrangler login` (เปิดเบราว์เซอร์ให้กดอนุญาต)
2. **ขึ้น Worker ครั้งแรก** เพื่อให้ได้ที่อยู่: `npx wrangler deploy`
   จะได้ที่อยู่แบบ `https://votagex-line-login.<ชื่อของคุณ>.workers.dev`
3. **LINE Developers:** https://developers.line.biz/console/ ล็อกอินด้วย LINE
   - สร้าง Provider (ชื่ออะไรก็ได้ เช่น VOTAGEX)
   - สร้าง channel ประเภท **LINE Login** เลือก App type **Web app**
   - แท็บ LINE Login → Callback URL ใส่ `https://votagex-line-login.<ชื่อของคุณ>.workers.dev/callback`
   - แท็บ Basic settings จด **Channel ID** (ไม่ลับ ส่งให้ผมใส่ใน `wrangler.toml` ได้)
     และ **Channel secret** (ลับ ห้ามส่งในแชท)
   - กด **Publish** channel (ถ้ายัง Developing จะล็อกอินได้แค่คุณกับคนที่เพิ่มเป็นผู้ทดสอบ)
4. **ใส่ความลับ** (วางค่าเมื่อถูกถาม ค่าจะไม่โชว์บนจอ):
   - `npx wrangler secret put LINE_CHANNEL_SECRET` → วาง Channel secret
   - Firebase console → ⚙️ Project settings → Service accounts → **Generate new private key**
     (ได้ไฟล์ .json ใน Downloads) แล้วรัน
     `npx wrangler secret put FIREBASE_SERVICE_ACCOUNT < ~/Downloads/<ชื่อไฟล์>.json`
     เสร็จแล้ว**ลบไฟล์นั้นทิ้ง** กุญแจนี้มีสิทธิ์เต็มในโปรเจกต์ ห้ามส่งให้ใครหรือเก็บในโปรเจกต์
5. ใส่ Channel ID ใน `wrangler.toml` (`LINE_CHANNEL_ID`) แล้ว `npx wrangler deploy` อีกครั้ง
6. แอป: ใส่ `VITE_LINE_LOGIN_URL=https://votagex-line-login.<ชื่อของคุณ>.workers.dev` ใน `votagex-react/.env`
   แล้ว build ใหม่ ปุ่ม LINE จะเปิดเอง (ไม่ใส่ = ปุ่มขึ้น "เร็วๆ นี้")

## ปลอดภัยไว้ก่อน

- Worker ส่งบัตรผ่านกลับได้เฉพาะเว็บใน `ALLOWED_ORIGINS` (เว็บจริง, เว็บทดสอบ, เครื่องตัวเอง)
- เช็ก `state` (กันคนอื่นแทรกกลางทาง) และ `nonce` (กันเอา token เก่ามาใช้ซ้ำ) ทุกครั้ง
- บัตรผ่านอยู่หลัง `#` จึงไม่ถูกส่งไปเซิร์ฟเวอร์ไหน แอปลบออกจากที่อยู่ทันทีที่อ่าน
- ถ้ากุญแจหลุด: ลบกุญแจนั้นใน Google Cloud console (IAM → Service accounts → Keys) แล้วสร้างใหม่ตามข้อ 4

## ทดสอบในเครื่อง

`npx wrangler dev` อ่านค่าจากไฟล์ `.dev.vars` (ไม่ขึ้น git) ทดสอบกับ LINE ปลอมได้โดยตั้ง
`LINE_AUTHORIZE` และ `LINE_API` ให้ชี้ไปที่ตัวปลอม ใช้กุญแจทดลองกับ Auth emulator ไม่ต้องใช้ของจริง
