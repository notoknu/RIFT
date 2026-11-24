# RIFT Launch Studio

## Status
Implemented frontend, Solidity contract and local tests. Nothing deployed to Cronos by the assistant. NOT audited or production-complete. A funded creator wallet signs its own deployment; there are no embedded private keys. Existing marketplace deployment remains separate.

## Verified references (Cronos RPC, token ID 1)
- ULTRA CAT — 0xd0a7736cb44c387907b48c518b24fb45ecf1d98f: tokenURI returned data:application/json;base64 containing an embedded data:image/svg+xml;base64 image. This verifies the sampled on-chain storage pattern, not a full audit of every token or upgrade permissions.
- Six Seven — 0x8642755d71ead02c4cbbcf414e07083d87b67982: tokenURI returned https://six-seven-official.surge.sh/meta/1.json. Its linked mint page publishes IPFS CIDs, but the sampled token's URI is currently HTTPS. The new RIFT IPFS path deliberately uses immutable ipfs:// directory URIs instead.
- Marketplace references are secondary listing pages, not necessarily active mint launch pages. Their artwork and code were not copied.

## Creator paths
1. Generative on-chain: contract renders an original starter SVG character with deterministic token-ID-derived hue. Full token metadata/image embedded as data URIs. Not random; no rarity guarantees, editable layer builder or reveal mechanism.
2. Creator SVG: upload a self-contained SVG up to 12,000 UTF-8 bytes. Shared edition artwork with unique token IDs, not a per-token SVG batch uploader. Frontend restricts element types, external references, event handlers, inline style, entities and document types. This is a best-effort upload restriction, not an audit-grade universal SVG sanitizer. The contract only enforces size; independent direct deployments may supply different SVG content. Display SVG only as an image, never injected HTML.
3. IPFS: contract returns immutable ipfs://DIRECTORY/1.json through supply.json. UI can build a metadata ZIP from numbered image filenames and an image-directory CID. ZIP generation runs locally and does not upload or pin anything. First pin image directory; enter its CID for ZIP export; pin the extracted metadata directory; replace the configuration field with the METADATA directory URI before deploying. CID content and all files are not automatically validated through gateways. Creators should verify every metadata/image pair and back up/redundantly pin data before deployment.

## Zero platform fee / zero mint price
Mint price accepts 0. RIFT takes no launch or mint platform fee. Creators pay deployment gas; collectors pay mint gas. Deployment can cost significantly more for custom on-chain art. Wallet's final gas estimate is authoritative. No sponsored gas, relayer or gasless claim.

## Mint controls
Immutable max supply (1–100,000), lifetime per-wallet cap, per-transaction cap, native CRO price, UTC-converted start/end, optional allowlist phase end and root. Blank start means deployment-time availability; blank end means no scheduled end. Both phases use the same configured mint price. A configured allowlist becomes public after allowlistEnd.

Address proof generator is local: double-hashed abi.encode(address) leaves and sorted-pair Keccak hashing. Odd siblings duplicate. Proofs are compatible with OpenZeppelin MerkleProof; tree shape is not necessarily OpenZeppelin StandardMerkleTree's shape. Export contains root and address-keyed proofs. Securely distribute proofs and keep the file. UI accepts an address's proof as a JSON array; no proof-hosting service.

No admin mint bypass, reserve allocation or post-deployment metadata edits. Creator can pause/unpause or withdraw collected mint proceeds. Withdraw recipient is the current contract owner; the immutable ERC-2981 royalty receiver is the original creator, even after ownership transfer. Renouncing ownership is disabled to reduce accidental fund/admin lockout. ERC-2981 is a royalty signal only; neither RIFT's current market contract nor external venues are guaranteed to enforce it.

## UI
Launch navigation opens a 3D-style studio with live artwork preview. Deployment requires gas/cost acknowledgement and explicit mainnet confirmation after gas estimation. A compatible deployed address can be loaded for minting/management. A copied URL with ?drop=ADDRESS opens Launch Studio and reads that contract from public Cronos RPC. No universal marketplace publishing guarantee, automatic collection registry or production creator dashboard database.

## Verification
- npm run contracts:test: 12 tests pass, including existing marketplace tests and drop free/paid mints, limits, pause, time start, SVG/IPFS URI modes, royalty reporting, withdrawal restrictions, and odd-sized locally generated allowlist proof execution against the contract.
- npm run build: passed.
- node checks/launch.mjs: Launch navigation, form, SVG upload preview, IPFS path and 390px mobile layout passed without page errors or page-width overflow.
- Browser-wallet deployment/signing and complete IPFS pinning have not been exercised; no claim of mainnet readiness.

