# YT Jam — System Design

## 1. High-level architecture

```mermaid
flowchart TB
    subgraph Clients
        Browser["Browser (React SPA)<br/>GitHub Pages"]
        Companion["Electron Companion App<br/>(transparent overlay)"]
    end

    subgraph Backend["Self-hosted backend (personal machine)"]
        Tunnel["Cloudflare Tunnel<br/>(public HTTPS endpoint)"]
        Node["Node + Express + Socket.IO"]
        RoomMgr["roomManager.js<br/>in-memory room state"]
        Genre["genreClassifier.js<br/>(JS inference, no Python)"]
    end

    subgraph External
        YT["YouTube Data API v3"]
        GH["GitHub Actions + Pages"]
    end

    Browser <-- "WebSocket (Socket.IO)" --> Tunnel
    Companion <-- "WebSocket (Socket.IO)" --> Tunnel
    Tunnel <--> Node
    Node --> RoomMgr
    Node --> Genre
    Node -- "REST (server-side search)" --> YT
    Browser -- "REST (deep link)" --> Companion
    GH -- "deploys" --> Browser
```

**Why this shape:** Socket.IO needs a long-lived, stateful connection, which rules out serverless/Lambda. Every free host with persistent WebSocket support now wants a card on file (or has shut down, in Glitch's case) — so the backend runs on a personal machine and is exposed publicly through a Cloudflare Tunnel, with automation to survive the resulting URL instability (see §6).

---

## 2. Component breakdown

```mermaid
flowchart LR
    subgraph Client["client/ (React + Vite)"]
        App["App.jsx"]
        RoomCtx["RoomContext.jsx<br/>(all room state)"]
        Lobby["Lobby.jsx"]
        Room["Room.jsx"]
        Player["Player.jsx<br/>(YT IFrame + sync)"]
        Queue["Queue.jsx / QueueItem.jsx<br/>(drag-and-drop)"]
        Chat["Chat.jsx"]
        GenreSprite["GenreSprite.jsx"]
        Participants["Participants.jsx"]
    end

    App --> RoomCtx
    RoomCtx --> Lobby
    RoomCtx --> Room
    Room --> Player
    Room --> Queue
    Room --> Chat
    Room --> GenreSprite
    Room --> Participants
```

```mermaid
flowchart LR
    subgraph Server["server/ (Node)"]
        Index["index.js<br/>(Express + Socket.IO bootstrap)"]
        Handlers["socketHandlers.js<br/>(all socket event logic)"]
        Manager["roomManager.js<br/>(room CRUD, disconnect grace period)"]
        YTApi["youtubeApi.js<br/>(search + caching)"]
        Classifier["ml/genreClassifier.js<br/>(TF-IDF + LogReg inference)"]
    end

    Index --> Handlers
    Handlers --> Manager
    Index --> YTApi
    Handlers --> Classifier
```

```mermaid
flowchart LR
    subgraph Companion["desktop-pet/ (Electron)"]
        Main["main.js<br/>(BrowserWindow, protocol handler,<br/>single-instance lock)"]
        PetHtml["pet.html / pet.js<br/>(renderer: sprite + chat overlay)"]
    end
    Main --> PetHtml
```

---

## 3. Data model — room state (in-memory, keyed by 6-char room code)

```mermaid
classDiagram
    class Room {
        code: string
        hostClientId: string
        participants: Map~clientId, Participant~
        queue: Track[]
        currentIndex: number
        isPlaying: boolean
        hostOnlyControl: boolean
        currentGenre: string
        chatHistory: ChatMessage[]
        lastActivity: timestamp
    }
    class Participant {
        clientId: string
        socketId: string
        name: string
        disconnectTimer: Timeout
    }
    class Track {
        videoId: string
        title: string
        thumbnail: string
        channel: string
        duration: string
    }
    class ChatMessage {
        id: string
        clientId: string
        name: string
        text: string
        ts: timestamp
    }
    Room "1" *-- "many" Participant
    Room "1" *-- "many" Track
    Room "1" *-- "many" ChatMessage
```

**Key design choice:** `participants` is keyed by `clientId` (a UUID persisted in the browser's `localStorage`), not `socket.id`. `socket.id` changes on every reconnect (page reload, network blip, sleep/wake) — keying by it caused participants to silently vanish and lose playback control on reconnect. `clientId` is stable across the whole browser session regardless of how many times the underlying socket connection drops and re-establishes.

---

## 4. Sequence: room creation, join, and reconnection

```mermaid
sequenceDiagram
    participant Host as Host Browser
    participant Server
    participant Guest as Guest Browser

    Host->>Server: room:create {userName, clientId}
    Server->>Server: roomManager.createRoom()
    Server-->>Host: room:created {roomCode, roomState}

    Guest->>Server: room:join {roomCode, userName, clientId}
    Server->>Server: roomManager.joinRoom()
    Server-->>Guest: room:joined {roomState}
    Server-->>Host: room:userJoined {participants}

    Note over Guest,Server: network blip / reload
    Guest--xServer: disconnect
    Server->>Server: scheduleRemoval() starts 20s timer
    Guest->>Server: reconnect, auto room:join (same clientId)
    Server->>Server: timer cancelled, socketId updated in place
    Server-->>Guest: room:joined {roomState} (unchanged)
```

---

## 5. Sequence: playback sync

```mermaid
sequenceDiagram
    participant HostPlayer as Host's Player
    participant Server
    participant OtherPlayers as Everyone Else

    loop every 2s (host only)
        HostPlayer->>Server: playback:sync {videoId, currentTime, isPlaying}
        Server-->>OtherPlayers: playback:state {currentTime, isPlaying}
        OtherPlayers->>OtherPlayers: if drift > 2s, seek to correct
    end

    Note over HostPlayer: if hostOnlyControl is false,<br/>anyone's play/pause/seek event<br/>broadcasts immediately too
    OtherPlayers->>Server: playback:sync (on/StateChange event)
    Server-->>HostPlayer: playback:state
```

**Bug that was found and fixed:** originally *every* client ran the periodic 2-second loop, not just the host. Multiple slightly-disagreeing "authoritative" sources kept correcting each other, causing visible jitter. Fix: only the host runs the periodic tick; everyone else's actions broadcast as one-off events only.

---

## 6. Sequence: genre classification

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Classifier as genreClassifier.js

    Client->>Server: queue:add {title, channel, ...}
    Server->>Classifier: classifyGenre(title, channel)
    Classifier->>Classifier: tokenize -> TF-IDF vector -> dot product per class -> argmax
    Classifier-->>Server: genre label
    Server-->>Client: playback:play {videoId, genre}
    Client->>Client: GenreSprite renders matching sprite + glow
```

**Training pipeline (offline, not part of the request path):**

```mermaid
flowchart LR
    A["build_dataset.py<br/>queries YouTube API per genre bucket"] --> B["dataset.csv<br/>1,012 rows, 6 classes"]
    B --> C["train.py<br/>TfidfVectorizer + LogisticRegression"]
    C --> D["held-out eval<br/>89.2% accuracy"]
    C --> E["genre_model.json<br/>vocab + idf + weights"]
    E --> F["genreClassifier.js<br/>hand-ported JS inference"]
```

The model is trained in Python (scikit-learn) but served with zero Python at runtime — TF-IDF + a linear classifier is just a dot product, so the exported weights are reimplemented directly in JS.

---

## 7. Sequence: desktop companion connection

```mermaid
sequenceDiagram
    participant Website
    participant OS as Windows (protocol registry)
    participant Companion as Electron App
    participant Server

    Website->>OS: click "Open Companion" (ytjam://join?server=...&room=...)
    OS->>Companion: launch (or focus if already running, via single-instance lock)
    Companion->>Companion: parse protocol URL
    Companion->>Server: room:spectate {roomCode}
    Server->>Server: socket.join(room) -- NOT added to room.participants
    Server-->>Companion: room:spectateJoined {roomState}
    Server-->>Companion: playback:play, chat:message (ongoing broadcasts)
```

**Why "spectate" and not "join":** the companion is a visual/chat overlay, not a person — it shouldn't inflate the participant count or trigger join notifications. `room:spectate` joins the underlying Socket.IO room (so it still receives broadcasts) without touching `room.participants` at all. This is a clean split between transport-level room membership and application-level participant tracking.

---

## 8. Deployment & self-healing infrastructure

```mermaid
flowchart TD
    A["Windows Scheduled Task<br/>triggers: logon + wake-from-sleep"] --> B["start-ytjam.ps1"]
    B --> C["restart Node server<br/>(if not already running)"]
    B --> D["kill + restart cloudflared"]
    D --> E["parse tunnel log<br/>for new public URL"]
    E --> F["gh variable set VITE_SERVER_URL"]
    F --> G["gh workflow run ci-cd.yml"]
    G --> H["GitHub Actions:<br/>build client with new URL baked in"]
    H --> I["deploy to GitHub Pages"]
```

This exists because Cloudflare's free "quick tunnel" issues a *new random URL every time it restarts*. Without automation, every sleep/wake or reboot would silently break the deployed site until someone manually noticed, found the new URL, and redeployed. The scheduled task collapses that into an automatic ~30–60 second recovery.

---

## 9. Socket.IO event map (reference)

| Direction | Event | Payload |
|---|---|---|
| C→S | `room:create` | `{userName, clientId}` |
| C→S | `room:join` | `{roomCode, userName, clientId}` |
| C→S | `room:spectate` | `{roomCode}` (companion app, no participant added) |
| C→S | `queue:add` / `queue:remove` / `queue:reorder` / `queue:playNow` | track/index payloads |
| C→S | `playback:sync` | `{videoId, currentTime, isPlaying}` (gated by `hostOnlyControl`) |
| C→S | `playback:skip` | — |
| C→S | `room:setControlMode` | `{hostOnlyControl}` (host only) |
| C→S | `chat:message` | `{text}` |
| S→C | `room:created` / `room:joined` / `room:spectateJoined` | `{roomState}` |
| S→C | `room:userJoined` / `room:userLeft` | `{participants}` |
| S→C | `queue:updated` | `{queue, currentIndex}` |
| S→C | `playback:play` | `{videoId, startAt, genre}` |
| S→C | `playback:state` | `{currentTime, isPlaying, ts}` |
| S→C | `room:controlModeChanged` | `{hostOnlyControl}` |
| S→C | `chat:message` | `{id, clientId, name, text, ts}` |
| S→C | `room:error` | `{message}` |
