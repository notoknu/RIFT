# Batch1 implementation decisions (scope, not production approval)

- Chain25 only; preserve escrow/funded-offer exchange semantics. No signed-order protocol silently introduced.
- Keep Render/Turso choices. Registered creator collections must be read from the selected authoritative database; never fall back to local data when the remote source fails.
- This batch bridges admission, not persistent collection/exchange projections. All current collection index paths remain local SQLite.
- Registry capacity1000 distinct records; query LIMIT1001 and fail closed on overflow instead of silently truncating. Conflicting operator/registry deployment boundaries rejected.
- Registry reads are read-only and require existing schema. No startup creation/migration of a live remote DB in this batch. Current verified factory registry is ERC721-only; no invented ERC1155 registration support.
- Per-consumer30second detached cache, shared pending reads and5second failure cooldown; expired registry not used on outage. Not a distributed lease or rate limiter.
- Synchronous status cannot prove remote registry/worker readiness: report remote-not-inspected rather than stale local creator DB results.
- Worker remains a separate entrypoint, not an automatically started Render worker. Deployment/execution topology, remote index adapters, fencing and hosted acceptance remain open.
- Public Reown configuration and v30 Android binaries unchanged; native signing stays disabled/unapproved. No spending or deployment.
