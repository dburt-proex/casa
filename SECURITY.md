 # Security Policy volume I.

## CASA deterministic gate/governance control layer
GitHub Repository Security Policy:

This policy establishes the baseline security requirements for all repositories under our GitHub organization. Non-compliance risks immediate revocation of access.

1. ## Authentication & Access Control 
* Mandatory MFA: All users must have multi-factor authentication (MFA) enabled on their GitHub accounts.
* Principle of Least Privilege: * No user should have Admin rights unless strictly necessary for repository management.
* Use GitHub Teams to manage permissions at scale rather than assigning access to individual users.
* Outside Collaborators: External contributors must be restricted to specific repositories with Read or Write access only, and their access must be reviewed quarterly.
* SSH & Personal Access Tokens (PATs): * Passphrases are required for all local SSH keys.
* PATs must have an explicit expiration date (maximum 90 days) and use fine-grained permissions.

2. ## Branch Protection Rules
### All production and main development branches (e.g., main, master, develop) must have the following protections enforced:

* Require Pull Requests: Direct pushes to protected branches are strictly prohibited.
* Code Review Sign-off: At least one independent, qualified peer review is required before merging.
* Linear History: Merges must be done via squash commits or rebase to keep a clean, auditable history.
* Status Checks: Automated CI/CD pipelines, linting, and security scans must pass successfully before a merge is permitted.
* Restrict Deletions: Force pushes and branch deletions are disabled for protected branches.

3. ## Secret Management & Prevention
* No Hardcoded Secrets: API keys, passwords, encryption tokens, and certificates must never be committed to source control.
* Environment Files: All .env, .pem, and config files containing sensitive data must be explicitly added to the repository's .gitignore.
* GitHub Secret Scanning: Enable GitHub’s native secret scanning for both public and private repositories to block commits containing known token formats.

## Remediation: 
### If a secret is accidentally committed:
* Consider the secret compromised and revoke it immediately at the provider level.
* Rewrite the repository history using tools like git-filter-repo or BFG Repo-Cleaner to remove the trace.

4. ## Vulnerability & Dependency Management
* Dependabot Alerts: Enable Dependabot to automatically scan repository dependencies for known vulnerabilities (CVEs).
* Automated Security Updates: Allow Dependabot to automatically open pull requests for non-breaking security patches.
* Static Application Security Testing (SAST): Configure GitHub CodeQL or a third-party equivalent to run on every pull request to identify code-level vulnerabilities (e.g., SQL injection, XSS).

5. ## Audit & Compliance
* Repository Visibility: New repositories default to Private. Changing a repository to Public requires explicit approval from the Security Team.
* Audit Logs: Organization audit logs will be reviewed monthly for anomalous behavior (e.g., unexpected repository creation, bulk data downloading, or permission escalation).
* Forking Restrictions: Forking of private repositories outside of the organization is strictly disabled.
_____________________________________________________________________

## Supported Versions


| Version | Supported |
| ------- | ----------|
| 5.1.x   | ✅ |
| 5.0.x   | ✅ |
| 4.0.x   | 🟥 |
| < 4.0   | 🟥 |



## Reporting a Vulnerability

We take the security of our projects seriously. If you believe you have found a security vulnerability, please do not open a public issue. Instead, follow the steps below:

1. Report the vulnerability via GitHub Security Advisories or email us directly at [drewburt4@gmail.com].
2. Provide a detailed description of the issue, including steps to reproduce.
3. Give us 48 hours to acknowledge receipt before following up.

We will coordinate a fix and release a patch before disclosing the vulnerability publicly.
