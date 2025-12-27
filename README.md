# 🧠 Loci - AI-Powered Object Recall Assistant
<img width="1870" height="948" alt="loci login" src="https://github.com/user-attachments/assets/bec<img width="1870" height="948" alt="loci pg1" src="https://github.com/user-attachments/assets/7f567c5e-c38c-45b4-bc94-63967684f0e6" />
7374b-cb4a-4dc7-9da0-90bfbc52a470" /><img width="1870" height="948" alt="loci search" src="https://github.com/user-attachments/assets/aa35b760-3386-4a4e-958a-c0fa00850166" />


> **"Where did I put my keys?"** — Never ask this question again.
> 
## 📖 Overview

**Loci** is a smart "memory palace" application designed to help users track and recall the physical location of their belongings. Unlike simple note-taking apps, Loci uses **Computer Vision (YOLOv8)** to automatically recognize objects in your photos and combines them with manual tags for a powerful hybrid search system.

Whether you threw your passport in the "Top Drawer" or your AirPods on the "Desk," simply ask Loci via text or **Voice Search**, and it retrieves the exact location instantly.

##  Key Features

-  **Visual Inventory:** Upload images of your items to create a digital index of your physical space.
-  **Hybrid Tagging System:**
  - **AI Detection:** Uses `YOLOv8` to automatically tag common objects (e.g., "mouse", "bottle", "laptop").
  - **Manual Context:** Allows users to add specific tags (e.g., "AirPods Pro", "Dad's Watch").
-  **Location Precision:** explicitly stores the "Where" (e.g., "Blue Backpack", "Garage Shelf 2").
-  **Cloud Sync:** Powered by **Supabase**, ensuring your data is accessible across all your devices.
-  **User Authentication:** Secure email login for multi-user support.

##  Tech Stack

### Frontend
- **React.js (Vite):** Fast, modern UI.
- **Tailwind CSS:** Responsive styling.
- **Lucide React:** iconography.

### Backend & AI
- **Python (FastAPI):** High-performance backend API.
- **Ultralytics YOLOv8:** State-of-the-art object detection model.
- **Supabase:** PostgreSQL Database & Object Storage.

---

