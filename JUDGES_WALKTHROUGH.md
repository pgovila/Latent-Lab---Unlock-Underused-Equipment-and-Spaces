# JUDGES' 3-MINUTE EVALUATION WALKTHROUGH
## Team Analytical Eye · Lead: Pankhuri Govila
**Project:** LatentLab (by Team Analytical Eye) — Cross-Departmental University Lab Sharing Network

This walkthrough allows any judge to complete the entire 10-step lifecycle journey without setup friction.

---

### Prerequisites & Quick Start
1. The app is live and running locally at `http://localhost:3000`.
2. To start or restart the development server manually:
   ```bash
   cd analytical-eye-lab
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000` in your web browser.

---

### Step-by-Step 10-Milestone Checklist

#### 1. Header Overview & Persona Switcher
- Notice the top header with **Team: Analytical Eye (Pankhuri Govila)**.
- Notice the active user: **Pankhuri Govila (You)**, **Credits: 85 / 100**, and **Active Quota: 2 / 3**.
- You can switch personas at any time using the dropdown (e.g. switch to *Dr. Aris Thorne* to experience the owner's view).

#### 2. Milestone 2 & 3: Discovery, Match & AI Conflict Resolution
- Click **"1. Discovery & Match"** tab.
- Observe how items show **"Verified Eligible"** or **"Missing Badge"** depending on Pankhuri's safety certifications.
- Click **"Check Availability & Reserve"** on the **Epilog Fusion Pro 48 Laser Cutter**.
- In the reservation modal, click **"Run Conflict Resolution AI"**.
- View how the AI detects potential overlapping reservations and suggests optimal alternative windows or the explainable waitlist.
- Submit the reservation to trigger **Milestone 4 (Auto-Verification Layer)**.

#### 3. Milestone 5: Owner Review Portal
- Switch the Persona dropdown to **Dr. Aris Thorne (PI)** or **Elena Rostova (Lab Mgr)**.
- Click **"3. Owner Portal & Listing"** tab.
- View pending booking requests under **"Milestone 5: Owner Review Portal"**.
- Click **"Review & Decide"**, enter a review note (e.g., *"Approved: Laser bed sterilized"*), and click **"Approve Request"**.
- Notice the **Milestone 6 (State Transition Banner)** update instantly with a green confirmation notice!

#### 4. Milestone 1: Owner Listing
- On the same tab, click **"+ List New Resource"**.
- Fill in a new equipment listing (e.g., *"5-Axis CNC Milling Center"*, Location: *"Robotics Bay 4"*, Cost: *20 credits*, Required Badge: *"5-Axis CNC Certified"*).
- Click **"Publish to Network"** to witness Milestone 1 state creation.

#### 5. Milestone 7: Digital Check-In (Unlock Hardware)
- Switch persona back to **Pankhuri Govila (You)**.
- Click **"2. My Bookings & Check-In"** tab.
- On your approved booking, click **"Milestone 7: Perform Digital Check-In (Unlock)"**.
- Select 5 stars, write baseline notes (e.g. *"Optics clean, chiller 19.5C"*), check the PPE compliance box, and click **"Confirm & Unlock Equipment"**.
- The hardware status transitions to **"CHECKED_IN"** (Unlocked & Active).

#### 6. Milestone 8: Digital Return & Relock (Auto-Penalty Calculation)
- On the active checked-in booking, click **"Milestone 8: Digital Return & Relock"**.
- View the scheduled vs actual return window.
- Enter return notes and click **"Complete Return & Relock"**.
- The hardware status transitions to **"RETURNED"**, quota is released, and availability is restored.

#### 7. Milestone 9: Dispute & Incident Hub with AI Severity Triage
- Click **"4. Dispute & Incident Hub"** tab.
- Type an incident report (e.g., *"The laser focal lens cracked and smoke started billowing from the exhaust"*).
- Click **"Run Incident Summarizer AI"**.
- Watch the Vercel AI SDK classifier categorize it as **HIGH SEVERITY**, estimate 72 hours downtime, and formulate emergency triage actions.
- Click **"Submit Incident & Push to Admin Ledger"**.

#### 8. Milestone 10: Immutable Auditable Ledger Timeline
- Click **"5. Auditable Ledger Timeline"** tab.
- Review the complete chronological institutional ledger recording every event (`BOOKING_REQUESTED`, `ELIGIBILITY_PASSED`, `OWNER_APPROVED`, `DIGITAL_CHECK_IN_COMPLETED`, `DIGITAL_CHECK_OUT_COMPLETED`, `INCIDENT_REPORTED`).
- Inspect the timestamp, actor, and JSON metadata payloads verifying data integrity.
