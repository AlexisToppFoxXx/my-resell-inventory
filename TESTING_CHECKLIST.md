# 🚀 ResellFlow - Road Testing Checklist

**Date:** ________________  
**Tester:** ________________  
**Device:** ☐ Phone  ☐ Tablet  ☐ Laptop  
**Browser:** ☐ Chrome  ☐ Safari  ☐ Firefox  

---

## ✅ CORE FUNCTIONALITY

### 🔐 Authentication
- [ ] Login page loads correctly
- [ ] Can log in successfully
- [ ] "Logged in" status shows in header
- [ ] Logout button works

### 📊 Inventory Dashboard (Main View)
- [ ] Statistics dashboard displays at top
- [ ] Total Items count is accurate
- [ ] Listed/Sold/Needs Photos counts are correct
- [ ] Category breakdown shows all categories
- [ ] Creator breakdown (Boss Doss/DJ Nipsey) displays
- [ ] Financial overview (Inventory Cost, Listing Value, Potential Profit) calculates correctly

### 🔍 Search & Sort
- [ ] Search bar appears below statistics
- [ ] Search by product name works
- [ ] Search by brand works
- [ ] Search by category works
- [ ] Search by creator (Boss Doss/DJ Nipsey) works
- [ ] Search by notes works
- [ ] Clear search (X button) works
- [ ] Sort by: Newest First works
- [ ] Sort by: Oldest First works
- [ ] Sort by: Name (A-Z) works
- [ ] Sort by: Name (Z-A) works
- [ ] Sort by: Price (High-Low) works
- [ ] Sort by: Price (Low-High) works
- [ ] Sort by: Category works
- [ ] Sort by: Platform works

### 📦 Inventory List
- [ ] Products display in cards
- [ ] Product names show in bold as headers
- [ ] Checkboxes for selecting items work
- [ ] "Select All" button works
- [ ] "Deselect All" button works
- [ ] Selected items highlight with purple border
- [ ] Click product card to expand details
- [ ] Expanded view shows all product info
- [ ] "Edit" button on each card works
- [ ] Edit button opens ProductForm with correct data

### 🗑️ Bulk Delete
- [ ] Select multiple items with checkboxes
- [ ] "Delete X item(s)" button appears when items selected
- [ ] Delete button shows correct count
- [ ] Confirmation dialog appears before delete
- [ ] Items delete successfully
- [ ] Inventory updates after delete
- [ ] Statistics update after delete

---

## ➕ QUICK ADD

### Form Fields
- [ ] Product Name field (required) works
- [ ] "Created By" dropdown appears below Product Name
- [ ] Boss Doss option in dropdown
- [ ] DJ Nipsey option in dropdown
- [ ] Category dropdown has all 6 categories:
  - [ ] Clothing
  - [ ] Shoes
  - [ ] Bags and Accessories
  - [ ] Tools/Home & Garden
  - [ ] Electronics
  - [ ] Car Parts
- [ ] Brand field works
- [ ] Type field works
- [ ] Size field works
- [ ] Color field works
- [ ] Condition dropdown works (7 options)

### Pricing Section
- [ ] Purchase Price field works
- [ ] MSRP field works
- [ ] Comp eBay Price field works
- [ ] Listing Price field works

### Timeline & Listing
- [ ] Purchase Date picker works
- [ ] List Date picker works
- [ ] Platform field works

### Sold Information
- [ ] Sold Date picker works
- [ ] Sell Price field works
- [ ] Selling Fees field works
- [ ] Calculated Profit displays correctly
- [ ] Profit shows green for positive
- [ ] Profit shows red for negative

### Photos & Notes
- [ ] "Photos Taken" checkbox works
- [ ] Photo upload shows "temporarily disabled" message
- [ ] Notes textarea works

### QR Label Generation
- [ ] SKU displays (last 5 chars of UUID)
- [ ] "Print Label" button appears
- [ ] Click "Print Label" generates PDF
- [ ] PDF downloads correctly
- [ ] QR code appears on label
- [ ] "4TL" logo appears at top
- [ ] SKU appears at bottom in large text
- [ ] Label is 2"x3" size

### Multi-Item Actions
- [ ] "+ Add Another Item" button works
- [ ] Multiple items can be added
- [ ] "Remove" button works on items (when >1)
- [ ] "Save All" button counts items correctly
- [ ] "Save All" saves only items with product names
- [ ] Success message shows count of saved items
- [ ] Returns to inventory after save
- [ ] Inventory updates with new items
- [ ] "Cancel" button returns to inventory

