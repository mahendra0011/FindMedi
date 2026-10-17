# 💳 Razorpay Payment Gateway Integration - Client Guide

Namaste! 🙏  
Apni website/app me **Razorpay Payment Gateway** shuru karne ke liye aapko yeh aasan steps follow karne honge. Isme kisi software ya app ko download karne ki zaroorat nahi hai, sab kuch online browser se hoga.

---

## 📌 Step 1: Razorpay par Account Banana
1. Sabse pehle browser me **[https://razorpay.com](https://razorpay.com)** open karein.
2. **Sign Up** par click karein aur apna Mobile Number/Email enter karke register karein.
3. **Business Type chunein:**
   - Agar aapki registered company nahi hai, toh **Individual / Freelancer** select karein.
   - Agar registered business/shop hai, toh **Proprietorship** ya **Private Limited** chunein.

---

## 📌 Step 2: Bank Account & Documents (KYC)
Jis bank account me aapko customer ke paise receive karne hain, uski details lagengi:

### Zaroori Documents:
- ✅ **Bank Account Details** (Account Number & IFSC Code - jisme payment aayegi)
- ✅ **PAN Card** (Aapka ya Business ka)
- ✅ **Aadhaar Card** (Identity verification ke liye)
- ✅ **Cancelled Cheque ya Bank Statement** (Account verify karne ke liye)
- ✅ **Business Proof** (Agar GST ya MSME / Udyam Certificate ho toh, optional for individual)

---

## 📌 Step 3: Website par Zaroori Pages (Approval ke liye)
Razorpay aapka account live karne se pehle website check karta hai. Website par niche diye gaye pages hona compulsory hain:
1. **Contact Us** (Email, Phone number aur Address)
2. **About Us** (Aapke business/service ke baare me)
3. **Terms & Conditions**
4. **Privacy Policy**
5. **Refund & Cancellation Policy** (Paise wapas milenge ya nahi, aur kitne din me)
6. **Pricing / Services Details** (Customer kis cheez ke paise de raha hai)

---

## 📌 Step 4: Developer ko kya dena hai? (API Keys)
Website me Razorpay connect karne ke liye developer ko **API Keys** ki zaroorat hoti hai.

### Keys kaise nikalni hai:
1. Razorpay Dashboard me login karein.
2. Left menu me **Settings** par click karein.
3. **API Keys** tab me jayein.
4. **Generate Key** par click karein.
5. Aapko do cheezein dikhengi:
   - **Key ID**
   - **Key Secret**
6. Yeh dono keys copy karke developer ko share kar dein.

> 💡 **Note:** Shuruat me dashboard me **"Test Mode"** on karke testing keys share karni hain. Jab testing complete ho jaye aur KYC approve ho jaye, tab **"Live Mode"** ki keys share karni hoti hain.

---

## 📌 Step 5: Customer se Bank Account tak Paise kaise aayenge?

1. **Payment:** Customer website par aayega aur UPI (GPay, PhonePe, Paytm), Card ya NetBanking se payment karega.
2. **Razorpay Balance:** Payment turant successful hokar aapke Razorpay Dashboard me show ho jayegi.
3. **Auto-Settlement:** 
   - Razorpay apna standard platform charge (lagbhag 2% + GST) deduct karega.
   - Baaki poora paisa **1 se 2 working days (T+2 days)** ke andar automatically aapke linked bank account me credit ho jayega.
   - Aapko koi manual transfer nahi karna padta, sab automatic hota hai.

---

### 📞 Agar koi problem aaye toh:
Aap account banate waqt kahin bhi rukein toh hume bata sakte hain, hum setup me help kar denge!
