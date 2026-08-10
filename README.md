# Static Dating Demo — English UX, gender-based recommendations

Changes in this commit:
- Site language changed to English.
- Visitor chooses their gender on the homepage by clicking "I'm Male" or "I'm Female"; the app then recommends profiles of the opposite gender.
- Removed the previous "switch user / current user" concept — visitors browse as guests; favorites are stored per browser (localStorage).
- Clicking a profile card opens WhatsApp to contact support for that profile. The Contact button also opens WhatsApp.
- Added a simulated "Online now" counter that updates every 2 seconds to show a fluctuating number.
- Favorites (heart) are stored in localStorage for the visitor and displayed in the Visitor panel.

How to test locally:
1. Clone or pull the repo and ensure you are on the main branch.
2. Serve the folder with a static server (recommended):
   python -m http.server 8000
   Open http://localhost:8000
3. Click "I'm Male" or "I'm Female" to filter recommendations by opposite gender. Click any profile card to open WhatsApp with a message including your visitor type and the profile name.

Notes:
- Support WhatsApp number is set to: +1 832-541-1560 (value in app.js is without the +: '18325411560').
- If you want to use local images instead of randomuser.me portraits, put images into an images/ folder and change the seedUsers logic in app.js accordingly.
