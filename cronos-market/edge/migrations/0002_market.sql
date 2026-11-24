CREATE TABLE IF NOT EXISTS edge_rpc_budget (period INTEGER PRIMARY KEY,count INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS edge_market_state (id INTEGER PRIMARY KEY CHECK(id=1),address TEXT NOT NULL,start_block INTEGER NOT NULL,last_block INTEGER NOT NULL,block_hash TEXT,head INTEGER,updated INTEGER,error TEXT,span INTEGER NOT NULL,lease TEXT,lease_until INTEGER);
CREATE TABLE IF NOT EXISTS edge_market_events (tx TEXT NOT NULL,log_index INTEGER NOT NULL,block INTEGER NOT NULL,block_hash TEXT NOT NULL,id TEXT NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(tx,log_index));
CREATE INDEX IF NOT EXISTS edge_event_id ON edge_market_events(id,block,log_index);
CREATE TABLE IF NOT EXISTS edge_market_orders (id TEXT PRIMARY KEY,seller TEXT NOT NULL,nft TEXT NOT NULL,token_id TEXT NOT NULL,price_wei TEXT NOT NULL,active INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS edge_active_orders ON edge_market_orders(active,id);
CREATE INDEX IF NOT EXISTS edge_seller_orders ON edge_market_orders(seller,active,id);
