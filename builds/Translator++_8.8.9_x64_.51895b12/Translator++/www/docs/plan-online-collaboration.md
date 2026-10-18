## Plan: Real-time Team Collaboration for Translator++ (`.trans` over network)

### Recommendation summary

Use **simple WebSocket over LAN/network directory**, not WebRTC, for the first implementation.

Translator++ is an NW.js desktop app with Node access, and the codebase already has a working WebSocket server wrapper at:

- `www/addons/basicUtils/utils/RemoteManagementServiceWs.js`

That makes WebSocket much easier than WebRTC because:

- no signaling server is needed;
- no ICE/STUN/TURN/NAT complexity;
- LAN/network-share discovery can be done with a small lock/presence file beside the `.trans` file;
- server-authoritative editing is much simpler to reason about;
- the existing `RemoteManagementServiceWs` already supports client tracking, broadcast, request/response scopes, ping/pong, and service reuse.

WebRTC is better for internet peer-to-peer, but for “a `.trans` file saved in a network directory” it adds unnecessary complexity.

---

## Goal

Make Translator++ support **Google-Sheets-like live team editing** for a `.trans` file located in a shared/network directory.

The collaboration model should be:

1. The `.trans` project stores collaboration settings in `trans.project.config`.
2. A user can enable network collaboration and toggle “Start serving”.
3. When a collaborator opens a `.trans` with collaboration enabled:
   - if no active server exists, this Translator++ instance becomes the server;
   - if a server exists, this instance joins as a client;
   - if the server disappears, clients can elect/promote a new server.
4. Cell changes are synchronized live between team members.
5. The `.trans` file remains the authoritative project file for compatibility, but should not be blindly written by multiple machines at the same time.

---

## Relevant existing integration points

### `.trans` project config

`www/js/trans.js` already has project-level config helpers:

```js
Trans.prototype.getConfig = function(key) { ... }
Trans.prototype.setConfig = function(key, value) { ... }
```

So collaboration settings can be embedded directly into the `.trans` file under something like:

```js
trans.project.config.networkCollaboration = {
  enabled: true,
  protocol: "ws",
  hostMode: "auto",
  port: 22883,
  allowAutoHost: true,
  projectId: "...",
  sessionId: "..."
}
```

This matches your “trans file has a flag and setting for network collaboration” requirement.

### Open/save hooks

`Trans.prototype.open()` and `Trans.prototype.save()` exist in `www/js/trans.js`.

The collaboration addon should avoid modifying core initially. It can hook through addon startup and monkey-patch lightly if needed, but best first step is addon-level lifecycle:

- on addon `loaded`, wait for `window.trans`;
- listen for known events like `projectCreated` / open-complete equivalents where available;
- otherwise wrap `trans.open` once to run `maybeAutoJoinCollaboration()` after successful open.

### Cell change hook

Translator++ already emits:

```js
trans.trigger("afterCellChange", [changes, source]);
```

and existing code uses:

```js
trans.on("afterCellChange", ...)
```

This is the most important live-collab hook. A collaboration client/server can listen to it and publish cell edits.

### Existing WebSocket utility

`RemoteManagementServiceWs.js` already provides:

- server start/stop;
- connected clients map;
- `sendToClient()`;
- `broadcast()`;
- `expectResponse()` / scoped request-response;
- ping/pong handling;
- capability discovery helpers.

It should be expanded or wrapped rather than replaced.

---

## Proposed architecture

Create a new addon, or extend the existing collaboration addon, with modules like:

```txt
www/addons/networkCollaborativeTranslation/
  package.json
  networkCollab.js
  src/
    NetworkCollabManager.js
    CollaborationServer.js
    CollaborationClient.js
    PresenceFile.js
    OperationLog.js
    ProjectState.js
    LockManager.js
  ui/
    networkCollabSettings.html/js, or JSONForm-based settings
```

If we want to reuse `gitCollaborativeTranslation`, I recommend keeping this separate because Git collaboration is asynchronous while this feature is real-time/session-based.

---

## Core idea: server-authoritative model

Do **not** let every user save the same `.trans` file independently.

Instead:

