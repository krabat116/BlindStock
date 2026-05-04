
# 🚀 BlindStock

BlindStock is a full-stack inventory and order management system built for a small-scale blinds manufacturing factory.

It was developed to replace manual Excel-based inventory tracking, which frequently caused stock mismatches and disrupted the production process.

---

## 📌 Problem

- Inventory was manually tracked using Excel spreadsheets  
- Frequent human errors led to stock inconsistencies  
- No clear visibility into component usage or order history  
- Difficult to trace which components were used for each order  

---

## ✅ Solution

BlindStock automates inventory management by integrating order processing, component tracking, and customer data into a single system.

- Upload Excel order files  
- Automatically extract component and customer data  
- Calculate required parts based on specifications  
- Deduct inventory in real time  
- Store customer order history  

---

## 🔧 Key Features

- 📦 **Inventory Management**
  - Category-based item organization  
  - Create / Update / Delete items  
  - Real-time stock updates  

- 📄 **Excel Order Processing**
  - Parse uploaded order sheets  
  - Extract component data from structured/unstructured formats  
  - Map order specifications to required components  

- ⚙️ **Automated Stock Deduction**
  - Calculate required components per order  
  - Deduct inventory based on actual usage  

- 👤 **Customer & Order Tracking**
  - Extract customer information from order files  
  - Store order history for each client  

---

## 💡 Technical Highlights

- Designed a data model separating:
  - Current inventory state  
  - Historical component usage  

- Built Excel parsing logic to transform raw order data into structured components  

- Implemented business rules to map blind specifications (e.g. size, type) to required parts  

- Structured the system to support future analytics (e.g. monthly component usage tracking)  

---

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS  
- **Backend:** Node.js, Express  
- **Database:** Prisma ORM (SQLite / PostgreSQL)  
- **Other:** Excel parsing (xlsx)

---

## 🎯 Future Improvements

- 📊 Monthly component usage analytics dashboard  
- 🔔 Low stock prediction and alert system  
- 📈 Customer-specific ordering insights  
- 📱 Tablet-based worker tracking system  

---



 <img width="1076" height="796" alt="Screenshot 2026-05-04 at 2 47 13 PM" src="https://github.com/user-attachments/assets/307e83ee-3c96-4f3f-8a98-52e5211eed0b" />
