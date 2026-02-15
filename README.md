<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=180&section=header&text=FreeFire%20BanCheck&fontSize=45&fontAlignY=35&animation=twinkling&fontColor=fff"/>
</div>

<div align="center">

  <a href="#"><img src="https://img.shields.io/badge/Flask-2.0+-black?style=for-the-badge&logo=flask"></a>
  <a href="#"><img src="https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python"></a>
  <a href="#"><img src="https://img.shields.io/github/license/tsunstudio/freefire-bancheck?style=for-the-badge&color=purple"></a>
  <a href="#"><img src="https://komarev.com/ghpvc/?username=tsunstudio-bancheck&label=Views&style=for-the-badge&color=brightgreen"></a>
</div>

---
<div align="center">

## ⚡ Overview
</div>

**FreeFire BanCheck Frontend** its a frontend of a lightweight Flask-based REST API that Show Free Fire player information with ban status.

> 🧠 Designed for speed, precision, and integration with custom dashboards or moderation tools.

---

## 📋 Overview

The application uses the `BAN_KEY` environment variable to authenticate with the ban check API. This key Buy From Admin Or Replace Banecheckbackend Api With Your Own Api:

- **Local Development**: Uses `.env` file
- **Vercel**: Uses Environment Variables in project settings
- **Render**: Uses Environment Variables in service settings

---
<div align="center">

## 🚀 Features
</div>

✅ Fetches Player Name, UID, Level, and Region  
✅ Checks Account Ban Status.    
✅ Calculates how long since last login  
✅ 100% Flask, no dependencies beyond `requests`

---
<div align="center">

## 🧩 Tech Stack

| Component | Description |
|------------|-------------|
| 🐍 **Python** | Core language |
| ⚗️ **Flask** | Web framework |
| 🌐 **Requests** | API communication |
| 📅 **Datetime** | Time calculation |
| 💻 **Render / Railway / Vercel** | Deployment ready |
</div>

---
<div align="center">

## 🧠 API Endpoint
</div>

### **GET /bancheck**
Retrieve player details and ban info by UID.

```bash
GET https://yourlink.com/bancheck?uid=2513698016
````

#### Response:

```json
{
  "nickname": "MoTo^.^Kaka",
  "uid": "2513698016",
  "AccountLevel": 76,
  "region": "PK",
  "AccountLastLogin": "2025-08-21",
  "status": "OK",
  "is_banned": false,
  "Last_Login": "0 Year 2 Months And 7 Days Ago",
  "credits": "saeedxdie"
}
```

---
<div align="center">

## 🧰 Installation
</div>

```bash
git clone https://github.com/TSun-FreeFire/TSun-FF-Bancheck.git
cd TSun-FF-Bancheck
```
```bash
pip install -r requirements.txt
python app.py
```

The Local server runs on:

```
http://127.0.0.1:5000/
```

---
<div align="center">

## 🧠 Project Structure
</div>

```
📦 TSun-FF-Bancheck
 ┣ 📜 app.py
 ┣ 📜 requirements.txt
 ┣ 📜 README.md
 ┗ 📁 /static (optional)
```
---

## 🧑‍💻 Author

**TSun**

Made with 🫀 by [༯𝙎ค૯𝙀𝘿✘🫀](https://github.com/saeedx302)

> Follow for more Python, API & projects

---

## 📜 License

This project is licensed under the **MIT License** — feel free to modify and share with credit.

---

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&height=120&section=footer"/>
</div>

---