- one Translator++ instance is the **session server / leader**;
- all other users are **clients**;
- clients send edit operations to the server;
- server validates, orders, applies, and broadcasts operations;
- only the server writes `.trans` periodically or on explicit save;
- clients may keep local temp/autosave copies, but should not overwrite the shared `.trans` while joined as clients.

This is much safer than every machine writing the same network file.

---

## Server discovery using network directory

Beside the `.trans` file, create a small collaboration presence file:

```txt
project.trans
project.trans.collab.json
project.trans.collab.lock
project.trans.collab.log.jsonl   optional
```

Example `project.trans.collab.json`:

```json
{
  "version": 1,
  "enabled": true,
  "projectId": "abc123",
  "sessionId": "2026-05-12T05:40:00Z-host-guid",
  "server": {
    "host": "192.168.1.20",
    "port": 22883,
    "userId": "donov-pc-9f2d",
    "userName": "Donov",
    "startedAt": 1778564400000,
    "lastHeartbeat": 1778564420000
  },
  "clients": {
    "client-guid": {
      "userName": "Translator A",
      "lastSeen": 1778564420000
    }
  }
}
```

### Discovery workflow

When opening a `.trans` with collaboration enabled:

1. Read `trans.project.config.networkCollaboration`.
2. If disabled, do nothing.
3. Locate the sidecar presence file next to `trans.currentFile`.
4. If presence file exists:
   - check `server.lastHeartbeat` freshness;
   - attempt WebSocket connection to `ws://host:port`;
   - if connection succeeds: join as client;
   - if connection fails or heartbeat expired: try to become server.
5. If presence file does not exist: try to become server.

### Heartbeat timeout

Recommended values:

- server writes heartbeat every `2–5 seconds`;
- clients consider server stale after `15–30 seconds`.

---

## Leader election / becoming server

The hardest part is preventing two users from becoming server at the same time.

Use a simple lock file strategy:

```txt
project.trans.collab.lock
```

When trying to become server:

1. Attempt exclusive creation of lock file using Node `fs.open(lockPath, 'wx')`.
2. If success:
   - start WebSocket server;
   - write presence file with host/port/session info;
   - keep heartbeat active;
   - hold lock or refresh lock metadata.
3. If failed:
   - wait random jitter `200–1000ms`;
   - re-read presence file;
   - try joining the server.

If the server crashes, the lock file may remain. Therefore the lock file should include stale metadata and be considered breakable if:

- heartbeat is stale;
- WebSocket connection fails;
- lock timestamp is older than threshold.

Because network filesystems vary, this should be treated as “best effort”. The WebSocket connection test is the final authority.

---

## WebSocket protocol

Wrap/extend `RemoteManagementServiceWs` with a collaboration-specific protocol.

### Message envelope

Use a consistent JSON envelope:

```json
{
  "type": "op",
  "projectId": "abc123",
  "sessionId": "session-guid",
  "clientId": "client-guid",
  "opId": "client-guid:42",
  "seq": 120,
  "timestamp": 1778564420000,
  "payload": {}
}
```

### Important message types

#### Client → server

- `join`
- `leave`
- `op:cellChange`
- `op:selectionChange` optional
- `chat` optional
- `requestSnapshot`
- `ping`

#### Server → client

- `welcome`
- `snapshot`
- `opAccepted`
- `opRejected`
- `opBroadcast`
- `presenceUpdate`
- `lockUpdate`
- `serverShutdown`
- `pong`

---

## Edit operation format

Translator++ Handsontable change events are usually arrays like:

```js
[row, prop, oldValue, newValue]
```

But for collaboration we should not rely only on visible row indexes. We need stable identity:

```json
{
  "kind": "cellChange",
  "fileId": "Map001.json",
  "row": 123,
  "col": 1,
  "oldValue": "old translation",
  "newValue": "new translation",
  "baseRevision": 119
}
```

Better version:

```json
{
  "kind": "cellChange",
  "fileId": "Map001.json",
  "rowId": "123",
  "key": "original Japanese text",
  "col": 1,
  "oldValue": "old translation",
  "newValue": "new translation",
  "baseRevision": 119
}
```

Use both `rowId` and `key` for safety.

When the server applies an edit:

1. Check project/session matches.
2. Check file and row exist.
3. Optionally check current value equals `oldValue` or base revision.
4. Apply to server’s `trans.project.files[fileId].data[rowId][col]`.
5. Increment global revision.
6. Broadcast to all clients except origin.
7. Append to operation log.
8. Mark project dirty and schedule save.

---

## Handling conflicts

For version 1, avoid full CRDT/OT. Translation tables are mostly independent cells, so a simple policy is enough.

Recommended policy:

### Different cells

Always merge automatically.

### Same cell edited simultaneously

Use server ordering:

- first accepted edit wins initially;
- second edit is accepted if based on latest revision or if user confirms;
- otherwise server returns `opRejected` with current value.

Client can show:

> “This cell was changed by User B. Overwrite?”

Possible conflict policies setting:

```js
networkCollaboration.conflictPolicy = "server-order" | "ask" | "last-write-wins"
```

Default should be `server-order` with visible warning for same-cell conflicts.

---

## Applying remote changes in the UI

When a client receives `opBroadcast`:

1. Set a local flag like `isApplyingRemote = true`.
2. Apply to `trans.project.files[fileId].data[rowId][col]`.
3. If currently selected file matches `fileId`, update Handsontable:
   ```js
   trans.grid.setDataAtCell(rowId, col, newValue, "networkCollabRemote")
   ```
4. Clear flag.
5. Ensure `afterCellChange` handler ignores source `networkCollabRemote` to avoid echo loops.

Pseudo-code:

```js
trans.on("afterCellChange.networkCollab", (e, changes, source) => {
  if (!networkCollab.active) return;
  if (source === "networkCollabRemote") return;
  if (networkCollab.isApplyingRemote) return;

  networkCollab.sendLocalChanges(changes, source);
});
```

---

## Save strategy

Only the server writes the shared `.trans` file.

Recommended:

- server saves every `30–120 seconds` if dirty;
- server saves on manual save;
- server saves when last client leaves;
- server saves on graceful shutdown.

Clients should either:

- disable normal save while joined as client; or
- save only to a local recovery file such as:

```txt
.tpp-collab-recovery/<userId>/project.trans
```

When a client presses Ctrl+S, show:

> “You are joined to a collaboration session. The server saves the shared project. Save a local recovery copy instead?”

This prevents network-share corruption.

---

## UI/UX plan

Add a collaboration panel/menu:

### Project Collaboration Settings

Fields:

- Enable network collaboration: checkbox
- Mode:
  - Auto host/join
  - Always host manually
  - Always join manually
- Port: default `22883`
- Bind host:
  - `0.0.0.0` for server
  - detected LAN IP shown to users
- User display name
- Conflict policy
- Auto-save interval
- Start serving toggle
- Stop serving button
- Join server button
- Current session status

### Status indicator

In the status bar or toolbar:

- Offline
- Hosting: `192.168.1.20:22883`, 3 clients
- Joined: connected to Donov-PC
- Reconnecting
- Conflict on current cell

### Presence display

Show active users:

```txt
Donov       Host       editing Map001 row 12
TranslatorA Client     editing CommonEvents row 88
TranslatorB Client     idle
```

Selections/cursors can be added after basic editing works.

---

## How to expand `RemoteManagementServiceWs.js`

Do not put all collaboration logic inside `RemoteManagementServiceWs` itself. Keep it generic.

Recommended improvements to the utility:

1. Add a matching WebSocket client helper, e.g.
   ```txt
   www/addons/basicUtils/utils/RemoteManagementClientWs.js
   ```
2. Add JSON message validation/helper methods.
3. Add optional auth token/session token support.
4. Add `broadcastExcept(clientId, ...)`.
5. Add structured event names for parsed messages:
   - `message:join`
   - `message:op`
   - `message:requestSnapshot`
6. Reduce noisy console logs behind a debug option.

Then implement collaboration as a consumer:

```js
const RemoteManagementServiceWs = require("www/addons/basicUtils/utils/RemoteManagementServiceWs.js");

class CollaborationServer {
  constructor(project, options) {
    this.ws = new RemoteManagementServiceWs(options);
  }
}
```

---

## Security model

Because this is LAN/network-share oriented, start simple but avoid being fully open.

Add to presence file:

```json
{
  "joinTokenHash": "..."
}
```

