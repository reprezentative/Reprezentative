# AI Assistant Testing Guide

## Access the AI Assistant

1. Start the development server (if not already running):
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3345/admin/ai-assistant`

3. Make sure you're logged in as an admin user

## Test Cases

### 1. Financial Questions (Revenue/Expenses)

**Test: Revenue Query**
- **Question:** "What's my revenue this month?"
- **Expected:** Should show revenue for current calendar month (December 1-31)
- **Should NOT mention:** Inventory, products, or other topics

**Test: Expense Query**
- **Question:** "What are my expenses by category?"
- **Expected:** Should show expenses grouped by category
- **Should NOT mention:** Inventory, revenue, or other topics

**Test: Comparison**
- **Question:** "Compare this month to last month"
- **Expected:** Should show financial comparison between current and previous calendar month
- **Should NOT mention:** Inventory or unrelated topics

### 2. Product Queries

**Test: Specific Product**
- **Question:** "Show me the Heritage Hoodie"
- **Expected:** Should show detailed information about Heritage Heavyweight Hoodie
- **Should include:** Price, variants, stock levels, COGS, margin

**Test: Partial Product Name**
- **Question:** "Find hoodie"
- **Expected:** Should show all products with "hoodie" in the name
- **Should rank:** Exact matches first, then partial matches

**Test: Product Not Found**
- **Question:** "Show me the XYZ Product"
- **Expected:** Should say product not found AND suggest similar products
- **Should include:** List of available products as suggestions

### 3. Order Queries

**Test: Specific Order Number**
- **Question:** "Show me order RZ-9791"
- **Expected:** Should find the order even if it's outside the default time range
- **Should include:** Order details, total, status, date

**Test: Order Not Found**
- **Question:** "Find order RZ-9999"
- **Expected:** Should say order not found AND show recent orders as suggestions

**Test: Recent Orders**
- **Question:** "What are my recent orders?"
- **Expected:** Should show orders from the last 30 days
- **Should include:** Order numbers, totals, status, dates

### 4. Inventory Queries

**Test: Low Stock**
- **Question:** "Which products are low on stock?"
- **Expected:** Should show products with ≤10 units available
- **Should include:** Product names, sizes, colors, available quantities

**Test: Stock Levels**
- **Question:** "What's my inventory status?"
- **Expected:** Should show total products, variants, low stock count, inventory value

### 5. Date Range Testing

**Test: Calendar Month**
- **Question:** "What's my revenue this month?"
- **Expected:** Should use December 1-31 (current calendar month), not last 30 days
- **Verify:** Check if it correctly identifies calendar month vs rolling period

**Test: Last 30 Days**
- **Question:** "What's my revenue for the last 30 days?"
- **Expected:** Should use rolling 30-day period from today

### 6. Error Handling & Edge Cases

**Test: No Data Available**
- **Question:** "What's my revenue this month?" (when no orders in December)
- **Expected:** Should say $0.00 and explain that no data exists for this period
- **Should NOT:** Make up numbers or talk about unrelated topics

**Test: Off-Topic Prevention**
- **Question:** "What's my revenue this month?"
- **Expected:** Should ONLY talk about revenue
- **Should NOT:** Mention inventory, products, or other topics

**Test: Response Validation**
- **Question:** Any financial question
- **Expected:** If AI mentions inventory when asked about revenue, system should auto-retry with stricter prompt

### 7. Entity Extraction Testing

**Test: Product Name Variations**
- **Questions:**
  - "Show me Heritage Hoodie"
  - "Tell me about the Heritage Hoodie"
  - "Find Heritage Hoodie"
  - "What is Heritage Hoodie?"
- **Expected:** All should extract "Heritage Hoodie" correctly

**Test: Order Number Variations**
- **Questions:**
  - "Show me order RZ-9791"
  - "Find RZ-9791"
  - "What is order RZ-9791?"
- **Expected:** All should extract "RZ-9791" correctly

### 8. UI/UX Testing

**Test: Auto-Scroll**
- **Action:** Send a message
- **Expected:** Chat should automatically scroll to show the latest response
- **Verify:** You should NOT need to manually scroll down

**Test: Scrollbar Styling**
- **Action:** Scroll the chat or sidebar
- **Expected:** Scrollbars should be dark gray, matching the site theme
- **Verify:** No default browser scrollbars visible

**Test: Response Formatting**
- **Action:** Ask any question
- **Expected:** Response should NOT have markdown formatting (no asterisks, bullets, etc.)
- **Verify:** Plain text only, natural sentences

## What to Look For

### ✅ Good Signs
- Answers the exact question asked
- Uses only relevant data (no off-topic mentions)
- Provides helpful suggestions when data not found
- Auto-scrolls to latest message
- Plain text responses (no markdown)
- Accurate numbers from database

### ❌ Bad Signs
- Mentions inventory when asked about revenue
- Mentions revenue when asked about expenses
- Makes up numbers or data
- Doesn't answer the question asked
- Shows markdown formatting (asterisks, bullets)
- Doesn't auto-scroll to latest message
- Gives generic "I cannot determine" responses

## Debugging

If something doesn't work:

1. **Check Browser Console** (F12)
   - Look for JavaScript errors
   - Check network requests to `/api/admin/ai/chat`

2. **Check Server Logs**
   - Look for console.log output showing:
     - Query analysis (category, timeRange, entities)
     - Data fetching results
     - Any errors

3. **Test Data Availability**
   - Verify you have orders/expenses/products in the database
   - Check date ranges match your test questions

4. **Clear Chat History**
   - Click "New conversation" button
   - This starts fresh without previous context

## Sample Test Script

Run through these questions in order:

1. "What's my revenue this month?"
2. "What are my expenses by category?"
3. "Show me the Heritage Hoodie"
4. "Which products are low on stock?"
5. "Show me order RZ-9791"
6. "Compare this month to last month"

Each should give accurate, on-topic answers without mentioning unrelated data.

