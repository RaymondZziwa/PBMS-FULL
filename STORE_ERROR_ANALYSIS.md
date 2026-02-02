# Store Information Error Analysis

## Error Message
`"Store information not found. Please select a store."`

## Root Causes Identified

### 1. **Massage Service POS Missing Store Selection** ⚠️ CRITICAL
- **Location**: `PBMS-NEW-FTD/src/pages/sales/massageServicePos/index.tsx`
- **Issue**: The page imports `StoreSelectionModal` but never uses it. No store selection logic exists.
- **Impact**: `selectedStore` state remains `null`, and `posStore` is never set in localStorage.
- **Result**: Checkout modal fails because it expects `posStore` in localStorage.

### 2. **Store Expiration (24-hour timeout)**
- **Location**: `PBMS-NEW-FTD/src/pages/sales/pos/index.tsx` (lines 42-47)
- **Issue**: Store expires after 24 hours and is removed from localStorage.
- **Impact**: If checkout modal is open when store expires, the error occurs.
- **Scenario**: User opens POS, selects store, leaves checkout open for 24+ hours, then tries to complete sale.

### 3. **Corrupted localStorage Data**
- **Location**: All checkout modals (lines 179-187)
- **Issue**: If `posStore` JSON is corrupted, `JSON.parse()` throws error and returns `null`.
- **Impact**: Checkout fails silently with error message.

### 4. **Missing `storeId` Property**
- **Location**: All checkout modals (line 182)
- **Issue**: If stored object doesn't have `storeId` property, returns `undefined`.
- **Impact**: Error is thrown even if `posStore` exists.

### 5. **Shared localStorage Key Across POS Types**
- **Issue**: All POS types (regular, massage, exhibition) use same `posStore` key.
- **Impact**: Switching between POS types can cause store mismatch or missing store.

### 6. **Exhibition POS Inconsistent Pattern**
- **Location**: `PBMS-NEW-FTD/src/pages/exhibition/exhibitionPos/checkoutModal.tsx` (line 152)
- **Issue**: Uses different pattern: `localStorage.getItem('posStore') ? JSON.parse(localStorage.getItem('posStore')!).storeId : ''`
- **Impact**: Could fail silently or cause type issues.

## Code Locations

### Checkout Modals with Store Check:
1. `PBMS-NEW-FTD/src/pages/sales/pos/checkoutModal.tsx` (lines 179-192)
2. `PBMS-NEW-FTD/src/pages/sales/massageServicePos/checkoutModal.tsx` (lines 179-192)
3. `PBMS-NEW-FTD/src/pages/exhibition/exhibitionPos/checkoutModal.tsx` (line 152)

### Store Selection Logic:
1. `PBMS-NEW-FTD/src/pages/sales/pos/index.tsx` - ✅ Has store selection
2. `PBMS-NEW-FTD/src/pages/sales/massageServicePos/index.tsx` - ❌ Missing store selection
3. `PBMS-NEW-FTD/src/pages/exhibition/exhibitionPos/index.tsx` - ✅ Has store selection

## Recommended Fixes

1. **Add store selection to Massage Service POS**
2. **Improve error handling** - Better error messages and validation
3. **Add store validation** - Check store exists before allowing checkout
4. **Use separate localStorage keys** - Different keys for different POS types
5. **Add store refresh logic** - Re-validate store when checkout opens
