### ADR-002 — License: Apache 2.0

**Context**: The tool imports from proprietary platforms (AWS, Azure, GitHub)
and may be wrapped into commercial offerings.

**Decision**: **Apache 2.0.** Patent grant, commercial-friendly, matches the
ecosystem (Backstage, cartography, Steampipe, Kubernetes).

**Rationale**: Maximizes adoption and contributor growth. The patent grant
matters because we interface with proprietary platforms. AGPL's network-service
clause chases away enterprise self-hosters with blanket AGPL bans. If a hosted
offering is built later, it's licensed separately — the OSS core stays Apache 2.0.