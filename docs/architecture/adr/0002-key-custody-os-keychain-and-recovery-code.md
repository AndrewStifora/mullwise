# ADR-0002: Key custody (OS keychain plus recovery code)

- **Status:** Accepted, **amended 2026-09-26**. The OS keychain replaces the draft's DPAPI through `powershell.exe`, by Andrew's decision in `../roadmap.md`.
- **Date:** 2026-09-26
- **Evidence:** Spike S2 (#7): `spikes/s2-keyring/`, and a regression check in CI on Windows (`tests/spikes/s2-keyring.test.ts`)

## Context

- The vault must be encrypted even without disk encryption. This PC runs Windows Home and Device Encryption isn't available.
- Andrew wants one approach that works on Windows, macOS and Linux, not a Windows-only mechanism.
- Unlocking must be silent in normal use: the MCP server starts with no human at a keyboard. Losing the machine must
  not mean losing the vault.
- Claude Code itself keeps its credentials in plaintext on Windows, so malware running as the same user is out of scope.
- An MCP host may start the server with a stripped environment.

## Decision

A random 256-bit **data key (DEK)** seals every record (AES-256-GCM, with authenticated data, padded to 256 bytes). The
vault metadata stores the DEK **wrapped twice**:

1. By a random 256-bit **keychain key** held in the OS credential store through
   **`@napi-rs/keyring`** (service `mullwise`, account = vault ID):
   - Windows Credential Manager
   - macOS Keychain
   - Linux Secret Service
2. By a **recovery key** derived with HKDF-SHA256 (salt = vault ID) from a 130-bit recovery code:
   - 26 base32 characters
   - shown once on the alternate screen, then re-typed to confirm
   - kept offline by the user

An `env-test` key source exists **for test vaults only**. CI uses it where no keychain is available.

With no key available, the server starts **locked**, and read or write tools return a locked error. Keys never appear in:
`userConfig`, desktop config, argv, logs or tool arguments.

## Evidence: spike S2 (2026-09-26, Windows 11, Node 24.21.0, `@napi-rs/keyring` 2.1.0)

Each step runs in a **fresh process**, the way the CLI writes and the server reads. The secret is compared by hash only.

| Step | Environment | Result | Load / operation time |
|---|---|---|---|
| set | full (107 variables) | ok | 12.4 ms / 13.1 ms |
| get | full | ok, same secret | 10.4 / 5.9 ms |
| get | **stripped** (SystemRoot, windir, SystemDrive, PATH) | ok, same secret | 10.3 / 1.7 ms |
| get | **empty** | ok, same secret | 10.3 / 2.2 ms |
| delete | full | ok | 10.5 / 1.3 ms |
| get | full | not found (as expected) | 10.6 / 5.3 ms |

`cmdkey /list` confirmed that no spike credential remained.

**Supply chain.**
- `@napi-rs/keyring` 2.1.0 is 13 days old.
- It has SLSA provenance on both the main package and the Windows package.
- The native binary comes as a prebuilt optional package, and there are **no install scripts**, so it passes `strictDepBuilds` with no `allowBuilds` entry.
- pnpm's trust-policy check passed.

**Not verified locally:**
- macOS and Linux. GitHub's Ubuntu runners have no Secret Service, which is why CI there uses the `env-test` path.
- Whether GitHub's Windows runners can reach Credential Manager. The Windows CI leg of this PR answers that.

## Consequences

- One mechanism on all three OSes, and silent unlock that works even from an empty environment.
- **A native module ships with the product.** The design's single-file server bundle can't embed the `.node`
  binary. The plugin must ship `@napi-rs/keyring` and its platform package next to the bundle. ADR-0005 records how
  plugin installs are laid out.
- Loading adds about 10 ms to startup. Operations take 1–13 ms.
- Losing the keychain entry, for example on a new machine, means recovering with the code: `rto recover`.

## Fallback

1. **Windows only:** DPAPI through the hard-coded, existence-checked `powershell.exe`, the original draft. It needs no native
   module, but costs about 100–300 ms to launch PowerShell per unlock.
2. **Any OS:** passphrase unlock, using scrypt with `maxmem` raised to 256 MiB (the default `maxmem` fails at N=2^17) or
   PBKDF2 through WebCrypto. It's portable, but prompts every session.

The recovery code works in every configuration.
