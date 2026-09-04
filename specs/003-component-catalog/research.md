# Research: 003-component-catalog

## Decisions

### Catalog pagination

- **Decision**: Server-driven pagination, 50 items per page.
- **Rationale**: Predictable URLs, easy integration tests, and performs well for 1,000 components. Infinite scroll is more complex and not needed for the dashboard list.
- **Alternatives considered**: Infinite scroll (rejected for test complexity and URL state).

### Search strategy

- **Decision**: Case-insensitive prefix search on `name` and `slug`; case-insensitive exact match on `externalId`.
- **Rationale**: Fast with B-tree indexes; covers the common "find by name" pattern. Substring/fuzzy would require trigram or full-text indexing and is overkill for v1.
- **Alternatives considered**: Substring `LIKE` (rejected for index inefficiency), fuzzy search (deferred to v2).

### ComponentGroup membership

- **Decision**: A `Component` belongs to at most one `ComponentGroup` via a `componentGroupId` foreign key.
- **Rationale**: Simpler schema, enough for v1 grouping of equivalent assets. Many-to-many can be added later if needed.
- **Alternatives considered**: Junction table (rejected for v1 complexity).

### Multi-value filter semantics

- **Decision**: OR within the same dimension, AND across dimensions.
- **Rationale**: Standard faceted search behavior; matches user expectations for category checkboxes and combined provider/category filters.

### ComponentGroup lifecycle

- **Decision**: `ComponentGroup` has `ACTIVE`/`RETIRED` lifecycle, like `Component`. `RETIRED` groups are hidden by default and their components are treated as ungrouped in the default catalog view.
- **Rationale**: Consistent lifecycle model and allows archiving without deletion.

### New importers

- **Decision**: Implement six remaining v1 importers (AWS, Azure, Kubernetes, Web URL, API URL, MCP server) using the existing `Importer` contract and `SecretResolver` from 002.
- **Rationale**: The 002 framework provides the generic harness; each importer only needs provider-specific discovery and `DiscoveredAsset` mapping.

## Open Questions

None remaining. All clarifications were resolved during `/speckit-clarify`.
