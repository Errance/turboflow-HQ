# VPN Technical Asset

This directory stores the sanitized internal VPN guide and non-secret supporting assets.

The live OpenVPN profile is local-only because it contains embedded key material:

```text
ops/private/vpn/tf-internal-vpn.ovpn
```

Do not commit `.ovpn` profiles or private credentials.
