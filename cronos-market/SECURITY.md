# Security policy — pre-release

RIFT is not independently audited or approved for production funds. Local tests do not establish hosted capacity, custody safety or mobile-wallet acceptance.

## Reporting

Do not post exploitable vulnerabilities, credentials, user records or attack transactions in a public issue. Once this source is in its owner's repository, use GitHub **Security → Report a vulnerability** IF private vulnerability reporting has been enabled. If unavailable, request a private reporting channel from the repository owner without disclosing exploit details. No email/contact or response SLA is claimed here.

Repository owner: enable private vulnerability reporting and publish a monitored private contact before public launch.

## Credentials

Never send wallet seeds/private keys through chat, issues, workflow artifacts or logs. Store provider tokens in the deployment environment's secret store. Scope tokens, set expiration and rotate after suspected exposure. Git history and old build artifacts may retain deleted secrets.

## Release controls

- CI runs without deployment secrets.
- Deployment workflow is manual, main-branch only, and uses an `evaluation` environment. The owner MUST configure required reviewers; declaring an environment in YAML alone does not enforce approval.
- Configure GitHub branch protection/rulesets as available to your plan.
- The generated evaluation configuration does not activate trading, pin sponsorship or scheduled indexing by default.
- D1 migrations require explicit opt-in and an approved backup/review for an existing database.
- Failed hosted smoke tests are evidence of a failed deployment check; they do NOT automatically roll back database changes or an already published Surge revision.

The source audit is heuristic and does not replace Git-history scanning, independent review, provenance/legal checks or account security.
