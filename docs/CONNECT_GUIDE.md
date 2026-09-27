# คู่มือเชื่อมต่อ Groundtruth กับ automation จริง

เอกสารนี้สำหรับทดสอบเชื่อมต่อ Groundtruth กับ n8n / Make จริง ก่อนให้คนอื่นลองใช้งาน

---

## 0. เตรียมก่อนเริ่ม

- [ ] Backend server รันอยู่ (`npm run server`)
- [ ] ตั้งค่า `WEBHOOK_SECRET` ใน `.env` แล้ว (แนะนำเปลี่ยนจาก `change-me-in-production`)
- [ ] ถ้ารันบน `localhost`: n8n Cloud / Make Cloud **เข้าไม่ถึง** ต้องมีอย่างใดอย่างหนึ่ง:
  - Deploy server ขึ้นที่ที่เข้าถึงได้จากอินเทอร์เน็ตจริง หรือ
  - ใช้ [ngrok](https://ngrok.com) เปิด tunnel ชั่วคราว: `ngrok http 3001` แล้วใช้ URL ที่ ngrok ให้มาแทน `localhost:3001`

---

## 1. สร้าง workflow ใน Groundtruth

1. เปิดเว็บ Groundtruth → กด **"+ Add Workflow"**
2. กรอก:
   - **Workflow Name**: ชื่อให้ตรงกับ workflow จริงใน n8n/Make (เช่น "Lead → CRM → Email")
   - **Platform**: n8n / Make / Zapier / Custom API
   - **Expected Frequency**: workflow นี้ควรรันบ่อยแค่ไหน (ใช้ตรวจจับ inactivity)
3. กด **Add Workflow**

ระบบจะสร้าง monitoring check เริ่มต้น 4 อย่างให้อัตโนมัติ (heartbeat, output, validation, anomaly)

---

## 2. เอา Webhook URL

1. คลิก workflow ที่เพิ่งสร้าง เปิด detail modal
2. ไปแท็บ **"Connect"**
3. จะเห็น:
   - **Webhook URL**: `http://<your-server>/api/webhook/<workflowId>` — กด Copy
   - **Header ที่ต้องใส่**: `Authorization: Bearer <WEBHOOK_SECRET>`
   - **ตัวอย่าง JSON body**

จด 2 อย่างนี้ไว้: **Webhook URL** และ **WEBHOOK_SECRET** (หาได้จาก `.env` ของ server)

---

## 3. ทดสอบเองก่อน ด้วย curl (ทำก่อนไปตั้งค่าใน n8n)

ยืนยันว่า endpoint ทำงานจริงก่อนเสียเวลาไปตั้งค่าใน n8n:

```bash
curl -X POST "<Webhook URL>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <WEBHOOK_SECRET>" \
  -d '{"status":"success","outputCount":1,"note":"test run"}'
```

ผลลัพธ์ที่ควรได้: `{"received":true,"execution":"...","monitoring":{...}}`

ถ้าได้ `{"error":"Invalid webhook secret"}` → เช็คค่า `WEBHOOK_SECRET` ใน header กับใน `.env` ว่าตรงกัน

---

## 4. ตั้งค่าใน n8n

1. เปิด workflow จริงใน n8n ที่จะมอนิเตอร์
2. เพิ่ม node **"HTTP Request"** ต่อท้าย **หลัง step ที่สำคัญที่สุด** (เช่น หลัง node "ส่งอีเมล" ไม่ใช่ต้น workflow — ไม่งั้นจะจับ silent failure ของ step นั้นไม่ได้)
3. ตั้งค่า node:
   - **Method**: `POST`
   - **URL**: Webhook URL จากข้อ 2
   - **Header**: `Authorization: Bearer <WEBHOOK_SECRET>`
   - **Body** (JSON):
     ```json
     {
       "status": "success",
       "outputCount": 1,
       "note": "อธิบายสั้นๆ ว่าเกิดอะไรขึ้น"
     }
     ```
     - `status` ต้องเป็นหนึ่งใน: `success`, `failed`, `success_silent_fail`, `success_anomaly`
     - `outputCount` ควรดึงจากผลลัพธ์จริงของ node ก่อนหน้า (เช่น จำนวนอีเมลที่ส่งจริง) ไม่ใช่ hardcode
4. Save workflow

**ข้อจำกัดสำคัญ**: HTTP Request node ที่วางท้าย workflow แบบนี้ ทำงาน **เฉพาะตอน workflow รันจบถึงจุดนั้นจริง** ถ้า node ไหนก่อนหน้าพัง (throw error) กลางทาง — node ส่ง webhook นี้จะไม่ถูกรันเลย และ Groundtruth จะไม่รู้เรื่องอะไรทั้งนั้น เงียบสนิท ต้องทำข้อ 4a เพิ่มด้วยเสมอ ไม่ใช่แค่ข้อ 4

## 4a. ตั้งค่า Error Trigger (จำเป็น — ครอบคลุม error ที่เกิดกลาง workflow)

n8n มี node แยกต่างหากชื่อ **"Error Trigger"** ที่ทำงานอัตโนมัติทุกครั้งที่ **node ไหนก็ตาม** ใน workflow เกิด error ไม่ว่าจะพังตรงจุดไหนก็ตาม แก้ blind spot ของข้อ 4 ได้

1. สร้าง workflow ใหม่แยกต่างหาก (เช่น ชื่อ "Error Handler")
2. เพิ่ม trigger node ประเภท **"Error Trigger"** เป็นจุดเริ่มของ workflow นี้
3. ต่อ node **"HTTP Request"** จาก Error Trigger:
   - Method: `POST`
   - URL: Webhook URL เดียวกับข้อ 2 (workflow เดียวกันที่ error)
   - Header: เหมือนข้อ 4
   - Body:
     ```json
     {
       "status": "failed",
       "outputCount": 0,
       "note": "{{ $json.execution.error.message }} @ {{ $json.execution.error.node.name }}"
     }
     ```
     ข้อมูลจาก `$json.execution.error` ละเอียดกว่าพิมพ์เอง มี node ที่พัง, error message เต็ม
4. บันทึก workflow นี้ไว้
5. กลับไปที่ workflow หลัก (ที่ทำข้อ 4) → เปิด **Workflow Settings** (สามจุดมุมขวาบน) → หา **"Error Workflow"** → เลือก workflow "Error Handler" ที่เพิ่งสร้าง
6. Save

ตอนนี้ workflow หลักมี **2 ทางส่งข้อมูลเข้า Groundtruth**:
- รันจบปกติ → node ท้าย workflow ส่ง `status:"success"`
- พังตรงไหนก็ตาม → Error Workflow ดักจับ ส่ง `status:"failed"` แทน

## 4b. ตั้งค่าใน Make

หลักการเดียวกับ n8n:

1. เพิ่ม module **"HTTP > Make a request"** ต่อท้าย scenario ส่ง `status:"success"`
2. Method `POST`, URL = Webhook URL, Header เดียวกัน, Body เดียวกัน
3. Make มี **"Error handler"** แยกต่างหากต่อบน route ได้เหมือนกัน (คลิกขวาที่ module ที่กลัวพัง → Add error handler) — ใส่ HTTP module ส่ง `status:"failed"` ในนั้นด้วย เพื่อครอบคลุม error กลาง scenario แบบเดียวกับ n8n Error Trigger

---

## 5. รันจริง แล้วตรวจสอบว่าเชื่อมสำเร็จ

1. รัน n8n/Make workflow จริง 1 ครั้ง
2. เช็คใน n8n: node HTTP Request ควรได้ response `200`/`201` (ไม่ใช่สีแดง/error)
3. เปิด Groundtruth → workflow นั้น → แท็บ **History**
4. ถ้าเห็น execution ใหม่โผล่ขึ้นมา = เชื่อมสำเร็จ

ถ้าไม่เห็นอะไรเลย ไล่เช็ค:
- n8n node ตัวนั้น error อะไร (ดูใน execution log ของ n8n เอง)
- server log (terminal ที่รัน `npm run server`) มีบรรทัด `[API] POST /api/webhook/...` ไหม — ถ้าไม่มีเลย แปลว่า request ยังไปไม่ถึง server (เช็คว่า URL ถูก, ngrok ยังเปิดอยู่ไหม)

---

## 6. ทดสอบเคส silent failure (สำคัญที่สุด)

จุดขายหลักของ Groundtruth คือจับ "รันสำเร็จแต่ output ผิด/หาย" — ลองยิงเคสนี้ดูตรงๆ ด้วย curl:

```bash
curl -X POST "<Webhook URL>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <WEBHOOK_SECRET>" \
  -d '{"status":"success","outputCount":0,"note":"completed but nothing produced"}'
```

ผลที่ควรเห็น: `monitoring.status` เปลี่ยนเป็น `"warning"` และมี incident ใหม่ประเภท `missing_output` ขึ้นในหน้าเว็บ

ถ้าเห็นแบบนี้ = engine ทำงานถูกต้อง พร้อมเอาไปใช้กับ automation จริงระยะยาวได้

---

## 7. เกณฑ์ก่อนให้คนอื่นลองใช้

- [ ] เชื่อม workflow จริงอย่างน้อย 1 ตัวสำเร็จ เห็น execution ใน History
- [ ] ทดสอบเคส silent failure แล้วได้ incident ตามคาด
- [ ] **ตั้ง Error Trigger (n8n) / Error handler (Make) แล้ว** — ไม่ใช่แค่ node ท้าย workflow ปกติ (ข้อ 4a) — ทดสอบโดยทำ node กลาง workflow พังจริง แล้วดูว่า Groundtruth ได้รับ `status:"failed"` ไหม
- [ ] ปล่อยให้รันจริงต่อเนื่องอย่างน้อย 3-7 วัน ดูว่า alert ที่เกิดขึ้นตรงกับสิ่งที่เกิดจริงไหม (ไม่ใช่ false alarm รัว ๆ)
- [ ] Server ต้อง deploy อยู่ที่ที่เข้าถึงได้จริง ไม่ใช่ localhost/ngrok ชั่วคราว
