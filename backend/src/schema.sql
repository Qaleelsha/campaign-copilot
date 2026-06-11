-- Drop in reverse dependency order for clean resets
DROP TABLE IF EXISTS communications CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS segments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- CUSTOMERS
-- Core entity. Every shopper the brand knows about.
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20),
  city VARCHAR(80),
  channel_preference VARCHAR(20) DEFAULT 'whatsapp'
    CHECK (channel_preference IN ('whatsapp', 'sms', 'email', 'rcs')),
  tags TEXT[],                        -- e.g. {vip, coffee-lover}
  created_at TIMESTAMP DEFAULT NOW()
);

-- ORDERS
-- Purchase history. This is what drives all segmentation.
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_name VARCHAR(150) NOT NULL,
  category VARCHAR(80),               -- e.g. coffee, pastry, merchandise
  amount NUMERIC(10,2) NOT NULL,
  purchased_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SEGMENTS
-- A saved audience definition. Can be AI-generated or manual.
-- rules_json stores the filter logic as JSON so it's flexible
-- e.g. {"spent_min": 500, "last_purchase_days": 30, "category": "coffee"}
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description TEXT,
  rules_json JSONB NOT NULL,          -- the filter logic
  source VARCHAR(20) DEFAULT 'ai'
    CHECK (source IN ('ai', 'manual')),
  customer_count INTEGER DEFAULT 0,   -- cached at creation time
  created_at TIMESTAMP DEFAULT NOW()
);

-- CAMPAIGNS
-- One campaign = one segment + one channel + one message template
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  segment_id UUID NOT NULL REFERENCES segments(id),
  channel VARCHAR(20) NOT NULL
    CHECK (channel IN ('whatsapp', 'sms', 'email', 'rcs')),
  message_template TEXT NOT NULL,     -- may include {name}, {discount} etc.
  status VARCHAR(30) DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'completed', 'failed')),
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  launched_at TIMESTAMP
);

-- COMMUNICATIONS
-- One row per customer per campaign. Tracks the full delivery lifecycle.
-- This is what the channel stub writes back into via callbacks.
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,              -- personalised message for this customer
  status VARCHAR(30) DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'sent', 'delivered',
      'opened', 'clicked', 'failed', 'converted'
    )),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  failed_reason TEXT,                 -- e.g. "invalid number", "rate limited"
  created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES
-- We query communications by campaign_id constantly (analytics)
CREATE INDEX idx_communications_campaign ON communications(campaign_id);
-- We filter orders by customer_id and purchased_at for segmentation
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_purchased_at ON orders(purchased_at);
-- We filter customers by tags for segmentation
CREATE INDEX idx_customers_tags ON customers USING GIN(tags);