Store the real token inside `.trans` config or generate per session.

On join:

```json
{
  "type": "join",
  "payload": {
    "projectId": "abc123",
    "userName": "Translator A",
    "token": "plain-session-token"
  }
}
```

Server validates token before sending snapshot.

At minimum, restrict by:

- project ID;
- session ID;
- optional token;
- same `.trans` file path hash.

---

## Implementation phases

### Phase 1 — Proof of concept

Deliverables:

- Add project config flag under `trans.project.config.networkCollaboration`.
- Add settings UI with enable/disable and start/stop serving.
- Start WebSocket server using `RemoteManagementServiceWs`.
- Write/read presence sidecar file.
- Auto-host if no server exists.
- Auto-join if server exists.
- Send full project snapshot to joining clients.

Success criteria:

- Two Translator++ instances on LAN can open the same network `.trans`.
- One becomes host, the other joins.
- Joined client receives current project snapshot.

### Phase 2 — Live cell sync

Deliverables:

- Listen to `trans.on("afterCellChange")`.
- Convert Handsontable changes to cell ops.
- Server orders and broadcasts ops.
- Clients apply remote ops without echo loops.
- Basic status indicator.

Success criteria:

- Editing a translation cell on one machine updates the same cell on the other machine.
- Remote edits do not trigger infinite broadcast loops.

### Phase 3 — Save ownership and safety

Deliverables:

- Server-only save policy.
- Client save interception/recovery copy.
- Server auto-save timer.
- Server graceful shutdown message.
- Stale heartbeat detection.

Success criteria:

- Only host writes the shared `.trans`.
- Client Ctrl+S does not corrupt/overwrite the shared file.
- If host closes cleanly, another user can become host.

### Phase 4 — Conflict handling and locks

Deliverables:

- Same-cell conflict detection.
- Row/cell soft locks.
- Presence display showing who is editing what.
- Conflict prompt or last-write policy setting.

Success criteria:

- Two users editing the same cell get deterministic behavior and visible feedback.

### Phase 5 — Robustness

Deliverables:

- Operation log sidecar `.jsonl`.
- Reconnect support.
- Incremental catch-up by revision.
- Snapshot checksum.
- Crash recovery from operation log.

Success criteria:

- A disconnected client can reconnect and catch up without reopening project.
- Host crash does not lose recent accepted operations beyond a small window.

---

## Main risks and mitigations

### Risk: network share file locking differs by OS/NAS

Mitigation:

- use WebSocket as source of truth during session;
- use sidecar lock only for leader election;
- verify server by actual WebSocket connection.

### Risk: duplicate hosts

Mitigation:

- exclusive lock file creation;
- randomized backoff;
- heartbeat freshness;
- project/session ID validation;
- if two hosts detected, choose deterministic winner, e.g. oldest `startedAt` or lowest `serverId`.

### Risk: row indexes shift

Mitigation:

- include `fileId`, `rowId`, and source `key` in every operation;
- for v1, restrict structural operations like add/remove row while collaborating;
- support structural operations later as explicit op types.

### Risk: save corruption

Mitigation:

- server-only shared save;
- clients save recovery copies only;
- server writes via temp file + atomic rename if compatible.

---

## WebRTC vs WebSocket decision

### WebSocket: recommended

Best for this feature because:

- simple client/server model;
- already partly implemented;
- works well on LAN;
- easier authority, ordering, save ownership;
- easier debugging;
- no external infrastructure.

### WebRTC: not recommended for v1

WebRTC would require:

- signaling layer anyway;
- peer discovery;
- NAT traversal/STUN/TURN if not same LAN;
- harder leader election;
- harder multi-peer consistency.

Use WebRTC only later if you want internet peer-to-peer collaboration without a central server.

---

## Final proposed direction

Build **Network Collaborative Translation** as a WebSocket-based addon with:

- `.trans` embedded config via `trans.setConfig()`;
- sidecar presence/lock files next to the network `.trans`;
- automatic host/join behavior;
- server-authoritative operation ordering;
- live cell updates through `afterCellChange`;
- server-only saving;
- optional integration with the existing Git collaboration addon for async/history backup later.

This gives the closest “Google Sheet editing” experience while fitting Translator++’s current architecture.