---

## 📱 QR CODE SCANNER

### Scanner Interface
- [ ] Camera permission request appears
- [ ] Camera feed loads correctly
- [ ] Scanner detects QR codes
- [ ] Scans old QR codes (direct UUID format)
- [ ] Scans new QR codes (URL format with /scan/)
- [ ] Extracts UUID from URL correctly
- [ ] After scan, opens ProductForm
- [ ] ProductForm loads with QR code ID

### Product Form (After Scan)
- [ ] All form fields appear
- [ ] Product Name field (first field)
- [ ] "Created By" dropdown appears
- [ ] All fields from Quick Add are present
- [ ] Can fill in new product info
- [ ] Can edit existing product info
- [ ] "Save Product" button works
- [ ] Saves to correct QR code ID
- [ ] Returns to inventory after save

---

## 🖨️ BULK QR GENERATOR

- [ ] Interface loads correctly
- [ ] Can enter quantity (1-100)
- [ ] "Generate Labels" button works
- [ ] PDF generates successfully
- [ ] Multiple labels appear in PDF
- [ ] Each label has:
  - [ ] 4TL logo at top
  - [ ] QR code in center
  - [ ] Unique UUID at bottom
- [ ] Labels are 2"x3" each
- [ ] Labels print correctly
- [ ] Can scan generated QR codes

---

## 🎨 UI/UX & STYLING

### Header
- [ ] Purple-to-indigo gradient background
- [ ] "ResellFlow" logo/title visible
- [ ] Navigation buttons work:
  - [ ] Inventory
  - [ ] Scan QR
  - [ ] Quick Add
  - [ ] 🖨️ Bulk QR
- [ ] Active page highlights (darker purple)
- [ ] Logout button works

### Quick Links (Platform Links)
- [ ] "Quick Links:" label visible (desktop)
- [ ] eBay button (orange) works
- [ ] Opens: https://www.ebay.com/sh/lst/active
- [ ] Poshmark button (amber) works
- [ ] Opens: https://poshmark.com/closet
- [ ] FB Marketplace button (yellow) works
- [ ] Opens: https://www.facebook.com/marketplace/you/selling
- [ ] All links open in new tab
- [ ] Links are mobile-responsive

### Overall Design
- [ ] Purple theme consistent throughout
- [ ] Purple focus rings on inputs
- [ ] Good contrast between sections
- [ ] Readable on mobile
- [ ] Readable on tablet
- [ ] Readable on desktop
- [ ] Buttons have hover effects
- [ ] Loading states work (spinners, disabled buttons)

---

## 📱 MOBILE TESTING (if on phone)

- [ ] Header stacks properly
- [ ] Navigation buttons fit
- [ ] Platform links wrap properly
- [ ] Search bar works on mobile keyboard
- [ ] Inventory cards display well
- [ ] Form fields are tappable
- [ ] Date pickers work with mobile interface
- [ ] Checkboxes are large enough to tap
- [ ] QR scanner camera works
- [ ] Can scan codes with phone camera
- [ ] PDF downloads work on mobile

---

## 🐛 BUG TRACKING

### Issues Found:

1. **Issue:** ____________________________________  
   **Severity:** ☐ Critical  ☐ High  ☐ Medium  ☐ Low  
   **Details:** ____________________________________  
   _______________________________________________

2. **Issue:** ____________________________________  
   **Severity:** ☐ Critical  ☐ High  ☐ Medium  ☐ Low  
   **Details:** ____________________________________  
   _______________________________________________

3. **Issue:** ____________________________________  
   **Severity:** ☐ Critical  ☐ High  ☐ Medium  ☐ Low  
   **Details:** ____________________________________  
   _______________________________________________

---

## 💡 FEATURE REQUESTS / IMPROVEMENTS

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## ✨ OVERALL ASSESSMENT

**App Performance:** ☐ Excellent  ☐ Good  ☐ Fair  ☐ Poor

**Ease of Use:** ☐ Excellent  ☐ Good  ☐ Fair  ☐ Poor

**Visual Design:** ☐ Excellent  ☐ Good  ☐ Fair  ☐ Poor

**Ready for Production:** ☐ Yes  ☐ Needs Minor Fixes  ☐ Needs Major Work

**Additional Comments:**
_______________________________________________
_______________________________________________
_______________________________________________

---

**Testing Completed:** ☐ Yes  
**Date/Time:** ________________  
**Next Steps:** ____________________________________
