# 🎯 Admin Guide: Running Hot Deals and Promotions

## 📋 Table of Contents
1. [Database Setup](#database-setup)
2. [Accessing Promotions Management](#accessing-promotions-management)
3. [Creating Promotions](#creating-promotions)
4. [Promotion Types Explained](#promotion-types-explained)
5. [Managing Active Promotions](#managing-active-promotions)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## 🗄️ Database Setup

### Step 1: Run the SQL Script
1. **Open Supabase Dashboard** → Go to your project's SQL Editor
2. **Execute the setup script**: Copy and paste the entire content from `src/PROMOTIONS_SETUP.sql`
3. **Run the script** to create all necessary tables and functions

### Step 2: Verify Tables Created
After running the script, you should see these new tables:
- ✅ `promotions` - Main promotions table
- ✅ `promotion_products` - Links promotions to specific products
- ✅ `promotion_categories` - Links promotions to specific categories
- ✅ `inventory` - Advanced inventory management

---

## 🚀 Accessing Promotions Management

### Navigation Path:
1. **Login as Admin** → Use your admin credentials
2. **Navigate to Dashboard** → Admin dashboard
3. **Click "Promotions"** → In the sidebar or main menu
4. **You'll see the Promotions Management interface**

### Interface Overview:
- 📊 **Statistics Dashboard** - Total, active, and expired promotions
- 🔍 **Search & Filter** - Find promotions quickly
- ➕ **Create Promotion** - Add new promotional campaigns
- 📝 **Edit/Delete** - Manage existing promotions

---

## ✨ Creating Promotions

### Step-by-Step Process:

#### 1. **Click "Create Promotion"**
- Opens the promotion creation form

#### 2. **Fill Basic Information**
```
📝 Promotion Name*: "Summer Sale 2025"
🏷️ Promo Code: "SUMMER25" (optional)
📄 Description: "25% off all cleaning supplies"
```

#### 3. **Select Promotion Type**
Choose from 4 types (explained in detail below):
- 🔢 **Percentage Discount** - e.g., 25% off
- 💰 **Fixed Amount Discount** - e.g., $50 off
- 🎁 **Buy X Get Y** - e.g., Buy 2 Get 1 Free
- 🚚 **Free Shipping** - Remove shipping costs

#### 4. **Set Value and Conditions**
```
💰 Value*: 25 (for 25% or $25)
📦 Min Order Amount: $50.00
🔒 Max Discount: $100.00 (optional)
```

#### 5. **Configure Timing**
```
📅 Start Date*: Choose start date/time
⏰ End Date: Choose end date/time (optional for unlimited)
```

#### 6. **Set Target Scope**
Choose what the promotion applies to:
- 🌍 **All Products** - Site-wide promotion
- 🎯 **Specific Products** - Select individual products
- 📂 **Specific Categories** - Select product categories

#### 7. **Save Promotion**
- Click "Create Promotion" to activate

---

## 🎨 Promotion Types Explained

### 1. 🔢 Percentage Discount
**Example:** 25% off all products
```
Type: Percentage
Value: 25
Result: 25% discount on cart total
```
**Best For:** General sales, category-wide discounts

### 2. 💰 Fixed Amount Discount
**Example:** $50 off orders over $200
```
Type: Fixed Amount
Value: 50
Min Order: 200
Result: $50 off qualifying orders
```
**Best For:** High-value orders, bulk purchases

### 3. 🎁 Buy X Get Y (BOGO)
**Example:** Buy 2 cleaning equipment, get 1 free
```
Type: Buy X Get Y
Value: 100 (represents full discount on Y)
Applies To: Specific Categories (Equipment)
```
**Best For:** Moving inventory, introducing new products

### 4. 🚚 Free Shipping
**Example:** Free shipping on orders over $100
```
Type: Free Shipping
Value: 0
Min Order: 100
Result: Removes shipping charges
```
**Best For:** Increasing average order value

---

## 📊 Managing Active Promotions

### Promotion Status Types:
- 🟢 **Active** - Currently running and available
- 🔵 **Scheduled** - Will start in the future
- 🔴 **Expired** - Past end date
- ⚪ **Inactive** - Manually disabled
- 🟠 **Limit Reached** - Usage limit exceeded

### Quick Actions:
- **Activate/Deactivate**: Toggle promotion on/off
- **Edit**: Modify promotion details
- **Delete**: Remove promotion permanently
- **View Usage**: See how many times it's been used

### Filtering Options:
- 🔍 **Search**: By name, code, or description
- 📊 **Status Filter**: Active, Inactive, Expired
- 📅 **Date Range**: Filter by creation or active dates

---

## 💡 Best Practices

### 🎯 Strategic Planning
1. **Plan Ahead**: Schedule promotions during peak seasons
2. **Set Clear Goals**: Increase sales, clear inventory, attract new customers
3. **Test First**: Run small promotions before major campaigns

### 📈 Optimization Tips
1. **Limited Time**: Create urgency with end dates
2. **Minimum Orders**: Increase average order value
3. **Category Focus**: Target slow-moving categories
4. **Promo Codes**: Track marketing campaign effectiveness

### 🛡️ Risk Management
1. **Set Maximum Discounts**: Prevent excessive losses
2. **Usage Limits**: Control promotion abuse
3. **Monitor Performance**: Track usage and profitability
4. **Quick Disable**: Be ready to deactivate if needed

---

## 📋 Common Promotion Scenarios

### 🔥 Flash Sale (24-48 hours)
```
Name: "Flash Sale - 30% Off Everything"
Type: Percentage
Value: 30
Start: Today 9:00 AM
End: Tomorrow 11:59 PM
Applies To: All Products
```

### 🏷️ Category Clearance
```
Name: "Equipment Clearance - 40% Off"
Type: Percentage
Value: 40
Applies To: Specific Categories (Equipment)
Min Order: $0
```

### 🎁 BOGO Deal
```
Name: "Buy 2 Get 1 Free - Detergents"
Type: Buy X Get Y
Value: 100
Applies To: Specific Categories (Detergents)
```

### 🚛 Free Shipping Threshold
```
Name: "Free Shipping Weekend"
Type: Free Shipping
Value: 0
Min Order: 75
Start: Friday
End: Sunday
```

### 💰 Big Order Discount
```
Name: "Bulk Order Discount"
Type: Fixed Amount
Value: 100
Min Order: 500
Max Discount: 100
```

---

## 🔧 Troubleshooting

### ❌ Common Issues:

#### 1. **Promotion Not Showing**
- ✅ Check if promotion is active
- ✅ Verify start/end dates
- ✅ Ensure minimum order amount is met
- ✅ Check if usage limit reached

#### 2. **Wrong Discount Applied**
- ✅ Verify promotion type and value
- ✅ Check maximum discount limits
- ✅ Ensure correct products/categories selected

#### 3. **Can't Create Promotion**
- ✅ Ensure all required fields filled
- ✅ Check database connection
- ✅ Verify admin permissions

#### 4. **Database Errors**
- ✅ Run the SQL setup script again
- ✅ Check Supabase RLS policies
- ✅ Verify table permissions

### 🔍 Debug Steps:
1. **Check Browser Console**: Look for JavaScript errors
2. **Verify Database**: Ensure tables exist and are accessible
3. **Test Permissions**: Try with different admin accounts
4. **Check Network**: Ensure stable internet connection

---

## 📊 Performance Monitoring

### Key Metrics to Track:
- 📈 **Usage Count**: How many times promotion was used
- 💰 **Revenue Impact**: Total revenue from promoted products
- 👥 **Customer Acquisition**: New customers from promotions
- 📦 **Inventory Movement**: Products sold during promotion

### Regular Reviews:
- 📅 **Weekly**: Check active promotions performance
- 📅 **Monthly**: Review promotion strategy effectiveness
- 📅 **Quarterly**: Analyze seasonal promotion trends

---

## 🎉 Success Tips

### 📢 Marketing Integration:
1. **Email Campaigns**: Send promo codes to subscribers
2. **Social Media**: Share promotion graphics and codes
3. **Website Banners**: Feature hot deals prominently
4. **Push Notifications**: Alert mobile users of flash sales

### 🎨 Visual Appeal:
1. **Use Emojis**: Make promotions eye-catching
2. **Color Coding**: Red for urgency, green for savings
3. **Clear CTAs**: "Shop Now", "Get Deal", "Save Today"
4. **Countdown Timers**: Show urgency for limited-time offers

### 📱 Customer Experience:
1. **Easy Redemption**: Simple promo code entry
2. **Clear Terms**: Display conditions clearly
3. **Mobile Friendly**: Ensure mobile compatibility
4. **Fast Loading**: Optimize for quick access

---

## 🚨 Emergency Actions

### If Promotion Goes Wrong:
1. **Immediate Deactivation**: Click the deactivate button
2. **Damage Assessment**: Check how many orders affected
3. **Customer Communication**: Notify affected customers
4. **Refund Process**: Handle any overapplied discounts

### Prevention Measures:
1. **Test in Staging**: Always test before going live
2. **Gradual Rollout**: Start with limited scope
3. **Monitor Closely**: Watch initial few hours carefully
4. **Have Backup Plan**: Know how to quickly revert

---

**🎯 Ready to create amazing promotions and boost your sales!** 

Start with simple percentage discounts and gradually experiment with more complex promotion types as you get comfortable with the system.
