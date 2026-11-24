ALTER TABLE edge_collection_state ADD COLUMN recover_block INTEGER;
ALTER TABLE edge_collection_state ADD COLUMN recover_hash TEXT;
CREATE TABLE edge_collection_checkpoints(address TEXT,block INTEGER,hash TEXT,PRIMARY KEY(address,block));
CREATE TABLE edge_collection_undo(address TEXT,block INTEGER,token_key TEXT,document TEXT,PRIMARY KEY(address,block,token_key));
INSERT INTO edge_collection_checkpoints SELECT address,last_block,hash FROM edge_collection_state WHERE hash IS NOT NULL;
ALTER TABLE edge_collection_state ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
