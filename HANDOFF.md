# Times Tables Race — Handoff Document

**Purpose of this file:** paste/attach this document, the current app zip, and
the original uploaded game files zip into a **new chat** with Claude, and say
something like *"Continue building this project — read the handoff doc
first."* It contains everything needed to pick up exactly where this session
left off, without re-explaining the project from scratch.

---

## 1. What this project is

A classroom web app (teacher: the user; hosted on GitHub Pages at
`aurabotsubjects.github.io/MultDiv/`) that replaces a printed times-tables
practice booklet with:

- Real logins for **admin** (the teacher's boss/owner — one account), **teachers**
  (create classes + students), and **students** (practice games + a 1-minute test).
- A **25-level progression**: ×2–×12, mixed ×, ÷2–÷12, mixed ÷, then mixed everything.
- A library of **2-player games** where each player answers questions at
  *their own* level (not a shared one), practicing together on one device.
- A 1-minute, 20-question test — a perfect score notifies the teacher, who
  approves the student up to the next level.

No backend server — just static HTML/JS/CSS files (GitHub Pages) + Firebase
(Auth + Firestore, both free on the Spark plan).

## 2. Repo / deployment facts

- GitHub repo folder: `MultDiv` (user's GitHub Pages site)
- Live URL pattern: `https://aurabotsubjects.github.io/MultDiv/<file>.html`
  (GitHub Pages needs the exact `.html` extension in the URL — no automatic
  extension resolution)
- **Deployment gotcha we hit repeatedly this session:** uploading individual
  changed files one at a time led to mismatched versions (an HTML page
  importing a JS function that didn't exist yet in the deployed `.js` file,
  causing `SyntaxError: does not provide an export named 'X'`). **Always
  replace the entire folder contents with a fresh full zip rather than
  patching individual files.**
- Firebase project is already created and connected. `js/firebase-init.js` in
  the user's deployed copy has their **real config values** filled in
  (not the placeholders that ship in a fresh zip from this chat). **Do not
  overwrite that file with placeholder config** — if regenerating it, ask the
  user for their existing values first or tell them explicitly to re-paste
  their config after uploading.

## 3. Architecture summary

### Accounts (all real Firebase Auth users — no DIY password storage)

- **Admin**: one account, created manually once via Firebase Console
  (Authentication tab) + a matching Firestore doc at `users/{uid}` with
  `role: "admin"`. Signs in at `admin.html`.
- **Teacher**: self-signup at `teacher-signup.html` (name, email, password of
  their choosing) → creates a real Firebase Auth account immediately, but
  their `users/{uid}` doc gets `status: "pending"`. `admin.html` shows pending
  requests with Approve/Deny buttons (just flips `status` to `"approved"`/`"denied"`
  — no Auth changes needed since the account already exists). `teacher.html`
  login (`teacherLogin()` in `js/auth.js`) blocks anyone whose status isn't
  `"approved"`.
- **Student**: teacher creates them from `teacher.html` (name + password; a
  made-up email like `room12.maya@students.ttrace.app` is generated
  automatically from class code + name, purely so Firebase Auth has something
  to key off — students never see or type it). Students log in at `index.html`
  via class code → name dropdown → password.
- **"Worker app" trick** (`js/firebase-init.js` exports `workerApp`/`workerAuth`/`workerDb`
  alongside the primary `app`/`auth`/`db`): a second, independent Firebase
  session on the same page, used whenever someone needs to authenticate as a
  *different* user without losing their own session — teacher creating a
  student account, and Player 2 logging in during a 2-player game while
  Player 1 stays logged in on the primary session.

### Data model (Firestore)

```
users/{uid}            { role: 'admin'|'teacher'|'student', name, email?,
                          status? (teacher only: 'pending'|'approved'|'denied'),
                          classId? (student only), level? (student only, 1-25),
                          createdAt }
classes/{classId}       { teacherId, className, classCode, createdAt }
classRosters/{classId}  { className, students: [{uid, name, email}] }  — PUBLIC READ
                         (needed so the student-login name-dropdown works pre-auth)
notifications/{id}      { classId, studentId, studentName, level, score, total, status, createdAt }
testResults/{id}        { classId, studentId, studentName, level, score, total, passed, createdAt }
gameResults/{id}        { classId, gameId, gameName, weekId ('YYYY-MM-DD' of that week's
                           Monday), player1:{uid,name}, player2:{uid,name}, winnerUid,
                           winnerName, createdAt }  — one doc per completed 2-player game,
                           written by js/results.js. ONLY written for human-vs-human
                           matches (every game checks `!p2.isAI` before calling
                           recordGameResult) — vs-AI games never count. Powers
                           leaderboard.html (weekly top-3 per game + overall "most wins",
                           scoped to a classId, auto-"resets" each Monday since the page
                           only ever queries the current weekId — nothing is deleted).
```

Firestore security rules are documented in full in `README.md` inside the
project zip — **the user must manually paste these into Firebase Console →
Firestore → Rules**; they are not deployed automatically. A recent bug (a
teacher signup that "succeeded" per the error message but never appeared in
admin's pending list) was traced to these rules not being correctly pasted in,
which silently failed the Firestore profile-document write while the Auth
account creation itself still succeeded — leaving an "orphaned" Auth user.
**If troubleshooting a similar issue, always ask to see the current contents
of Firestore → Rules first.**

### Level engine (`js/levels.js`)

Single source of truth for level → question generation, imported by every
game and the test:
- Levels 1–11: ×2 through ×12
- Level 12: mixed multiplication (×2–×12 at random)
- Levels 13–23: ÷2 through ÷12
- Level 24: mixed division
- Level 25: mixed everything (× and ÷ combined)

`generateQuestion(level)` returns `{ text, a, b, symbol, answer }`.
`levelInfo(level)` returns `{ level, op, operand, label }` (e.g. `label: "×7"`, `"Mixed ÷"`).

### Reusable Player 2 login widget (`js/player2-login.js`)

`renderPlayer2Login(container, classId, excludeUid)` renders a name-dropdown +
password form into any container and resolves a Promise with `{uid, name, level}`
once Player 2 authenticates via the worker session. Used by Multiple Race and
Table Pong. Race Car Math implements the same pattern inline (see below) rather
than using this shared helper, since its setup screen has its own bespoke styling.

## 4. File map

```
tt-app/
  README.md                    ← full Firebase setup + security rules + deploy guide
  index.html                   ← student login (class code → name → password); has Teacher/Admin links in header
  teacher-signup.html          ← teacher self-signup (pending approval)
  teacher.html                 ← teacher login (status-checked) + dashboard (classes, students, notifications)
  admin.html                   ← admin login + pending teacher requests (approve/deny) + approved list
  menu.html                    ← student game hub, shows current level, links to all games + test
  test.html                    ← 1-minute/20-question test, auto-uses logged-in student's level
  css/style.css                ← shared dark "arcade" theme (Orbitron + Inter fonts)
  js/
    firebase-init.js           ← Firebase config (placeholders — user has real values on their deployed copy) + primary/worker app+auth+db exports
    auth.js                    ← all auth flows: student login (P1 + P2), teacher login/signup, admin login, account creation helpers
    db.js                      ← Firestore CRUD: classes, students, notifications, test results, teacher lists
    levels.js                  ← the 25-level engine, shared by every game + test
    player2-login.js           ← reusable Player-2-login widget for 2-player games
  games/
    multiple-race.html         ✅ DONE — pass-and-play board race to square 100
    pong.html                  ✅ DONE — landscape 2-player pong, quiz-gated paddle control
    race-car-math.html         ✅ DONE — real-time simultaneous racing; THE REFERENCE EXAMPLE this whole conversion was based on
    math-bubble-pop.html       ✅ DONE — pop the bubble with the right answer
    burst-your-bubble.html     ✅ DONE — personal 12-question trail, pop in order
    memory.html                ✅ DONE — flip a card, solve its equation
    pindrop.html                ✅ DONE — drop a pin into the correct answer zone
    base-attack.html            ✅ DONE — solve to buy units, real-time base-defense
    break-the-bank.html         ✅ DONE — safe-cracking dial input
    equations-drop.html         ✅ DONE — falling equations + attack mechanic (see note in section 5)
    speed-connect-4.html        ✅ DONE — Connect 4 gated by speed-solving
```

## 5. Games — conversion status

**All 11 games are now fully wired into the account/level system.** All have
`ready: true` in `menu.html`.

- ✅ **Multiple Race** (`games/multiple-race.html`) — pass-and-play board race to square 100
- ✅ **Table Pong** (`games/pong.html`) — landscape 2-player pong with quiz-gated paddle control
- ✅ **Race Car Math** (`games/race-car-math.html`) — real-time simultaneous racing; converted from the user's upload as the template for the rest
- ✅ **Math Bubble Pop** (`games/math-bubble-pop.html`) — pop the bubble with your answer; decoy bubbles now sample from the level engine so wrong answers stay plausible at division/mixed levels too (previously hardcoded to a multiplication-shaped decoy formula)
- ✅ **Burst Your Bubble** (`games/burst-your-bubble.html`) — personal trail of 12 questions to pop in order; originally built around "one full times-table, shuffled," replaced with a general "12 questions from the level engine, deduped by answer where possible" approach so it works for × / ÷ / mixed levels alike
- ✅ **Memory** (`games/memory.html`) — flip-and-solve card game (not classic pair-matching); straightforward swap of `table×factor` for `generateQuestion(level)`
- ✅ **Pin Drop** (`games/pindrop.html`) — straightforward conversion; also fixed a "play again" bug where the original referenced removed setup elements
- ✅ **Base Attack** (`games/base-attack.html`) — straightforward conversion; uses `location.reload()` for restart so no reset-bug risk
- ✅ **Break the Bank** (`games/break-the-bank.html`) — safe-cracking dial game; lowered `MIN_VAL` from 2 to 1 since division-level quotients can be as low as 1 (previously assumed a minimum product of 2×2=4)
- ✅ **Equations Drop** (`games/equations-drop.html`) — falling equations + an "attack" mechanic. **Worth knowing:** originally, attack buttons let a player pick a *specific opponent-table factor* to attack with (e.g. "send a ×7 at them"). That doesn't generalize to division/mixed levels, so attack buttons were simplified to generic 🚀 buttons that fire a random level-appropriate question at the opponent instead of a chosen one. If the user wants the "choose your attack" nuance back for straight ×/÷ levels specifically, that would need a bit more thought.
- ✅ **Speed Connect 4** (`games/speed-connect-4.html`) — straightforward conversion; also fixed a "play again"/quit bug where the original referenced removed picker elements

### Recurring bug pattern worth knowing about

Several of the original games had a "play again" or "quit to setup" button that
reset UI state by directly referencing the old manual-picker elements (grids,
name inputs). Since those elements were removed during conversion, this threw
runtime errors the first time someone tried to replay a match. **If further
changes are made to any game's setup screen, search for any reset/restart
handler and check it doesn't reference removed elements** — this bit us in
Memory, Pin Drop, and Speed Connect 4 (all now fixed); Base Attack and Break
the Bank were already safe.

### The conversion recipe (for reference / for any future new games)

1. Copy the original file into `games/`.
2. Change its `<script>` tag to `<script type="module">` and add at the very
   top (before any IIFE wrapper):
   ```js
   import { levelInfo, generateQuestion } from "../js/levels.js";
   import { getClassRoster, studentLoginSecondPlayer } from "../js/auth.js";

   const classId = sessionStorage.getItem("ttr_classId");
   if (!classId) window.location.href = "../index.html";
   const p1Uid = sessionStorage.getItem("ttr_uid");
   const p1Name = sessionStorage.getItem("ttr_name");
   const p1Level = parseInt(sessionStorage.getItem("ttr_level") || "1", 10);
   ```
3. Find the game's manual "pick your table" setup UI (usually a grid of
   buttons for 2–12, or two `<select>` elements). Replace it with:
   - A read-only readout for Player 1: `${p1Name} — ${levelInfo(p1Level).label}`
   - A small Player 2 login form (name `<select>` populated from
     `getClassRoster(classId)`, a password `<input>`, and a button that calls
     `studentLoginSecondPlayer(email, password)` and stores the resulting
     `{uid, name, level}`).
   - Gate the "Start" button on Player 2 having successfully logged in
     (instead of on both tables being picked).
4. Find wherever the game generates a question — usually something like
   `const a = table; const b = randInt(1,12); answer = a*b;` — and replace
   it with:
   ```js
   const q = generateQuestion(player.level);
   // use q.text for display, q.answer for checking the answer
   ```
5. Replace any hardcoded `"×" + table + " table"` labels/messages with
   `levelInfo(player.level).label` (since levels can now be division or mixed,
   not just a fixed multiplication table).
6. Test it standalone by manually setting `sessionStorage` values in the
   browser console (`ttr_classId`, `ttr_uid`, `ttr_name`, `ttr_level`) so you
   can load the page without going through the full login flow every time.
7. In `menu.html`, flip that game's `ready: false` → `ready: true`.

Race Car Math (`games/race-car-math.html`) is real-time/simultaneous (both
players answer at once). Multiple Race and Table Pong are turn-based. The
other 8 games are a mix — check each one's structure before assuming which
pattern it follows.

## 6. Known issues / things to watch for

- **GitHub Pages needs exact `.html` extensions in URLs** — `/admin` won't
  resolve, `/admin.html` will.
- **Orphaned Firebase Auth accounts**: if a signup's Firestore write fails
  (usually due to security rules not being pasted in correctly) but the Auth
  account creation succeeded, the user is stuck — signup says "email already
  registered," but sign-in fails and admin never sees a pending request. Fix:
  delete the user in Firebase Console → Authentication → Users, verify
  Firestore rules are correctly published, then redo the signup.
- **Practice games don't currently save results to Firestore** — only the test
  does (since that's what drives level-ups). Intentional scope decision, not a bug.
- **Class codes and the `classRosters` collection are publicly readable**
  (no auth required) — necessary so the pre-login name dropdown works. Everything
  else (passwords, which Firebase Auth handles, and levels/test results) is
  properly access-controlled per the security rules in `README.md`.

## 7. Suggested next steps (in likely priority order)

1. **Playtest all 11 games end-to-end** with real logins (two real student
   accounts, both players logging in) — the conversions are syntax-checked
   and logically reviewed, but haven't been click-tested in a live browser
   against real Firebase data. Pay particular attention to "play again"/rematch
   flows given the bug pattern noted above.
2. Consider whether Equations Drop's simplified attack buttons (see note
   above) need the "choose your attack factor" nuance restored for straight
   ×/÷ levels.
3. Consider adding practice-session logging (optional) if the teacher wants
   visibility into practice activity, not just test results.
4. Consider a "forgot password" flow for students/teachers (not built —
   Firebase Auth supports this but it requires email delivery to work, which
   is untested for the synthetic student emails).
5. Revisit whether class codes truly need to be public, or whether a lookup
   Cloud Function would be worth the added complexity if this ever needs
   tighter security (would require moving off the free Spark plan).
