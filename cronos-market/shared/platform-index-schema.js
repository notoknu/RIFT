// Versioned additive namespace; no creator-account tables are modified.
export const PLATFORM_INDEX_SCHEMA_VERSION=1;
export const PLATFORM_INDEX_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS rift_index_migrations(version INTEGER PRIMARY KEY,checksum TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS rift_exchange_streams(stream TEXT PRIMARY KEY,chain INTEGER NOT NULL,address TEXT NOT NULL,start_block INTEGER NOT NULL,runtime_hash TEXT NOT NULL,last_block INTEGER NOT NULL,block_hash TEXT,revision INTEGER NOT NULL DEFAULT 0,fence INTEGER NOT NULL DEFAULT 0,lease_owner TEXT,lease_until INTEGER NOT NULL DEFAULT 0,updated INTEGER)`,
 `CREATE TABLE IF NOT EXISTS rift_exchange_events(stream TEXT NOT NULL,tx TEXT NOT NULL,log_index INTEGER NOT NULL,block INTEGER NOT NULL,block_hash TEXT NOT NULL,type TEXT NOT NULL,order_id TEXT NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(stream,tx,log_index),UNIQUE(stream,block,log_index),FOREIGN KEY(stream) REFERENCES rift_exchange_streams(stream))`,
 `CREATE INDEX IF NOT EXISTS rift_exchange_event_projection ON rift_exchange_events(stream,type,order_id,block,log_index)`,
 `CREATE TABLE IF NOT EXISTS rift_exchange_orders(stream TEXT NOT NULL,type TEXT NOT NULL,order_id TEXT NOT NULL,account TEXT NOT NULL,nft TEXT NOT NULL,active INTEGER NOT NULL,expiry INTEGER NOT NULL,document TEXT NOT NULL,PRIMARY KEY(stream,type,order_id),FOREIGN KEY(stream) REFERENCES rift_exchange_streams(stream))`,
 `CREATE INDEX IF NOT EXISTS rift_exchange_order_page ON rift_exchange_orders(stream,type,active,order_id)`,
 `CREATE TABLE IF NOT EXISTS rift_exchange_checkpoints(stream TEXT NOT NULL,block INTEGER NOT NULL,hash TEXT NOT NULL,PRIMARY KEY(stream,block),FOREIGN KEY(stream) REFERENCES rift_exchange_streams(stream))`
];