Regenerate browser ABI/bytecode after Solidity edits: npm run contracts:export, then npm run build.

## Remaining production work
Independent contract/security review, adversarial/reentrancy fuzz tests, contract verification tooling, testnet end-to-end wallet rehearsal, better accessible field validation, deployment recovery/reorg handling, creator registry and indexing, per-token custom art/layer editor, optional reveal/reserve phases, hosted proof delivery, IPFS upload/pin provider integration, content moderation, monitoring and dependency vulnerability remediation. Free pinning tiers are not guaranteed forever; IPFS persistence always requires someone to keep data available. All deployment/mint transactions cost gas.

## Metadata interoperability upgrade
New deployments now include collectionDescription, externalUrl, totalSupply(), contractURI(), and standard on-chain traits (Storage, Renderer, numeric Token ID, and actual rendered Hue for the starter generator). JSON escaping preserves quotes, control characters, backslashes and Unicode descriptions. tokenURI supports ERC-721 Metadata through the inherited interface; transfer/approval/ownership and Transfer events remain standard ERC-721. Enumeration is not advertised: indexers can discover minted IDs from Transfer events; token IDs start at 1.

On-chain contractURI returns an embedded collection JSON object with name, description, image, external_link, royalty basis points and original royalty receiver. IPFS contractURI returns BASE/contract.json; the ZIP exporter now includes that file. Common form fields include description and HTTPS project website. Image-directory and metadata-directory inputs are separate to reduce CID confusion. CID syntax is validated with multiformats, but the whole pinned collection is not automatically gateway-validated before deployment.

Optional per-token IPFS overrides are an object keyed by numeric token ID, e.g. {"1":{"name":"Gold Cat","attributes":[{"trait_type":"Fur","value":"Gold"}],"background_color":"aabbcc"}}. Supported overrides: name, description, attributes, external_url, animation_url, background_color. Image is derived from the corresponding numbered file and validated image-directory URI; attributes are validated for standard trait/value/display_type structures. Unsupported fields are not automatically propagated. ZIP export checks simple image-file signatures and size (25 MiB per file), not complete media decoding or uploaded IPFS availability. Per-token video/audio files are not uploaded by this exporter; optional animation_url references independently hosted/pinned content.

### Explorer verification package
After deployment, Download explorer verification ZIP exports the exact compiler Standard JSON input (including source dependencies/settings), encoded and JSON constructor arguments, ABI, compiler version, deployment transaction hash and contract address. Last deployment's public configuration is saved locally in the same browser for recovery; no private keys are stored. Bytecode hashes prevent exporting a changed app build's source package for an older deployment. Save the package immediately. Submit it to the appropriate Cronos explorer; this does NOT automatically verify source, label the collection, or cause NFT artwork to appear. Explorer support and review workflows vary.

### Metadata readiness checker
Launch Studio includes a read-only address/token checker using Cronos mainnet RPC. It checks interface responses (ERC-165, ERC-721, ERC-721 Metadata, ERC-2981), name/symbol, ownerOf, tokenURI, token-level JSON fields/traits and contractURI. It resolves embedded JSON and bounded IPFS JSON through fixed public gateways. Arbitrary HTTPS metadata URLs are reported but not fetched by our server. Images are not downloaded or availability-verified by this checker. An unminted token or gateway outage yields Review, not automatic proof the collection is invalid.

A passed checklist is NOT a security audit, code verification, immutability proof, authenticity badge, marketplace approval, or universal wallet compatibility certificate. Cronos support, automatic indexing, contract import, SVG/data-URI rendering, custom traits, animation formats, collection-level metadata and metadata refresh policies differ across wallets and marketplaces. ERC-2981 remains a non-enforced signal in the current RIFT marketplace. ERC-4906 update notifications and delayed reveal are not advertised because this drop's metadata configuration is immutable.

### Additional validation
14 total contract tests passed, including interface detection, totalSupply, contract.json URI and embedded token/collection JSON with escaped quotes, Unicode/newline descriptions and numeric traits. IPFS metadata utility tests passed CID, path, external URL and trait validation. Browser export test checked actual ZIP filenames/metadata, and a live ULTRA CAT token 1 check resolved its embedded metadata. No mobile overflow or browser page errors. Existing deployed contracts, if any were launched outside this conversation, cannot gain these features automatically; changes apply to new deployments.
