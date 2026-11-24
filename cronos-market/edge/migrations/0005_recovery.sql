CREATE TABLE IF NOT EXISTS edge_market_checkpoints(block INTEGER PRIMARY KEY,hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS edge_market_receipt_scan(id INTEGER PRIMARY KEY CHECK(id=1),block INTEGER NOT NULL,block_hash TEXT NOT NULL,transactions TEXT NOT NULL,cursor INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS edge_market_receipt_queue(id INTEGER PRIMARY KEY CHECK(id=1),logs TEXT NOT NULL,offset INTEGER NOT NULL,next_cursor INTEGER NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS edge_event_position ON edge_market_events(block,log_index);
