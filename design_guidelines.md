# Design Guidelines: P2P Encrypted Chat Application

## Design Approach
**Reference-Based Approach** drawing from modern messaging applications (Telegram, Signal, Discord) combined with the soft, approachable aesthetic of Nomad/Honey/Zen Garden/Quadratic themes. Focus on building trust through clean design while maintaining a warm, friendly feel.

## Core Design Principles
1. **Trust Through Simplicity**: Clean, uncluttered interfaces that reinforce security
2. **Warmth & Approachability**: Soft colors and rounded elements to avoid appearing "shady"
3. **Visual Hierarchy**: Clear distinction between primary actions and secondary information
4. **Depth Without Gradients**: Use shadows and layering exclusively for depth

## Typography
- **Primary Font**: Inter or DM Sans (Google Fonts) - clean, modern, highly legible
- **Display/Headers**: 24-32px, font-weight 600-700
- **Body Text**: 14-16px, font-weight 400-500
- **Captions/Meta**: 12-14px, font-weight 400
- **Chat Messages**: 15px for optimal reading in conversation flow

## Layout System
**Spacing Units**: Consistent use of 4, 8, 12, 16, 24, 32px
- Chat bubbles: p-3 to p-4 (12-16px internal padding)
- Card containers: p-6 (24px)
- Section spacing: gap-4 to gap-8
- Screen margins: px-4 on mobile, px-8 on desktop

## Component Library

### Navigation & Structure
**Sidebar/Contact List** (Desktop: 320px fixed, Mobile: full-width screen)
- Contact cards with 56px height, rounded-2xl, subtle shadow
- Online status indicator: 8px circle, positioned top-right of avatar
- Unread badge: small pill with count, positioned top-right
- Search bar at top with rounded-full input field

**Top Bar**
- Fixed height: 64px
- Current chat contact name, status, and action buttons (video, audio, menu)
- Translucent background with backdrop blur when scrolled

### Chat Interface
**Message Bubbles**
- Sent messages: Align right, rounded-3xl (very rounded corners), max-width 75%
- Received messages: Align left, rounded-3xl, max-width 75%
- Timestamp: 11px below bubble, opacity-60
- File attachments: Embedded cards within bubbles with preview thumbnails
- Image/Video previews: Rounded-2xl, clickable for full-screen view
- GIF support: Auto-play in chat, same styling as images

**Input Area**
- Fixed bottom bar: 72px height
- Rounded-full text input with icon buttons (attachment, emoji, send)
- File upload button triggers modal/sheet for file selection
- Send button: Circular, prominent when text is entered

### QR Code & Pairing
**ID Display Screen**
- Large QR code centered: 280px × 280px with white background, rounded-2xl
- Unique ID displayed below QR: Monospace font, 18px, easily copyable
- "Share" and "Scan" action buttons below ID
- Instruction text: Clear, friendly language

**QR Scanner**
- Full-screen camera view with centered scanning frame
- Rounded square guide overlay: 280px × 280px
- Cancel button: Top-left, translucent background with blur
- Success animation when QR detected

### Video/Audio Call Interface
**Call Screen**
- Full-screen video feed background
- Floating control bar at bottom: rounded-full container with blur
- Control buttons: Mute, video toggle, end call (red), speaker
- Small self-view: Positioned top-right corner, 120px × 160px, rounded-2xl
- Contact name overlay: Top-left with translucent background

**Incoming Call**
- Modal card centered on screen: rounded-3xl, generous padding
- Contact avatar large and centered
- Accept (green, rounded-full) and Decline (red, rounded-full) buttons

### Cards & Containers
- Primary cards: rounded-2xl, shadow-md (soft, medium shadow)
- Nested cards: rounded-xl, shadow-sm
- Hover states: shadow-lg with subtle lift transform
- Active/selected: Slightly darker shadow, no color change

## Visual Effects

### Shadows
- **Light shadow**: 0 2px 8px rgba(0,0,0,0.06)
- **Medium shadow**: 0 4px 16px rgba(0,0,0,0.08)
- **Heavy shadow**: 0 8px 24px rgba(0,0,0,0.12)
- **Floating elements**: 0 12px 32px rgba(0,0,0,0.15)

### Animations
**Use sparingly and purposefully:**
- Message send: Gentle slide-in from right (sent) or left (received), 200ms
- New contact: Fade-in with slight scale (0.95 to 1), 250ms
- Modal/sheet appearance: Slide-up from bottom, 300ms ease-out
- Loading states: Subtle pulse on skeleton screens
- Call connection: Ripple effect on accept button
- **Avoid**: Excessive bounces, constant motion, distracting effects

## Responsive Behavior
**Mobile (< 768px)**
- Single-screen navigation: Contacts OR chat view
- Bottom navigation bar for primary actions
- Floating action button for new chat (bottom-right)
- Full-width input area

**Desktop (≥ 768px)**
- Two-column layout: Sidebar (320px) + Chat area
- Persistent contact list
- Spacious chat bubbles with comfortable max-width

## Images
**Profile Avatars**: 
- Contact list: 48px circles
- Chat header: 40px circles
- Call screen: 120px circles
- Default avatar: Initials on soft background

**File Previews**:
- Image thumbnails: 200px × 200px in chat, rounded-2xl
- Video thumbnails: Same with play icon overlay
- Document icons: 48px × 48px with file type indicator

**Empty States**:
- No contacts yet: Friendly illustration, centered, 240px wide
- No messages: Simple icon with encouraging text

## Accessibility
- High contrast text on all backgrounds (WCAG AA minimum)
- Touch targets minimum 44px × 44px
- Clear focus indicators: 2px outline with offset
- Screen reader labels on all interactive elements
- Keyboard navigation throughout application

## Trust & Security Visual Indicators
- Encryption badge: Small lock icon in chat header, always visible
- Local storage indicator: Subtle footer text "All data stored locally"
- Connection status: Dot indicator (green = connected, amber = connecting, red = offline)
- End-to-end encryption reminder on first chat with each contact

This design system creates a trustworthy, approachable encrypted chat experience that feels polished and modern while avoiding the cold, sterile feel often associated with security-focused applications.