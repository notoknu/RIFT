CREATE TABLE edge_collection_state(address TEXT PRIMARY KEY,start_block INTEGER NOT NULL,standard TEXT NOT NULL,last_block INTEGER NOT NULL,hash TEXT,head INTEGER,updated INTEGER,lease TEXT,lease_until INTEGER,pending TEXT,rebuilding INTEGER NOT NULL DEFAULT 0);
CREATE TABLE edge_collection_tokens(address TEXT,token_key TEXT,supply TEXT,document TEXT,PRIMARY KEY(address,token_key));
CREATE TABLE edge_collection_holders(address TEXT,owner TEXT,token_key TEXT,quantity TEXT,PRIMARY KEY(address,owner,token_key));
CREATE INDEX edge_collection_holder_token ON edge_collection_holders(address,token_key,owner);
CREATE TABLE edge_collection_logs(address TEXT,block INTEGER,log_index INTEGER,tx TEXT,hash TEXT,document TEXT,PRIMARY KEY(address,block,log_index));
CREATE TABLE edge_collection_metadata(address TEXT,token_key TEXT,document TEXT,updated INTEGER,PRIMARY KEY(address,token_key));
CREATE TABLE edge_collection_traits(address TEXT,trait_type TEXT,value TEXT,token_key TEXT,PRIMARY KEY(address,trait_type,value,token_key));
CREATE TABLE edge_collection_hydration(address TEXT,token_key TEXT,retry_after INTEGER,PRIMARY KEY(address,token_key));
