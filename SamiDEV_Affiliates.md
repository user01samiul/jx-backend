# 📊 JackpotX Affiliate System - Complete Implementation Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Structure](#database-structure)
4. [How the System Works](#how-it-works)
5. [Admin Panel Implementation](#admin-implementation)
6. [Player Frontend Implementation](#frontend-implementation)
7. [API Endpoints](#api-endpoints)
8. [Integration Examples](#integration-examples)
9. [Workflows](#workflows)
10. [Testing & Debugging](#testing-debugging)

---

## 🎯 Overview {#overview}

The JackpotX Affiliate System is a complete **MLM (Multi-Level Marketing)** solution designed specifically for online casino operations. It enables:

- **Affiliate Marketing**: Partners who promote the platform and earn commissions
- **MLM Structure**: Up to 3 commission levels (direct + 2 indirect levels)
- **Advanced Tracking**: Monitor clicks, conversions, and performance
- **Team Management**: Managers who oversee affiliate teams
- **Multiple Commission Types**: Based on deposits, bets, losses, and NGR (Net Gaming Revenue)

### System Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| **Admin** | System Administrator | Full control: manage affiliates, set commissions, approve payouts |
| **Affiliate** | Marketing Partner | Personal dashboard, referral links, view commissions |
| **Affiliates Manager** | Team Manager | Manage team, reports, limited commission approval |
| **Influencer** | Special Influencer | Similar to Affiliate with custom options |

---

## 🏗️ System Architecture {#system-architecture}

### Backend Components

```
backend.jackpotx.net/
├── src/
│   ├── services/affiliate/
│   │   ├── affiliate.service.ts          # Basic services
│   │   └── enhanced-affiliate.service.ts # Advanced MLM services
│   ├── api/affiliate/
│   │   ├── affiliate.controller.ts       # Affiliate controller
│   │   ├── enhanced-affiliate.controller.ts # MLM controller
│   │   └── affiliate.schema.ts           # Validations
│   ├── api/admin/
│   │   └── enhanced-affiliate-admin.controller.ts # Admin management
│   └── routes/
│       ├── affiliate.routes.ts           # Affiliate routes
│       └── enhanced-affiliate.routes.ts  # MLM routes
└── migrations/
    ├── migration-add-affiliate-system.sql
    └── migration-enhance-affiliate-mlm.sql
```

### Flow Diagram

```
┌─────────────┐
│   Visitor   │
└──────┬──────┘
       │ Click affiliate link
       ▼
┌──────────────────┐
│ Track Referral   │ → Save to affiliate_tracking
└──────┬───────────┘
       │ User registers
       ▼
┌──────────────────┐
│ Create Account   │ → Create affiliate_relationships
└──────┬───────────┘
       │ User deposits/bets
       ▼
┌──────────────────┐
│ Calculate        │ → Calculate commissions for 3 levels
│ Commissions      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Update Balances  │ → Update affiliate balances
└──────────────────┘
```

---

## 🗄️ Database Structure {#database-structure}

### Main Tables

#### 1. **affiliate_profiles** - Affiliate Profiles
```sql
CREATE TABLE affiliate_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  referral_code VARCHAR(50) UNIQUE NOT NULL,     -- Unique code (e.g., ABC12345)
  display_name VARCHAR(100),                      -- Display name
  website_url VARCHAR(255),                       -- Affiliate website
  social_media_links JSONB,                       -- Social media links
  commission_rate NUMERIC(5,2) DEFAULT 5.00,      -- Commission rate (%)
  minimum_payout NUMERIC(20,2) DEFAULT 50.00,     -- Minimum payout threshold
  payment_methods JSONB,                          -- Preferred payment methods
  is_active BOOLEAN DEFAULT TRUE,
  total_referrals INTEGER DEFAULT 0,              -- Total referrals
  total_commission_earned NUMERIC(20,2) DEFAULT 0,-- Total commission earned
  total_payouts_received NUMERIC(20,2) DEFAULT 0, -- Total payouts received
  manager_id INTEGER REFERENCES users(id),        -- Affiliate manager
  team_id INTEGER REFERENCES affiliate_teams(id), -- Team
  level INTEGER DEFAULT 1,                        -- MLM level
  upline_id INTEGER REFERENCES users(id),         -- Direct upline
  downline_count INTEGER DEFAULT 0,               -- Downline count
  total_downline_commission NUMERIC(20,2) DEFAULT 0, -- Downline commission
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **affiliate_relationships** - Referral Relationships
```sql
CREATE TABLE affiliate_relationships (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES users(id),      -- The affiliate
  referred_user_id INTEGER REFERENCES users(id),  -- Referred user
  referral_code VARCHAR(50) NOT NULL,             -- Code used
  commission_rate NUMERIC(5,2) DEFAULT 5.00,
  status VARCHAR(20) DEFAULT 'active',
  first_deposit_amount NUMERIC(20,2) DEFAULT 0,   -- First deposit
  first_deposit_date TIMESTAMPTZ,
  total_commission_earned NUMERIC(20,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(affiliate_id, referred_user_id)
);
```

#### 3. **affiliate_commissions** - Commissions
```sql
CREATE TABLE affiliate_commissions (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES users(id),
  referred_user_id INTEGER REFERENCES users(id),
  transaction_id INTEGER REFERENCES transactions(id),
  commission_amount NUMERIC(20,2) NOT NULL,       -- Commission amount
  commission_rate NUMERIC(5,2) NOT NULL,          -- Applied rate
  base_amount NUMERIC(20,2) NOT NULL,             -- Base amount
  commission_type VARCHAR(20) NOT NULL,           -- deposit/bet/loss/ngr
  level INTEGER DEFAULT 1,                        -- MLM level (1-3)
  status VARCHAR(20) DEFAULT 'pending',           -- pending/approved/paid
  paid_at TIMESTAMPTZ,
  paid_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. **affiliate_tracking** - Click Tracking
```sql
CREATE TABLE affiliate_tracking (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES users(id),
  referral_code VARCHAR(50) NOT NULL,
  visitor_ip VARCHAR(45),
  user_agent TEXT,
  landing_page VARCHAR(500),
  session_id VARCHAR(100),
  conversion_type VARCHAR(20),                    -- registration/deposit/first_deposit
  converted_user_id INTEGER REFERENCES users(id),
  conversion_amount NUMERIC(20,2),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. **affiliate_teams** - Teams
```sql
CREATE TABLE affiliate_teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  manager_id INTEGER REFERENCES users(id),
  team_commission_rate NUMERIC(5,2) DEFAULT 5.00,
  team_goals JSONB,                               -- Team goals
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. **affiliate_payouts** - Payouts
```sql
CREATE TABLE affiliate_payouts (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES users(id),
  total_amount NUMERIC(20,2) NOT NULL,
  commission_ids INTEGER[] NOT NULL,              -- Array of commission IDs
  payment_method VARCHAR(50),
  payment_reference TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  processed_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## ⚙️ How the System Works {#how-it-works}

### 1. Creating an Affiliate

**Flow:**
```
Admin/Manager → Create user → Assign "Affiliate" role → Create affiliate profile
```

**SQL Code:**
```sql
-- 1. Create user (if doesn't exist)
INSERT INTO users (username, email, password, status_id, role_id)
VALUES ('johndoe', 'john@example.com', '$2b$10$...', 1,
  (SELECT id FROM roles WHERE name = 'Affiliate'));

-- 2. Create affiliate profile
INSERT INTO affiliate_profiles (user_id, referral_code, display_name, commission_rate)
VALUES (
  (SELECT id FROM users WHERE username = 'johndoe'),
  'JOHN2024',  -- Generated unique code
  'John Doe Marketing',
  5.00  -- 5% commission
);
```

### 2. MLM Structure (Multi-Level)

```
Level 1 (Direct):     Affiliate A → User 1 (5% commission)
                              ↓
Level 2 (Indirect):          User 1 → User 2 (Affiliate A gets 2%)
                                     ↓
Level 3 (Indirect):                 User 2 → User 3 (Affiliate A gets 1%)
```

**Practical Example:**
```
Affiliate A has code: ABC123
- User 1 registers with ABC123 → Level 1 for A
- User 1 becomes affiliate and gets code: DEF456
- User 2 registers with DEF456 → Level 1 for User 1, Level 2 for A
- User 2 becomes affiliate and gets code: GHI789
- User 3 registers with GHI789 → Level 1 for User 2, Level 2 for User 1, Level 3 for A

When User 3 deposits 100 EUR:
- User 2 receives: 5% × 100 = 5 EUR (Level 1)
- User 1 receives: 2% × 100 = 2 EUR (Level 2)
- Affiliate A receives: 1% × 100 = 1 EUR (Level 3)
```

### 3. Commission Types

#### a) **Deposit Commission**
- Applied on user's first deposit
- Standard rate: **10%**
- Example: User deposits 100 EUR → Affiliate receives 10 EUR

#### b) **Bet Revenue Commission**
- Calculated based on betting activity
- Formula: `(Total Bets - Total Wins) × Commission Rate`
- Standard rate: **3%**
- Example: User bets 1000 EUR, wins 800 EUR → NGR = 200 EUR → Commission = 6 EUR

#### c) **Loss Commission**
- Applied on user's net losses
- Standard rate: **5%**
- Example: User loses 100 EUR → Affiliate receives 5 EUR

#### d) **Net Gaming Revenue (NGR)**
- Commission based on casino's net profit
- Calculated monthly/weekly
- Rate: **Variable (3-5%)**

### 4. Commission Calculation - Code Example

```typescript
// Calculate commission for all 3 MLM levels
async function calculateMLMCommissions(
  baseAffiliateId: number,
  referredUserId: number,
  transactionId: number,
  amount: number,
  commissionType: string
) {
  const commissions = [];

  // Level 1: Direct referral (5%)
  let commission1 = amount * 0.05;
  commissions.push({
    affiliate_id: baseAffiliateId,
    level: 1,
    amount: commission1,
    rate: 5.0
  });

  // Level 2: Indirect (2%)
  const upline1 = await getUpline(baseAffiliateId);
  if (upline1) {
    let commission2 = amount * 0.02;
    commissions.push({
      affiliate_id: upline1.id,
      level: 2,
      amount: commission2,
      rate: 2.0
    });
  }

  // Level 3: Indirect (1%)
  const upline2 = await getUpline(upline1?.id);
  if (upline2) {
    let commission3 = amount * 0.01;
    commissions.push({
      affiliate_id: upline2.id,
      level: 3,
      amount: commission3,
      rate: 1.0
    });
  }

  return commissions;
}
```

---

## 🎨 Admin Panel Implementation {#admin-implementation}

### 1. Affiliate Dashboard (Admin)

**Endpoint:** `GET /api/enhanced-affiliate/admin/dashboard`

**What to display:**
```typescript
interface AdminDashboard {
  overall_stats: {
    total_affiliates: number;      // Total affiliates
    active_affiliates: number;     // Active affiliates
    total_referrals: number;       // Total referrals
    total_commission_earned: number; // Total commissions generated
    total_payouts_paid: number;    // Total payouts made
  };
  team_stats: Array<{
    team_id: number;
    team_name: string;
    affiliate_count: number;
    total_referrals: number;
    total_commission: number;
  }>;
  top_affiliates: Array<{
    id: number;
    username: string;
    display_name: string;
    total_referrals: number;
    total_commission_earned: number;
  }>;
  recent_activities: Array<{
    type: 'commission' | 'payout';
    affiliate_name: string;
    amount: number;
    created_at: string;
  }>;
}
```

**Required UI Components:**

```jsx
// React Example
import React, { useEffect, useState } from 'react';
import { Card, Table, Statistic, Row, Col } from 'antd';

function AdminAffiliateDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/enhanced-affiliate/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    })
      .then(res => res.json())
      .then(result => setData(result.data));
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h1>Affiliate Dashboard</h1>

      {/* Statistics Cards */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Affiliates"
              value={data.overall_stats.total_affiliates}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Affiliates"
              value={data.overall_stats.active_affiliates}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Referrals"
              value={data.overall_stats.total_referrals}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Commissions Generated"
              value={data.overall_stats.total_commission_earned}
              prefix="€"
            />
          </Card>
        </Col>
      </Row>

      {/* Top Affiliates Table */}
      <Card title="Top Performers" style={{ marginTop: 20 }}>
        <Table
          dataSource={data.top_affiliates}
          columns={[
            { title: 'Username', dataIndex: 'username', key: 'username' },
            { title: 'Display Name', dataIndex: 'display_name', key: 'display_name' },
            { title: 'Referrals', dataIndex: 'total_referrals', key: 'referrals' },
            { title: 'Total Commission', dataIndex: 'total_commission_earned', key: 'commission',
              render: (val) => `€${val.toFixed(2)}` }
          ]}
        />
      </Card>
    </div>
  );
}
```

### 2. Affiliates List

**Endpoint:** `GET /api/enhanced-affiliate/admin/affiliates?page=1&limit=20&status=active`

**Required features:**
- Filter by status (active/inactive)
- Search by username/email
- Pagination
- Sort by commissions/referrals
- Actions: Edit, Activate/Deactivate, Details

```jsx
function AffiliatesList() {
  const [affiliates, setAffiliates] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: 'all',
    search: ''
  });

  const loadAffiliates = async () => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/enhanced-affiliate/admin/affiliates?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setAffiliates(data.data.profiles);
  };

  return (
    <div>
      <h2>Manage Affiliates</h2>

      {/* Filters */}
      <div className="filters">
        <Input
          placeholder="Search username or email..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
        />
        <Select
          value={filters.status}
          onChange={(val) => setFilters({...filters, status: val})}
        >
          <Option value="all">All</Option>
          <Option value="active">Active</Option>
          <Option value="inactive">Inactive</Option>
        </Select>
        <Button onClick={loadAffiliates}>Search</Button>
      </div>

      {/* Table */}
      <Table
        dataSource={affiliates}
        columns={[
          { title: 'ID', dataIndex: 'id' },
          { title: 'Username', dataIndex: 'username' },
          { title: 'Referral Code', dataIndex: 'referral_code' },
          { title: 'Commission (%)', dataIndex: 'commission_rate' },
          { title: 'Total Referrals', dataIndex: 'total_referrals' },
          { title: 'Commission Earned', dataIndex: 'total_commission_earned',
            render: (val) => `€${val.toFixed(2)}` },
          { title: 'Status', dataIndex: 'is_active',
            render: (val) => val ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag> },
          { title: 'Actions',
            render: (_, record) => (
              <Space>
                <Button onClick={() => viewDetails(record.id)}>Details</Button>
                <Button onClick={() => editAffiliate(record.id)}>Edit</Button>
              </Space>
            )}
        ]}
        pagination={{
          current: filters.page,
          pageSize: filters.limit,
          onChange: (page) => setFilters({...filters, page})
        }}
      />
    </div>
  );
}
```

### 3. Edit Affiliate

**Endpoint:** `PUT /api/enhanced-affiliate/admin/affiliates/{affiliateId}`

```jsx
function EditAffiliateForm({ affiliateId }) {
  const [form] = Form.useForm();

  const onSubmit = async (values) => {
    await fetch(`/api/enhanced-affiliate/admin/affiliates/${affiliateId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(values)
    });
    message.success('Affiliate updated successfully!');
  };

  return (
    <Form form={form} onFinish={onSubmit} layout="vertical">
      <Form.Item name="display_name" label="Display Name">
        <Input />
      </Form.Item>

      <Form.Item name="commission_rate" label="Commission Rate (%)">
        <InputNumber min={0} max={100} step={0.1} />
      </Form.Item>

      <Form.Item name="minimum_payout" label="Minimum Payout (€)">
        <InputNumber min={0} step={10} />
      </Form.Item>

      <Form.Item name="is_active" label="Status" valuePropName="checked">
        <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
      </Form.Item>

      <Form.Item name="team_id" label="Team">
        <Select>
          <Option value={1}>Team Alpha</Option>
          <Option value={2}>Team Beta</Option>
          <Option value={3}>Team Gamma</Option>
        </Select>
      </Form.Item>

      <Button type="primary" htmlType="submit">Save</Button>
    </Form>
  );
}
```

### 4. Process Payouts

**Endpoint:** `POST /api/enhanced-affiliate/admin/affiliates/{affiliateId}/payout`

```jsx
function ProcessPayout({ affiliateId }) {
  const [commissions, setCommissions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  // Load pending commissions
  useEffect(() => {
    fetch(`/api/enhanced-affiliate/admin/affiliates/${affiliateId}/commissions?status=pending`)
      .then(res => res.json())
      .then(data => setCommissions(data.data.commissions));
  }, [affiliateId]);

  const processPayout = async () => {
    const totalAmount = commissions
      .filter(c => selectedIds.includes(c.id))
      .reduce((sum, c) => sum + c.commission_amount, 0);

    await fetch(`/api/enhanced-affiliate/admin/affiliates/${affiliateId}/payout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        commissionIds: selectedIds,
        paymentMethod: 'bank_transfer',
        paymentReference: `PAY-${Date.now()}`,
        notes: 'Monthly payout'
      })
    });

    message.success(`Payment of €${totalAmount.toFixed(2)} processed!`);
  };

  return (
    <div>
      <h3>Process Payout</h3>
      <Table
        dataSource={commissions}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (ids) => setSelectedIds(ids)
        }}
        columns={[
          { title: 'ID', dataIndex: 'id' },
          { title: 'Type', dataIndex: 'commission_type' },
          { title: 'Amount', dataIndex: 'commission_amount',
            render: (val) => `€${val.toFixed(2)}` },
          { title: 'Date', dataIndex: 'created_at',
            render: (val) => new Date(val).toLocaleDateString() }
        ]}
        summary={() => {
          const total = commissions
            .filter(c => selectedIds.includes(c.id))
            .reduce((sum, c) => sum + c.commission_amount, 0);
          return (
            <Table.Summary.Row>
              <Table.Summary.Cell>Total Selected:</Table.Summary.Cell>
              <Table.Summary.Cell colSpan={3}>
                <strong>€{total.toFixed(2)}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
      <Button
        type="primary"
        onClick={processPayout}
        disabled={selectedIds.length === 0}
      >
        Process Payment
      </Button>
    </div>
  );
}
```

### 5. MLM Structure Visualization

**Endpoint:** `GET /api/enhanced-affiliate/admin/affiliates/{affiliateId}/mlm-structure`

```jsx
import { Tree } from 'antd';

function MLMStructureView({ affiliateId }) {
  const [treeData, setTreeData] = useState([]);

  useEffect(() => {
    fetch(`/api/enhanced-affiliate/admin/affiliates/${affiliateId}/mlm-structure?maxDepth=3`)
      .then(res => res.json())
      .then(data => {
        // Transform data to Tree format
        const formatted = formatMLMTree(data.data);
        setTreeData(formatted);
      });
  }, [affiliateId]);

  const formatMLMTree = (mlm) => {
    return [{
      title: `Level ${mlm.level} - ${mlm.affiliate_id} (€${mlm.total_downline_commission})`,
      key: mlm.affiliate_id,
      children: mlm.downline_ids.map(id => ({
        title: `Downline ${id}`,
        key: id
      }))
    }];
  };

  return (
    <div>
      <h3>MLM Structure</h3>
      <Tree
        treeData={treeData}
        defaultExpandAll
      />
    </div>
  );
}
```

---

## 🎮 Player Frontend Implementation {#frontend-implementation}

### 1. Affiliate Dashboard (Player View)

**Endpoint:** `GET /api/enhanced-affiliate/dashboard`

```jsx
function PlayerAffiliateDashboard() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    fetch('/api/enhanced-affiliate/dashboard', {
      headers: { 'Authorization': `Bearer ${userToken}` }
    })
      .then(res => res.json())
      .then(data => setDashboard(data.data));
  }, []);

  if (!dashboard) return <Spin />;

  return (
    <div className="affiliate-dashboard">
      <h1>My Affiliate Dashboard</h1>

      {/* Referral Code */}
      <Card title="Your Referral Code">
        <div className="referral-code">
          <h2>{dashboard.profile.referral_code}</h2>
          <Button onClick={() => copyToClipboard(dashboard.profile.referral_code)}>
            Copy Code
          </Button>
        </div>
      </Card>

      {/* Quick Statistics */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Referrals"
              value={dashboard.total_referrals}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Commission Earned"
              value={dashboard.total_commission_earned}
              prefix="€"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Monthly Commission"
              value={dashboard.monthly_commission}
              prefix="€"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Commission"
              value={dashboard.pending_commission}
              prefix="€"
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      {/* Promotion Links */}
      <Card title="Your Affiliate Links" style={{ marginTop: 20 }}>
        <GenerateAffiliateLinks referralCode={dashboard.profile.referral_code} />
      </Card>

      {/* Recent Referrals */}
      <Card title="Recent Referrals" style={{ marginTop: 20 }}>
        <Table
          dataSource={dashboard.recent_referrals}
          columns={[
            { title: 'Username', dataIndex: 'username' },
            { title: 'Email', dataIndex: 'email' },
            { title: 'Registration Date', dataIndex: 'registration_date',
              render: (val) => new Date(val).toLocaleDateString() },
            { title: 'First Deposit', dataIndex: 'first_deposit_amount',
              render: (val) => val ? `€${val.toFixed(2)}` : '-' }
          ]}
          pagination={false}
        />
      </Card>

      {/* Recent Commissions */}
      <Card title="Recent Commissions" style={{ marginTop: 20 }}>
        <Table
          dataSource={dashboard.recent_commissions}
          columns={[
            { title: 'Type', dataIndex: 'commission_type' },
            { title: 'Amount', dataIndex: 'commission_amount',
              render: (val) => `€${val.toFixed(2)}` },
            { title: 'Status', dataIndex: 'status',
              render: (val) => {
                const colors = { pending: 'orange', approved: 'blue', paid: 'green' };
                return <Tag color={colors[val]}>{val.toUpperCase()}</Tag>;
              }},
            { title: 'Date', dataIndex: 'created_at',
              render: (val) => new Date(val).toLocaleDateString() }
          ]}
          pagination={false}
        />
      </Card>

      {/* Performance Chart */}
      <Card title="Monthly Performance" style={{ marginTop: 20 }}>
        <CommissionChart data={dashboard.monthly_chart_data} />
      </Card>
    </div>
  );
}
```

### 2. Generate Affiliate Links

```jsx
function GenerateAffiliateLinks({ referralCode }) {
  const [links, setLinks] = useState({
    homepage: `https://jackpotx.net?ref=${referralCode}`,
    register: `https://jackpotx.net/register?ref=${referralCode}`,
    promo: `https://jackpotx.net/promotions?ref=${referralCode}`
  });

  const [customLink, setCustomLink] = useState('');
  const [campaignName, setCampaignName] = useState('');

  const generateCustomLink = async () => {
    const response = await fetch('/api/enhanced-affiliate/generate-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        campaign_name: campaignName,
        target_url: customLink
      })
    });
    const data = await response.json();
    message.success('Link generated successfully!');
    // Add new link
  };

  return (
    <div>
      <h4>Predefined Links</h4>
      <List
        dataSource={Object.entries(links)}
        renderItem={([key, link]) => (
          <List.Item
            actions={[
              <Button onClick={() => copyToClipboard(link)}>Copy</Button>,
              <Button onClick={() => shareOnSocial(link)}>Share</Button>
            ]}
          >
            <List.Item.Meta
              title={key.toUpperCase()}
              description={link}
            />
          </List.Item>
        )}
      />

      <Divider />

      <h4>Generate Custom Link</h4>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input
          placeholder="Campaign name (e.g., Instagram-Feb2024)"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
        />
        <Input
          placeholder="Target URL (e.g., /games/slots)"
          value={customLink}
          onChange={(e) => setCustomLink(e.target.value)}
        />
        <Button type="primary" onClick={generateCustomLink}>
          Generate Link
        </Button>
      </Space>
    </div>
  );
}
```

### 3. View Team (Downline)

```jsx
function MyTeamView() {
  const [level, setLevel] = useState(1);
  const [team, setTeam] = useState(null);

  useEffect(() => {
    fetch(`/api/enhanced-affiliate/team?level=${level}`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    })
      .then(res => res.json())
      .then(data => setTeam(data.data));
  }, [level]);

  return (
    <div>
      <h2>My Team</h2>

      <Radio.Group value={level} onChange={(e) => setLevel(e.target.value)}>
        <Radio.Button value={1}>Level 1 (Direct)</Radio.Button>
        <Radio.Button value={2}>Level 2</Radio.Button>
        <Radio.Button value={3}>Level 3</Radio.Button>
      </Radio.Group>

      {team && (
        <Card style={{ marginTop: 20 }}>
          <Statistic
            title={`Total Members Level ${level}`}
            value={team.total_members}
          />

          <Table
            dataSource={team.team_members}
            columns={[
              { title: 'Username', dataIndex: 'username' },
              { title: 'Email', dataIndex: 'email' },
              { title: 'Own Referrals', dataIndex: 'downline_referrals' },
              { title: 'Commission Generated', dataIndex: 'total_commission',
                render: (val) => `€${val.toFixed(2)}` },
              { title: 'Registration Date', dataIndex: 'created_at',
                render: (val) => new Date(val).toLocaleDateString() }
            ]}
          />
        </Card>
      )}
    </div>
  );
}
```

### 4. Performance Tracking

```jsx
function CommissionChart({ data }) {
  const chartData = {
    labels: data.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [{
      label: 'Daily Commission',
      data: data.map(d => d.daily_commission),
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  return (
    <Line data={chartData} options={{
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: { display: true, text: 'Commission Evolution' }
      }
    }} />
  );
}
```

---

## 🔌 Complete API Endpoints {#api-endpoints}

### Affiliate Endpoints (Player)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/affiliate/dashboard` | Complete affiliate dashboard | Bearer |
| GET | `/api/affiliate/stats` | Affiliate statistics | Bearer |
| GET | `/api/affiliate/referrals` | Referrals list | Bearer |
| GET | `/api/affiliate/commissions` | Commissions list | Bearer |
| GET | `/api/affiliate/team?level=1` | Team (downline) | Bearer |
| POST | `/api/affiliate/generate-link` | Generate affiliate link | Bearer |

### Admin Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/enhanced-affiliate/admin/dashboard` | Admin dashboard | Admin |
| GET | `/api/enhanced-affiliate/admin/affiliates` | Affiliates list | Admin |
| POST | `/api/enhanced-affiliate/admin/affiliates` | Create affiliate | Admin |
| PUT | `/api/enhanced-affiliate/admin/affiliates/:id` | Edit affiliate | Admin |
| GET | `/api/enhanced-affiliate/admin/affiliates/:id` | Affiliate details | Admin |
| GET | `/api/enhanced-affiliate/admin/affiliates/:id/analytics` | Affiliate analytics | Admin |
| GET | `/api/enhanced-affiliate/admin/affiliates/:id/mlm-structure` | MLM structure | Admin |
| POST | `/api/enhanced-affiliate/admin/affiliates/:id/payout` | Process payout | Admin |
| GET | `/api/enhanced-affiliate/admin/settings` | System settings | Admin |
| PUT | `/api/enhanced-affiliate/admin/settings` | Update settings | Admin |

### Tracking Endpoints (Public)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/enhanced-affiliate/track-referral` | Track referral click | None |
| POST | `/api/enhanced-affiliate/record-conversion` | Record conversion | None |

---

## 💡 Integration Examples {#integration-examples}

### Example 1: Automatic Frontend Tracking

```javascript
// Detect ref parameter in URL
function trackAffiliateReferral() {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');

  if (refCode) {
    // Save to localStorage
    localStorage.setItem('referralCode', refCode);

    // Track click
    fetch('/api/enhanced-affiliate/track-referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referralCode: refCode,
        visitorIp: null, // Backend will detect
        userAgent: navigator.userAgent,
        landingPage: window.location.href,
        sessionId: getSessionId()
      })
    });
  }
}

// Call on load
window.addEventListener('load', trackAffiliateReferral);
```

### Example 2: Record Conversion on Registration

```javascript
// On user registration
async function registerUser(userData) {
  // Register user
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });

  const result = await response.json();

  // If there's a saved referral code
  const refCode = localStorage.getItem('referralCode');
  if (refCode && result.success) {
    // Record conversion
    await fetch('/api/enhanced-affiliate/record-conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referralCode: refCode,
        conversionType: 'registration',
        convertedUserId: result.data.userId,
        conversionAmount: 0
      })
    });

    // Remove from localStorage
    localStorage.removeItem('referralCode');
  }

  return result;
}
```

### Example 3: Automatic Commission Calculation on Deposit

```javascript
// Backend - in deposit handler
async function handleDeposit(userId, amount) {
  // Process deposit
  const deposit = await processDeposit(userId, amount);

  // Check if affiliate relationship exists
  const relationship = await pool.query(
    'SELECT * FROM affiliate_relationships WHERE referred_user_id = $1 AND status = $2',
    [userId, 'active']
  );

  if (relationship.rows.length > 0) {
    const affiliate = relationship.rows[0];

    // Check if it's first deposit
    if (!affiliate.first_deposit_date) {
      // Calculate deposit commission (10%)
      const commission = amount * 0.10;

      // Create commission
      await pool.query(
        `INSERT INTO affiliate_commissions
         (affiliate_id, referred_user_id, transaction_id, commission_amount,
          commission_rate, base_amount, commission_type, level, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [affiliate.affiliate_id, userId, deposit.id, commission, 10.0,
         amount, 'deposit', 1, 'pending']
      );

      // Update first deposit info
      await pool.query(
        `UPDATE affiliate_relationships
         SET first_deposit_amount = $1, first_deposit_date = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [amount, affiliate.id]
      );

      // Calculate MLM commissions (Level 2 and 3)
      await calculateMLMCommissions(affiliate.affiliate_id, userId, deposit.id, amount, 'deposit');
    }
  }

  return deposit;
}
```

---

## 🔄 Workflows {#workflows}

### Flow 1: Complete Affiliate Creation

```
1. Admin → Create User
   POST /api/users
   {
     "username": "johndoe",
     "email": "john@example.com",
     "password": "SecurePass123",
     "role": "Affiliate"
   }

2. Admin → Create Affiliate Profile
   POST /api/enhanced-affiliate/admin/affiliates
   {
     "userId": 123,
     "profileData": {
       "display_name": "John's Marketing",
       "commission_rate": 5.0,
       "minimum_payout": 50.0
     }
   }

3. System → Auto-generate Referral Code
   Result: "JOHN2024"

4. Admin → (Optional) Assign to Team
   PUT /api/enhanced-affiliate/admin/affiliates/123
   {
     "team_id": 1,
     "manager_id": 456
   }
```

### Flow 2: User Clicks Affiliate Link → Registration → Commission

```
1. User → Click link: https://jackpotx.net/register?ref=JOHN2024

2. Frontend → Track Click
   POST /api/enhanced-affiliate/track-referral
   {
     "referralCode": "JOHN2024",
     "visitorIp": "192.168.1.1",
     "landingPage": "/register?ref=JOHN2024"
   }

3. User → Registers

4. Frontend → Record Conversion
   POST /api/enhanced-affiliate/record-conversion
   {
     "referralCode": "JOHN2024",
     "conversionType": "registration",
     "convertedUserId": 789
   }

5. Backend → Create Affiliate Relationship
   INSERT INTO affiliate_relationships
   (affiliate_id, referred_user_id, referral_code)

6. User → Makes First Deposit (100 EUR)

7. Backend → Calculate Commissions
   - Level 1 (Direct): 10% × 100 = 10 EUR
   - Level 2 (Upline): 2% × 100 = 2 EUR (if exists)
   - Level 3 (Upline2): 1% × 100 = 1 EUR (if exists)

8. Backend → Save Commissions
   INSERT INTO affiliate_commissions (...)
```

### Flow 3: Monthly Payout Processing

```
1. Admin → View Pending Commissions
   GET /api/enhanced-affiliate/admin/affiliates/123/commissions?status=pending

2. Admin → Select Commissions to Pay
   Frontend: Select multiple rows

3. Admin → Process Payment
   POST /api/enhanced-affiliate/admin/affiliates/123/payout
   {
     "commissionIds": [1, 2, 3, 4, 5],
     "paymentMethod": "bank_transfer",
     "paymentReference": "PAY-2024-001"
   }

4. Backend → Update Commission Status
   UPDATE affiliate_commissions SET status = 'paid'

5. Backend → Create Payout Record
   INSERT INTO affiliate_payouts (...)

6. Backend → (Optional) Send Email Notification
```

---

## 🧪 Testing & Debugging {#testing-debugging}

### Useful Debugging Queries

```sql
-- 1. Check all active affiliates
SELECT
  ap.id,
  u.username,
  ap.referral_code,
  ap.total_referrals,
  ap.total_commission_earned,
  ap.is_active
FROM affiliate_profiles ap
JOIN users u ON ap.user_id = u.id
WHERE ap.is_active = true
ORDER BY ap.total_commission_earned DESC;

-- 2. Check affiliate relationships for a user
SELECT
  ar.id,
  ar.affiliate_id,
  u1.username as affiliate_username,
  ar.referred_user_id,
  u2.username as referred_username,
  ar.referral_code,
  ar.first_deposit_amount,
  ar.total_commission_earned
FROM affiliate_relationships ar
JOIN users u1 ON ar.affiliate_id = u1.id
JOIN users u2 ON ar.referred_user_id = u2.id
WHERE ar.affiliate_id = 123;  -- Affiliate ID

-- 3. Check commissions for an affiliate
SELECT
  ac.id,
  ac.commission_amount,
  ac.commission_rate,
  ac.commission_type,
  ac.level,
  ac.status,
  u.username as referred_user,
  ac.created_at
FROM affiliate_commissions ac
JOIN users u ON ac.referred_user_id = u.id
WHERE ac.affiliate_id = 123
ORDER BY ac.created_at DESC;

-- 4. Check MLM structure for an affiliate
WITH RECURSIVE affiliate_tree AS (
  -- Level 1: Direct referrals
  SELECT
    ar.affiliate_id,
    ar.referred_user_id,
    1 as level,
    u.username
  FROM affiliate_relationships ar
  JOIN users u ON ar.referred_user_id = u.id
  WHERE ar.affiliate_id = 123

  UNION ALL

  -- Levels 2-3: Indirect referrals
  SELECT
    at.referred_user_id as affiliate_id,
    ar.referred_user_id,
    at.level + 1,
    u.username
  FROM affiliate_tree at
  JOIN affiliate_relationships ar ON at.referred_user_id = ar.affiliate_id
  JOIN users u ON ar.referred_user_id = u.id
  WHERE at.level < 3
)
SELECT * FROM affiliate_tree
ORDER BY level, username;

-- 5. Calculate total pending commissions for payout
SELECT
  affiliate_id,
  u.username,
  COUNT(*) as pending_commissions,
  SUM(commission_amount) as total_pending
FROM affiliate_commissions ac
JOIN users u ON ac.affiliate_id = u.id
WHERE status = 'pending'
GROUP BY affiliate_id, u.username
HAVING SUM(commission_amount) >= 50.00  -- minimum_payout
ORDER BY total_pending DESC;

-- 6. Check tracking clicks for a referral code
SELECT
  at.referral_code,
  COUNT(*) as total_clicks,
  COUNT(CASE WHEN conversion_type IS NOT NULL THEN 1 END) as conversions,
  ROUND(
    (COUNT(CASE WHEN conversion_type IS NOT NULL THEN 1 END)::NUMERIC /
     NULLIF(COUNT(*), 0) * 100), 2
  ) as conversion_rate
FROM affiliate_tracking at
WHERE referral_code = 'JOHN2024'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY at.referral_code;

-- 7. Top 10 affiliates by performance
SELECT
  ap.id,
  u.username,
  ap.display_name,
  ap.total_referrals,
  ap.total_commission_earned,
  ap.downline_count,
  ap.total_downline_commission,
  (ap.total_commission_earned + ap.total_downline_commission) as total_earnings
FROM affiliate_profiles ap
JOIN users u ON ap.user_id = u.id
WHERE ap.is_active = true
ORDER BY total_earnings DESC
LIMIT 10;
```

### Test API with cURL

```bash
# 1. Admin Login
curl -X POST https://backend.jackpotx.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'
# Save TOKEN from response

# 2. Get Admin Dashboard
curl -X GET https://backend.jackpotx.net/api/enhanced-affiliate/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Get Affiliates List
curl -X GET "https://backend.jackpotx.net/api/enhanced-affiliate/admin/affiliates?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Create Affiliate
curl -X POST https://backend.jackpotx.net/api/enhanced-affiliate/admin/affiliates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 123,
    "profileData": {
      "display_name": "Test Affiliate",
      "commission_rate": 5.0
    }
  }'

# 5. Update Affiliate
curl -X PUT https://backend.jackpotx.net/api/enhanced-affiliate/admin/affiliates/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commission_rate": 7.5,
    "is_active": true
  }'

# 6. Track Referral (Public)
curl -X POST https://backend.jackpotx.net/api/enhanced-affiliate/track-referral \
  -H "Content-Type: application/json" \
  -d '{
    "referralCode": "JOHN2024",
    "visitorIp": "192.168.1.1",
    "landingPage": "/register?ref=JOHN2024"
  }'
```

### Postman Collection

Import this JSON into Postman for complete testing:

```json
{
  "info": {
    "name": "JackpotX Affiliate API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Admin",
      "item": [
        {
          "name": "Get Admin Dashboard",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/enhanced-affiliate/admin/dashboard",
              "host": ["{{baseUrl}}"],
              "path": ["api", "enhanced-affiliate", "admin", "dashboard"]
            }
          }
        },
        {
          "name": "Get All Affiliates",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/enhanced-affiliate/admin/affiliates?page=1&limit=20",
              "host": ["{{baseUrl}}"],
              "path": ["api", "enhanced-affiliate", "admin", "affiliates"],
              "query": [
                { "key": "page", "value": "1" },
                { "key": "limit", "value": "20" }
              ]
            }
          }
        },
        {
          "name": "Update Affiliate",
          "request": {
            "method": "PUT",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"commission_rate\": 7.5,\n  \"is_active\": true\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/enhanced-affiliate/admin/affiliates/{{affiliateId}}",
              "host": ["{{baseUrl}}"],
              "path": ["api", "enhanced-affiliate", "admin", "affiliates", "{{affiliateId}}"]
            }
          }
        }
      ]
    },
    {
      "name": "Affiliate (Player)",
      "item": [
        {
          "name": "Get Dashboard",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{userToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/affiliate/dashboard",
              "host": ["{{baseUrl}}"],
              "path": ["api", "affiliate", "dashboard"]
            }
          }
        },
        {
          "name": "Get Referrals",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{userToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/affiliate/referrals?page=1&limit=10",
              "host": ["{{baseUrl}}"],
              "path": ["api", "affiliate", "referrals"],
              "query": [
                { "key": "page", "value": "1" },
                { "key": "limit", "value": "10" }
              ]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://backend.jackpotx.net"
    },
    {
      "key": "adminToken",
      "value": "YOUR_ADMIN_TOKEN"
    },
    {
      "key": "userToken",
      "value": "YOUR_USER_TOKEN"
    },
    {
      "key": "affiliateId",
      "value": "1"
    }
  ]
}
```

---

## 📝 Final Notes & Best Practices

### Security
1. **Input Validation**: All inputs must be validated (see `affiliate.schema.ts`)
2. **Rate Limiting**: Limit requests to public endpoints (track-referral)
3. **CORS**: Configure CORS correctly for cross-domain tracking
4. **SQL Injection**: Use parameterization for all queries

### Performance
1. **Indexing**: All tables have indexes on frequently searched columns
2. **Caching**: Cache dashboard data for 5-10 minutes
3. **Pagination**: All lists must be paginated
4. **Async Processing**: MLM commission calculation can be async

### Monitoring
1. **Logs**: Log all commission calculations
2. **Alerts**: Alert when commissions > threshold
3. **Analytics**: Track conversion rates and performance
4. **Errors**: Monitor and log all errors

### Documentation
- Swagger UI available at: `https://backend.jackpotx.net/api-docs`
- All endpoints are documented
- Examples and response schemas included

---

**Author**: SamiDEV
**Date**: 2024
**Version**: 1.0
**Status**: Production Ready ✅
