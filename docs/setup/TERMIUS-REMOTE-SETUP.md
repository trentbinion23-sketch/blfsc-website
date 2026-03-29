# Termius Remote Setup

This repo now includes a one-shot Windows admin script:

- `setup-termius-remote.ps1`

What it does:

- installs the Windows OpenSSH Server capability if it is missing
- starts `sshd`
- sets `sshd` to start automatically
- enables the Windows firewall rule for TCP port `22`
- installs Tailscale if it is not already installed
- prints the Windows username, local IP, and Tailscale IP if available

## How to use it

1. Right-click `setup-termius-remote.ps1`
2. Choose `Run with PowerShell`
3. Approve the Windows administrator prompt
4. Let the script finish
5. If Tailscale opens or installs, sign in on the PC
6. Install Tailscale on your phone and sign in with the same account
7. Open Termius on your phone and add a host:
   - Protocol: `SSH`
   - Address: use the Tailscale IP for remote access from anywhere
   - Port: `22`
   - Username: your Windows username
   - Authentication: your Windows password for the first test

## Same-Wi-Fi only

If you only want access on the same local network, you can skip Tailscale and use the PC's local IPv4 address in Termius instead.

## Safer follow-up

The fastest first connection is password auth, but key auth is safer. Once the first connection works, generate an SSH key in Termius and add the public key to the Windows user's SSH authorized keys.
