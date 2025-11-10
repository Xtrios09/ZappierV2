# SecureChat - P2P Encrypted Messaging Application

## Overview
SecureChat is a peer-to-peer encrypted messaging application with audio and video calling capabilities. It emphasizes privacy and security by storing all data locally on the user's device using IndexedDB, with no central server for data storage.

**Key Features:**
- End-to-end encrypted peer-to-peer messaging
- Audio and video calling via WebRTC
- QR code-based contact sharing with camera preview
- Bidirectional contact adding (both users auto-add each other)
- Profile viewer with QR code display on chat page
- Media file support with download capability
- Emoji picker for rich messaging
- Desktop and mobile notifications with custom sound alerts
- Local-only data storage (IndexedDB)
- No account or phone number required
- Real-time WebSocket signaling for P2P connections

**Current State:** Fully configured and running on Replit. The application is ready for development and deployment.

## Recent Changes
**November 10, 2025** - Feature Enhancement Sprint
- ✅ **Profile Dialog Integration:** Added Profile button in ChatApp header to view user QR code and ID
- ✅ **Media Download Functionality:** Implemented download buttons for all media types (images, videos, audio, files) with proper MIME type detection
- ✅ **Bidirectional Contact Adding:** Users who are added automatically receive and add the contact back
  - Global WebRTC message handler for 'contact-info' messages
  - Validation to prevent self-addition and peerId spoofing
  - Real-time UI refresh when contacts are auto-added via ref-based callback mechanism
- ✅ **Emoji Picker:** Integrated emoji-picker-react library with popover UI in message input
- ✅ **Notification System:** Desktop and mobile notifications with custom WAV sound playback
  - Permission management for browser notifications
  - Smart notification behavior (sound only when window focused, notification when unfocused)
  - Notifications for new messages and auto-added contacts
- 📦 Installed @types/crypto-js for proper TypeScript support
- 🔧 Fixed closure bug in PeerConnectionContext using useRef for callbacks
- ✅ All features verified by architect review

**November 10, 2025** - GitHub Import Setup
- Installed npm dependencies (500 packages)
- Fixed TypeScript error in server/routes.ts (null check for currentPeerId)
- Verified Vite configuration with allowedHosts: true for Replit proxy support
- Configured dev-server workflow running on port 5000 (webview output)
- Set up autoscale deployment with build (`npm run build`) and run (`npm start`) commands
- Application tested and running successfully with WebSocket signaling server active

## Project Architecture

### Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Express.js with WebSocket server
- **Storage:** IndexedDB (client-side only)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Communication:** WebRTC for P2P data/media, WebSocket for signaling
- **Build Tool:** Vite + esbuild

### Project Structure
```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # UI components (shadcn/ui + custom)
│   │   ├── pages/         # Main page components
│   │   ├── lib/           # Utilities and contexts
│   │   └── hooks/         # React hooks
│   └── index.html
├── server/                # Express backend
│   ├── index.ts          # Main server entry point
│   ├── routes.ts         # WebSocket signaling server
│   ├── vite.ts           # Vite dev server setup
│   └── storage.ts        # Unused server storage (legacy)
├── shared/               # Shared TypeScript types and schemas
│   └── schema.ts         # Zod schemas for validation
└── attached_assets/      # Static assets and images
```

### Data Flow
1. **User Registration:** Client generates unique ID using nanoid, stores profile in IndexedDB
2. **Contact Addition:** Users share IDs via QR codes or manual entry
3. **Signaling:** WebSocket server on `/ws` path handles WebRTC signaling messages
4. **P2P Communication:** Once connected, all messages/calls go directly peer-to-peer
5. **Local Storage:** Messages, contacts, and call history stored in browser's IndexedDB

### Key Components
- **Welcome.tsx:** Onboarding flow for creating user profile and displaying QR code
- **ChatApp.tsx:** Main chat interface with contacts list and message windows
- **ChatWindow.tsx:** Individual chat view with message history, emoji picker, and media support
- **QRScanner.tsx:** Camera-based QR code scanning for adding contacts
- **ProfileDialog.tsx:** User profile viewer with QR code display
- **AddContactDialog.tsx:** Manual contact addition with contact-info exchange
- **webrtc-manager.ts:** Handles WebRTC peer connections, data channels, and global message handlers
- **peer-connection-context.tsx:** React context for managing peer connections and contact change notifications
- **notifications.ts:** Notification manager with sound playback and permission handling
- **user-storage.ts:** IndexedDB wrapper for local data persistence

## Configuration

### Development
- Port: 5000 (both frontend and backend on same port)
- Host: 0.0.0.0 (allows Replit proxy access)
- Dev server: Express with Vite middleware
- WebSocket path: `/ws`

### Production Deployment
- Build command: `npm run build`
- Start command: `npm start`
- Deployment type: Autoscale (stateless)
- All static assets served from `dist/public`

### Environment Variables
- `PORT`: Server port (defaults to 5000)
- `NODE_ENV`: development or production
- `DATABASE_URL`: Present but unused (legacy from template)

## Important Notes

### Database
The application **does not use PostgreSQL** despite having drizzle-kit installed. All data is stored client-side in IndexedDB. The database configuration and `server/storage.ts` are unused remnants from a template.

### WebSocket Signaling
The WebSocket server is only for signaling to establish P2P connections. It does not store or relay actual chat messages - those go directly peer-to-peer via WebRTC data channels.

### Privacy & Security
- All user data stays on their device
- No server-side message storage
- WebRTC ensures direct peer-to-peer encryption
- Users identified by randomly generated IDs, not personal information

### Development Workflow
1. Start dev server: Already configured to run automatically
2. Access via Replit webview at port 5000
3. Hot module replacement enabled via Vite
4. WebSocket server starts alongside Express

### Known Limitations
- P2P connections require both users to be online simultaneously
- No offline message queue (messages sent to offline peers are lost)
- No message history sync across devices (local storage only)
- Relies on WebSocket server for initial peer discovery
- NAT/firewall issues may affect P2P connectivity (would need TURN servers)
- GIF picker not yet implemented (planned feature)

## Design System
See `design_guidelines.md` for comprehensive design principles, component specifications, and visual guidelines following modern messaging app patterns (Telegram, Signal, Discord).
