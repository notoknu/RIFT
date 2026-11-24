# RIFT hybrid v12 — bounded raster previews and raw IPFS integrity

**Engineering debug preview, versionCode 12 / 0.10.0-hybrid-preview. Not production, device or mainnet accepted.** This is actual additional implementation, not a claim of five elapsed hours or completion of all audit phases.

## Delivered this pass

### Explicit bounded raster preview

After embedded/external metadata supplies a supported IPFS image reference, a separate button requests native confirmation before any artwork fetch. Metadata inspection alone does not load images. The confirmation identifies the public gateway/path and privacy cost.

- Fixed `ipfs.io` gateway only; same strict CID/path policy, public-IP/TLS validation, deadlines/cancellation, no redirects/compression, credentials, cookies, account or referrer forwarding.
- PNG/JPEG only, with matching HTTP MIME, file signature and Android decoder MIME. SVG/HTML/GIF/WebP and arbitrary hosts are unsupported.
- At most **128 KiB input**, **1,048,576 original pixels**, **2048px maximum original side**. Dimensions are read from the actual decoder, not metadata.
- Decode/downsample/re-encode natively into a PNG of at most **256px per side / 64 KiB**. Original remote bytes, EXIF/chunks and URLs are not forwarded as displayable content to WebView.
- Frontend validates PNG data-URI encoding/signature/IHDR dimensions/byte count; never substitutes the remote image reference as `<img src>`. A preview/profile/candidate change clears prior output. Metadata and previews remain transient, not a new cache/sync/backup format.
- Oversized/invalid/failed output is rejected, not silently rendered. Bitmap resources are recycled and memory allocation failure during decode/conversion is handled. Android codec calls are not hard-preemptible; resource bounds and suppression of late replies are safeguards, not a codec security certification.

### Real but narrowly scoped IPFS integrity

Native JSON/artwork retrieval now checks original response bytes **before parsing or decoding** when the reference is a pathless **CIDv1 raw codec with SHA-256**. Canonical base32 and expected multihash format are checked, and a digest mismatch is rejected. Tests include the known empty raw-content CID, round-trip content, altered bytes, unsupported digest and invalid encoding.

CIDv0/UnixFS/DAG and directory/subpath resolution explicitly return **not-verified**. No shortcut compares a directory CID to child file bytes. A matching raw digest establishes only byte identity—not ownership, collection authenticity, malware safety, image truthfulness or retention.

### Regression and runtime preparation

Added JVM-testable raster budgets, HTTP media/MIME separation, raw CID verification, frontend data-URI rejection and explicit-preview browser coverage. Two Android instrumentation cases cover actual PNG conversion and rejection of spoofed/oversized content, bringing the compiled suite to **12 tests**. They have **not** executed on Android here.

Fixed canonical URI length parity between native/frontend policies. Preview state is cleared when the selected owner/candidate changes. Reviewed native transport continues to reject duplicate content-type headers and does not expose a general-purpose GET proxy.

## Executed verification

| Check | Result | Scope |
|---|---|---|
| Engineering | **158 passed, zero skipped** | Local automated suite |
| Implementation | **6 passed** | Local |
| Redis security | **7 passed, zero skipped** | Real isolated Redis |
| Contracts | **40 passed** | Local Hardhat, no mainnet spending |
| Full implementation browsers | Passed | Includes explicit metadata/artwork operations, data-URI-only display and profile-change clearing; native transport mocked |
| Worker/D1 + bundled offline browsers | Passed | Local/desktop, not Android |
| Fresh final extracted source | Actual `npm ci`, **158 tests**, frontend build passed | Separate dependency installation, no symlinked reuse |
| Native media/integrity policies | Passed JVM execution, including known raw CID vector | Does not execute Android image codecs |
| Final Android app/test APK/lint | **19s / 69 tasks**, zero errors, one JavaScript-enabled warning | All 12 instrumentation tests compile only |
| App/test APK signatures | v2 verified | Disposable debug certificate |
| npm audit | Zero vulnerabilities reported at execution | Not independent review |
| Source heuristic audit | No findings; LICENSE still absent | Not a rights/secret guarantee |
| Android device availability | **Blocked**: no authorized device/emulator | No runtime acceptance claim |

Evidence: `checks/v12-verification.json`, `checks/v12-verify-*.log`, final media/browser/build logs, `checks/v12-clean-*.log`, `checks/v12-clean-tested-code.json`, signature/audit reports. Final package implementation hashes are compared to the independently clean-tested code set. Runtime timestamps describe the execution environment, not asserted calendar proof.

## Deliverables and preservation

`RIFT-hybrid-preview-v12.apk`, `RIFT-native-tests-v12.apk`, `RIFT-hybrid-v12-complete.zip`, `RIFT-hybrid-v12-source-candidate.zip`, and `RIFT-hybrid-v12-package-checksums.json`.

All **27 earlier generated ZIP/APK artifacts**, including v11, are preserved byte-exactly in `RIFT-previous-builds-history.zip`; every reconstruction was verified before removing duplicate standalone copies. The adjacent inventory/restore script preserves original names, sizes and hashes. Use the current v12 files unless deliberately restoring historical work.

## Still not complete

Full holdings discovery/index completeness; general UnixFS/DAG/path integrity; broader media/cache policies; authenticated conflict-aware automatic encrypted sync; real wallet/deep-link/account/chain/process-death acceptance; actual Android networking, image codecs, Keystore, SQLite, SAF and WorkManager behavior; production hosting/signing; independent contract/security/legal review. See `REMAINING-RELEASE-GATES.md` and `ANDROID-V12-DEVICE-ACCEPTANCE.md`.

No seed custody, provider secrets, fake collections or automatic transactions were introduced. Zero platform fee/free mint does not waive Cronos gas or external-service/retention requirements. This build must not be represented as a completed, audited mainnet marketplace.
