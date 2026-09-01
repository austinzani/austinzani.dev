/**
 * The league Constitution — its canonical home.
 *
 * Migrated from the historical Google Doc, which this page supersedes.
 * Amendments are made by editing the markdown below; git history is the
 * amendment record.
 *
 * The markdown is kept as a plain template literal so the constitution can
 * be bundled and rendered anywhere. If an amendment ever needs a backtick
 * or "${", escape it (\` or \${).
 *
 * "{{CHAMP}}" marks the reigning champion's first name — the league is named
 * after whoever holds the title. Render via getConstitutionMarkdown().
 *
 * Rendered members-only at /fantasy_football/constitution.
 */
const constitutionTemplate = `# {{CHAMP}}’s League to Lose League Constitution

## [1.0 LEAGUE OVERVIEW]

Welcome to {{CHAMP}}’s League to Lose. This is a 14-team league that was formed in 2010 by a group of owners at the University of Cincinnati. This league is considered a money league, and all owners are expected to pay their league fee before the draft begins. This league is designed to be a competition between owners, but it is not a cut-throat league where anything goes. The rules described below are designed to act as a guideline for overall league play, and any disputes will be handled by discussion in the league chat but ultimately by the commissioner Austin Zani. Please remember that the overall goal of this league is to have fun and enjoy the game.

### [1.2 Living Constitution]

It is important to note that this is a living, breathing constitution that will change and evolve over the lifetime of this league. Changes will happen between seasons at our annual town hall meeting unless otherwise deemed necessary. If you have suggestions for changes, please raise any questions to the commissioner or save them for the League Town Hall every spring.

## [2.0 LEAGUE FINANCING]

The league fee will be charged to each team owner, payable to the commissioner on or before the night of the draft. If a team owner does not have the appropriate entry fee, the commissioner may make other arrangements for payment before the season starts at their discretion.

### [2.1 League Fee]

The league fee for the 2021 season will be $100 from each owner. There will also be a 25 cent cost per transaction that will be collected at the end of the season. Owners who do not pay their fee will have their balance deducted from any prize money that they win and will be forced to pay any outstanding balance before the start of the following season or they will not be invited back.

### [2.2 Prize Money]

League prize money will be paid out within one month of the completion of the league Championship. Money will be held in a bank account owned by the commissioner and will be paid out in the following manner:

* League Champion receives $770
* League Runner-Up received $200
* League Playoff Third Place $50
* League Regular Season Champion $100
* High Point for each regular season matchup $20
* Transaction Fees split as follows:
  * 75% to Champ
  * 25% to Runner-Up

## [3.0 LEAGUE SETUP AND COMPETITION]

{{CHAMP}}’s League to Lose will consist of 14 different teams. The schedule will be randomly generated, with each team playing every other team at least once in head-to-head match-up.

### [3.1 Playoffs]

After the completion of the regular season, the top six teams will make the playoffs. The seventh playoff spot will be awarded to the top point scorer out of the remaining 8 teams, regardless of their record. The playoffs begin in week 15 and the top seed will be awarded a bye in the first round. After the first round the overall one seed has the ability to choose any of the remaining 3 teams to play in the semifinals.

### [3.2 Toilet Bowl]

After the completion of the regular season, any teams that do make the playoffs will be entered in a toilet bowl bracket. This bracket will seed based on each team's record and the loser of each matchup will continue on in the bracket. The team that fails to win a matchup in the toilet bowl will be the loser of the league and will be responsible for paying the fee to have the trophy engraved for that year's winner.

## [4.0 ROSTERS AND LINEUPS]

Rosters will consist of 17 active players from any NFL team. There are no position limits, and owners are free to have as many players from any position as they like. Only players from the active roster may be used as part of a team's starting lineup. There is one injured reserve slot on each roster that can be used for players that are on IR.

### [4.1 The Draft]

The league will designate a draft night each season. Owners are encouraged to attend the draft in person, and must have all league fees paid before the draft. The draft order will be determined by a competition decided by the league in the offseason. The draft will be a serpentine order, where the person with the first pick in Round 1 will have the last pick in Round 2 and the first pick in Round 3.

### [4.2 Free Agency]

Free Agency will be conducted on a first come, first served basis unless a player is on waivers. Waivers will be decided through an auction process in which the tie breaker will be given to the lower seeded team. Each team will be given $100 at the beginning of the season for their Free Agent Auction Budget (FAAB). This budget can be used to bid on free agents or used in trades and once it is gone you can only bid $0 on waiver claims. Players who are dropped will be placed on waivers for 2 days to allow all league members a fair chance at placing a waiver claim. Once the season begins and a players game has started they will be on waiver until the following Wednesday at 12:05 AM PST.

### [4.3 Trades]

Trading is allowed and may be conducted between any owner. Trades may include multiple players from any position, as well as FAAB. No trades will be allowed after Week 11 of the fantasy football season. If players want to push a trade through they must ask the commissioner and then it will be put to a veto vote by the league. League members will have 5 hours or until 6:30PM (whichever allows more time for votes to be cast) to submit their vote to veto before the trade is pushed through.

#### [4.3.1 Trade Veto]

The commissioner reserves the right to reverse any trade that they deem inconsistent with league competition and fair-play standards. This veto should only be invoked in extreme cases where it is obvious that one owner is trying to give another owner an unfair advantage. The owners in question may offer reasons why the trade should be allowed, but the final decision is put to a league vote. A veto vote will only be conducted if the league member who has issue with the trade creates a poll in GroupMe to put it to a vote. They should set the poll to expire 5 hours later or at 6:30 PM that day (whichever allows more time for votes to be cast). For a veto to be successful it must be passed by 8 of 14 league members.

### [4.4 Starting Lineups]

Starting lineups in the league will consist as follows:

* 1 quarterback
* 2 running backs
* 2 wide receivers
* 1 tight end
* 2 flex (running back, wide receiver, or tight end)
* 1 Kicker
* 1 defense / special teams

Owners must set their starting lineup each week. Players may be added or removed from the starting lineup up until the start of their NFL game at which time the players status will be locked.

Sleeper’s auto-substitution feature is enabled for the league. Owners may configure auto-subs so that a starter who is declared inactive is automatically replaced by an eligible bench player at kickoff.

#### [4.4.1 Position Designations]

From time to time, the NFL may change their designation of a particular player from one position to another or a player may line up in multiple positions throughout the game. For example, a wide receiver may be switched to a tight end and vice versa. For the purposes of this league, a players designation will be dictated by the Sleeper app in which our league is conducted.

## [5.0 SCORING SYSTEM]

Scoring will be computed to two decimal places. This will allow points to be awarded or deducted for every positive or negative yard and will dramatically reduce the chance of a tie game. Players are awarded fantasy points for each week that they are included in the team's starting lineup. Players may only start at one position in any given week and will only be awarded points as described by their position distinction below.

### QB / RB / WR / TE Scoring

* 0.1 points for every rushing yard (-0.1 points for each negative rushing yard)
* 0.1 points for every receiving yard (-0.1 points for each negative receiving yard)
* 0.04 points for every passing yard (-0.04 points for each negative passing yard)
* 6.0 points for each non passing touchdown scored (rushing, receiving, fumble recovery, or kick return)
* 4.0 points for each passing touchdown
* 2.0 points for every 2-point conversion pass
* 2.0 points for every 2-point conversion run or reception
* -2.0 points for every interception thrown
* -2.0 points for every fumble that is recovered by the other team (lost)

### K Scoring

* 1.0 points for every extra point made
* 0.1 points for every yard of a field (ex: 35 yard field goal will receive .5 additional points)
* -1.0 points for every missed extra point
* -1.0 points for every missed field goal

### Defense / Special Teams Scoring

* 2.0 points for every interception and fumble recovery
* 1.0 points for every sack recorded
* 2.0 points for every safety recorded
* 2.0 points for every blocked kick
* 2.0 points for every 4th down stop
* 6.0 points for each touchdown scored (fumble recovery or kick return)

### Defense Points Allowed Scoring

| 0 | 1-6 | 7-13 | 14-20 | 21-27 | 28-34 | 35+ |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 10 | 4 | 3 | 1 | 0 | -1 | -4 |

### Defense Yards Allowed Scoring

| < 100 | 101-199 | 200-299 | 300-349 | 350-399 | 400-449 | 450-499 | 500-549 | 550+ |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 5 | 3 | 2 | 0 | -1 | -3 | -5 | -6 | -7 |

### [5.1 Point Totals and Final Scores]

The League will be hosted on [Sleeper](https://sleeper.app/). Head to head scoring will be determined each week by the stats from that website. From time to time, the NFL may go back and change the scoring of certain plays later in the week. [Sleeper](https://sleeper.app/) will set these scores retroactively. However, to maintain a sense of fairness and avoid confusion in the league, all head-to-head scoring will be resolved as of Tuesday at noon Eastern. Any scoring changes that come out from the NFL after that time will not be applied to the league.

### [5.2 Tiebreaker]

In the event of a tie for a matchup any given week the tiebreaker will be decided by the team with the highest bench points.

## [6.0 OFFSEASON ACTIVITIES]

On the Saturday of each NFL Draft weekend we will host our Annual League Town Hall meeting. This is the one day every year that we will make major rule changes for the league. Any rule changes will be put to a league vote and must be passed by 9 of 14 teams in the league.

Vice Commish is decided every year at the draft by a physical competition between all interested participants. Competition events are physical in nature, not to exceed 8, and each interested participant must submit an equal amount of events. Competition is decided by average placement in all events. Prior to starting completion, all interested participants must shotgun 2 beers. Current Vice Commish MUST participate every year.

## [7.0 TRADITIONS AND PUNISHMENTS]

### [7.1 Breakfast of Champions]

On draft morning, any owner who has won a league championship prepares their plate first and sits at the main table. Every owner without a ring eats at a folding table with folding chairs.

### [7.2 Last-Place Hot Dog Punishment]

The last-place finisher of the regular season must eat hot dogs for every meal, documented for the group, until they have eaten as many hot dogs as Joey Chestnut ate in that year’s Nathan’s Famous 4th of July Hot Dog Eating Contest.

### [7.3 Destination Draft]

The draft may be held outside the tri-state area in some years (e.g. Las Vegas, a preseason NFL game, a cruise). As with Hocking Hills years, attendance is encouraged but not required. When a destination draft is planned, the destination is chosen separately by the league.
`;

/**
 * The constitution with the reigning champion's first name filled in.
 * Falls back to "Zak" (matching the league shell's hero copy) when the
 * champion isn't known.
 */
export function getConstitutionMarkdown(champFirstName: string | null): string {
  return constitutionTemplate.replace(/\{\{CHAMP\}\}/g, champFirstName ?? "Zak");
}
