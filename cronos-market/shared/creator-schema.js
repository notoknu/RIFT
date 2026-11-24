// Versioned schema used by both the local SQLite adapter and Cloudflare D1.
export const CREATOR_SCHEMA = `
CREATE TABLE IF NOT EXISTS creator_schema (version INTEGER PRIMARY KEY);
INSERT OR IGNORE INTO creator_schema VALUES(1);
CREATE TABLE IF NOT EXISTS creator_nonces (nonce TEXT PRIMARY KEY,address TEXT NOT NULL,message TEXT NOT NULL,expires INTEGER NOT NULL,consumed INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS nonce_expiry ON creator_nonces(expires);
CREATE TABLE IF NOT EXISTS creator_sessions (hash TEXT PRIMARY KEY,address TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS session_expiry ON creator_sessions(expires);
CREATE TABLE IF NOT EXISTS creator_profiles (wallet TEXT PRIMARY KEY,version INTEGER NOT NULL DEFAULT 1,document TEXT NOT NULL,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS creator_drafts (id TEXT PRIMARY KEY,wallet TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,document TEXT NOT NULL,updated INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS drafts_wallet ON creator_drafts(wallet,updated DESC,id);
CREATE TABLE IF NOT EXISTS creator_favorites (wallet TEXT NOT NULL,address TEXT NOT NULL,PRIMARY KEY(wallet,address));
CREATE TABLE IF NOT EXISTS creator_collections (address TEXT PRIMARY KEY,creator TEXT NOT NULL,factory TEXT NOT NULL,tx TEXT NOT NULL UNIQUE,block INTEGER NOT NULL,name TEXT NOT NULL,contract_uri TEXT NOT NULL,image_uri TEXT,banner_uri TEXT,description TEXT,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS creator_presentations (address TEXT PRIMARY KEY,title TEXT,description TEXT,image_uri TEXT,banner_uri TEXT,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS creator_reports (id TEXT PRIMARY KEY,wallet TEXT NOT NULL,subject TEXT NOT NULL,reason TEXT NOT NULL,created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS reports_wallet ON creator_reports(wallet,created);
CREATE TABLE IF NOT EXISTS creator_budget (id INTEGER PRIMARY KEY CHECK(id=1),bytes INTEGER NOT NULL DEFAULT 0,files INTEGER NOT NULL DEFAULT 0,blocked INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO creator_budget(id) VALUES(1);
CREATE TABLE IF NOT EXISTS creator_uploads (id TEXT PRIMARY KEY,wallet TEXT NOT NULL,bytes INTEGER NOT NULL,files INTEGER NOT NULL,state TEXT NOT NULL,expires INTEGER NOT NULL,cid TEXT,error TEXT);
CREATE INDEX IF NOT EXISTS uploads_wallet ON creator_uploads(wallet,expires);
CREATE TABLE IF NOT EXISTS creator_visibility(address TEXT PRIMARY KEY,hidden INTEGER NOT NULL,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS creator_report_resolutions(id TEXT PRIMARY KEY,outcome TEXT NOT NULL,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS creator_ops_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,action TEXT NOT NULL,subject TEXT NOT NULL,note TEXT NOT NULL,created INTEGER NOT NULL);
`;
