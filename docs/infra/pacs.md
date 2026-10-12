# PACS & DICOM Imaging Infrastructure Guide (Orthanc + OHIF)

**Components:** Orthanc DICOM Server (PACS) + OHIF Web Viewer  
**Backend Routes:** `backend/src/routes/radiology.js` (`/dicom/*`), `backend/src/lib/dicom.js`  
**Frontend Viewers:** `PacsDashboard.tsx`, Embedded DICOM Modals  

---

## 1. Overview

Findmedi integrates with hospital Picture Archiving and Communication Systems (PACS) using standard DICOM protocols:
1. **DIMSE Networking (TCP Port 4242)**: For DICOM Modality Worklist (MWL), C-STORE (image archiving), and C-FIND/C-MOVE (query/retrieve).
2. **DICOMweb / HTTP REST (Port 8042)**: For web-based study retrieval, metadata parsing, and preview rendering.
3. **Web Viewer Resolution**: Supports modern OHIF (Open Health Imaging Foundation) Cornerstone3D viewer for high-fidelity CT/MRI series scrolling and multi-planar reconstruction (MPR), with seamless zero-config fallback to Orthanc's built-in web viewer.

---

## 2. Docker Deployment

### 2.1 Orthanc PACS Container
Deploy Orthanc using the official Docker image:

```yaml
version: '3.8'

services:
  orthanc:
    image: orthancteam/orthanc:latest
    restart: unless-stopped
    ports:
      - "4242:4242"   # DICOM DIMSE C-STORE / C-MOVE
      - "8042:8042"   # HTTP REST API & Web Viewer
    environment:
      ORTHANC__NAME: "FindMedi_PACS"
      ORTHANC__DICOM_AET: "PACS_AE"
      ORTHANC__DICOM_PORT: 4242
      ORTHANC__HTTP_PORT: 8042
      ORTHANC__REMOTE_ACCESS_ALLOWED: "true"
      ORTHANC__AUTHENTICATION_ENABLED: "true"
      ORTHANC__REGISTERED_USERS: '{"pacsadmin":"ChangeInProductionSecret!"}'
      ORTHANC__DICOM_MODALITIES: '{"RIS_AE": ["RIS_AE", "findmedi-backend", 4242]}'
    volumes:
      - orthanc-storage:/var/lib/orthanc/db

volumes:
  orthanc-storage:
    driver: local
```

### 2.2 OHIF Viewer Container (Optional for Tier-1 / Advanced Diagnostics)
For high-volume radiology departments requiring MPR, 3D volume rendering, and radiologist measurement tools:

```yaml
  ohif-viewer:
    image: ohif/viewer:latest
    restart: unless-stopped
    ports:
      - "3000:80"
    environment:
      APP_CONFIG: "/app/app-config.js"
    volumes:
      - ./infra/ohif-config.js:/app/app-config.js:ro
```

---

## 3. Environment Configuration

Configure the following variables in `backend/.env`:

```env
# ─── PACS / DICOM DIMSE ───────────────────────────────────────────────────────
ORTHANC_HOST=localhost
ORTHANC_PORT=4242
ORTHANC_AE=RIS_AE
ORTHANC_CALLED_AE=PACS_AE

# ─── PACS HTTP & VIEWER RESOLUTION ───────────────────────────────────────────
ORTHANC_HTTP_URL=http://localhost:8042
ORTHANC_HTTP_PORT=8042

# Leave OHIF_URL blank to automatically use Orthanc's built-in viewer:
# OHIF_URL=https://pacs.findmedi.in/ohif/viewer
OHIF_URL=
```

### 3.1 Viewer URL Resolution Logic
When a radiologist or clinician clicks **"View DICOM"** in Findmedi:
1. If `OHIF_URL` is set: Returns `{ viewer: 'ohif', url: '${OHIF_URL}?StudyInstanceUIDs=${studyUid}' }`.
2. If `OHIF_URL` is blank or unset: Returns `{ viewer: 'orthanc', url: '${orthancBase}/viewer?StudyInstanceUID=${studyUid}', note: 'OHIF_URL not configured — using Orthanc built-in viewer' }`.

This ensures small community clinics and secondary care hospitals can operate immediately with a single lightweight Orthanc container without deploying dedicated OHIF clusters.

---

## 4. Network Security & VLAN Segregation

- **DICOM Port 4242**: Must **NEVER** be exposed to the public internet. DICOM protocol lacks mandatory application-layer authentication; port 4242 must be restricted to the hospital medical equipment VLAN and Findmedi RIS backend via host firewall rules.
- **HTTP Port 8042 / OHIF**: Must be fronted by a reverse proxy (e.g. Nginx or Cloudflare Tunnel) terminating TLS 1.3 and enforcing session authentication.
