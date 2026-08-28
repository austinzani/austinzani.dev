# austinzani.dev

Austin's personal site. Its largest domain is a long-running fantasy football league (Zak's League to Lose) — history, governance, and side competitions for the same group of people.

## Language

### League

**Manager**:
A person with a historical identity in the fantasy football league (the `manager` record). Exists independently of whether they have a login.
_Avoid_: User, player, member (for the record itself)

**Member**:
A manager with an authenticated login linked via a league membership. Members can access gated pages.

**Commissioner**:
The member role that can perform league administration. The only role above the default `manager` role.

**Constitution**:
The league's governing rulebook. Its canonical home is a page on this site; the historical Google Doc is superseded.
_Avoid_: Rules doc, bylaws

### Tour de Sport

**Tour de Sport**:
The league's multi-sport side competition: each participant is assigned one entity per sport, and entities' real-world results score points across a season.
_Avoid_: Side game, tourney, side-game

**Participant**:
A person playing a Tour de Sport season. Season 1 participants are exactly the 14 active managers; the concept allows non-managers in later seasons.
_Avoid_: Player, entrant

**Sport**:
One scored competition within a Tour de Sport season (e.g., NFL, F1, PGA). Season 1 has 12.
_Avoid_: League (collides with the fantasy league), category

**Entity**:
The real-world team or athlete a participant is assigned within one sport.
_Avoid_: Team (only teams in team sports; entities include drivers and golfers)

**Assignment**:
The pairing of one participant with one entity in one sport, produced by the draw.

**Draw**:
The live event that produces a season's assignments, executed by the commissioner one sport at a time in front of the league. Every participant has equal odds; assignments are balanced so portfolios are of roughly equal expected strength.
_Avoid_: Draft (collides with the fantasy football draft)

**Tier**:
A band of entities of similar expected strength within one sport, built from real-world standings. The draw balances portfolios by mixing tiers, and luck lives inside a tier.

**Season Lock**:
The commissioner action that freezes a season's tiers and RNG seed before the draw. After lock, the draw's outcome is verifiable; before it, nothing is drawable.

**Cutoff Date**:
The single per-season date that decides, for each sport, whether scoring reads live standings or the most recent completed season.
