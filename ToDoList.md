# Songbook Editor MVP Checklist

## 1. Product definition

- [x] Choose the initial target user: worship leader, band leader, youth organization, or choir leader
- [ ] Write a one-sentence value proposition
- [ ] Define the MVP promise:

  > Create ChordPro songs, organize them into setlists, export polished PDFs, and share them with anyone through a browser.

- [ ] Decide what requires payment
- [ ] Decide what viewers can access for free
- [ ] Create a "not in MVP" list to prevent scope creep

## 2. Song editor

- [ ] Create a new song
- [ ] Edit the song title
- [ ] Edit ChordPro source
- [ ] Show a live rendered preview
- [ ] Save changes automatically
- [ ] Display parsing errors clearly
- [ ] Support common ChordPro directives
- [ ] Support sections such as verse, chorus, bridge, and intro
- [ ] Add song metadata:
  - [ ] Original key
  - [ ] Artist or author
  - [ ] Tempo
  - [ ] Capo
  - [ ] Tags
- [ ] Add basic undo and redo
- [ ] Confirm that long songs remain responsive
- [ ] Warn users before losing unsaved changes

### Essential ChordPro support

- [ ] Inline chords such as `[C]Amazing [G]grace`
- [ ] `{title: ...}`
- [ ] `{subtitle: ...}`
- [ ] `{key: ...}`
- [ ] `{start_of_chorus}`
- [ ] `{end_of_chorus}`
- [ ] `{comment: ...}`
- [ ] Empty lines and section spacing

## 3. Song library

- [ ] Display all saved songs
- [ ] Search by title
- [ ] Search by lyrics
- [ ] Filter by tags
- [ ] Sort alphabetically
- [ ] Open a song from the library
- [ ] Duplicate a song
- [ ] Delete a song
- [ ] Add a deletion confirmation
- [ ] Import a ChordPro file
- [ ] Export an individual ChordPro file
- [ ] Handle duplicate song names sensibly

## 4. Transposition

- [ ] Transpose chords up
- [ ] Transpose chords down
- [ ] Select a target key
- [ ] Support sharps
- [ ] Support flats
- [ ] Support minor chords
- [ ] Support slash chords
- [ ] Preserve chord modifiers such as maj7, sus4, and add9
- [ ] Let users reset to the original key
- [ ] Ensure transposition does not modify lyrics
- [ ] Add automated tests for chord parsing and transposition

## 5. Setlists

- [ ] Create a setlist
- [ ] Rename a setlist
- [ ] Add songs from the library
- [ ] Remove songs from a setlist
- [ ] Reorder songs with drag and drop
- [ ] Allow the same song in multiple setlists
- [ ] Add optional notes between songs
- [ ] Set a per-setlist transposition for each song
- [ ] Preserve the original song when applying setlist transposition
- [ ] Duplicate a setlist
- [ ] Delete a setlist
- [ ] Show the number of songs
- [ ] Show the estimated page count before export

## 6. PDF and printing

- [ ] Export one song as a PDF
- [ ] Export an entire setlist as a PDF
- [ ] Add a songbook title
- [ ] Add an optional cover page
- [ ] Add page numbers
- [ ] Add a table of contents
- [ ] Keep section headings with their following lyrics
- [ ] Avoid awkward page breaks inside verses
- [ ] Support A4
- [ ] Support US Letter
- [ ] Add a chords-and-lyrics layout
- [ ] Add a lyrics-only layout
- [ ] Let users select font size
- [ ] Let users adjust spacing
- [ ] Preview the PDF before downloading
- [ ] Test PDFs with short and very long songs
- [ ] Test special characters such as German umlauts
- [ ] Test Japanese and Korean characters if those languages are part of the intended audience

## 7. Sharing and free viewing

- [ ] Generate a shareable setlist link
- [ ] Let viewers open the link without installing an app
- [ ] Decide whether viewers need an account
- [ ] Make the viewer work well on mobile
- [ ] Add previous-song and next-song navigation
- [ ] Add a setlist overview
- [ ] Let viewers change font size
- [ ] Add dark mode
- [ ] Add fullscreen mode
- [ ] Allow the creator to disable a shared link
- [ ] Support private unlisted links
- [ ] Prevent viewers from editing the source
- [ ] Display an appropriate message when a link is expired or disabled

## 8. Accounts and data

- [ ] User registration
- [ ] Login
- [ ] Logout
- [ ] Password reset
- [ ] Email verification
- [ ] Save songs to a user account
- [ ] Save setlists to a user account
- [ ] Prevent users from accessing another user's private content
- [ ] Create database backups
- [ ] Add basic data export
- [ ] Add account deletion
- [ ] Add a privacy policy
- [ ] Add terms of service
- [ ] Add an imprint or Impressum for Germany
- [ ] Add cookie consent only if nonessential cookies are used

## 9. Payments

- [ ] Define the free plan
- [ ] Define the paid creator plan
- [ ] Choose monthly and annual pricing
- [ ] Integrate a payment provider
- [ ] Create a checkout page
- [ ] Handle successful payments
- [ ] Handle failed payments
- [ ] Handle subscription cancellation
- [ ] Handle expired subscriptions
- [ ] Add a billing management page
- [ ] Keep shared songs viewable when the creator cancels, or clearly define what happens
- [ ] Test the complete payment flow in sandbox mode
- [ ] Verify VAT and invoicing requirements for your business setup

A simple initial model could be:

**Free viewer**
- Open shared songs and setlists
- Change viewing preferences
- No editing

**Free creator trial**
- Create a limited number of songs or use the complete product temporarily

**Paid creator**
- Unlimited songs
- Setlists
- PDF exports
- Sharing
- Advanced formatting

## 10. Onboarding

- [ ] Create a short landing page
- [ ] Show the main value proposition immediately
- [ ] Include screenshots or a short demo
- [ ] Add a sample song
- [ ] Add a sample setlist
- [ ] Let new users try the editor quickly
- [ ] Explain ChordPro syntax inside the editor
- [ ] Add a small syntax reference
- [ ] Create an onboarding checklist
- [ ] Guide users toward their first exported or shared setlist
- [ ] Add useful empty states instead of blank pages

## 11. Reliability and security

- [ ] Validate all server-side input
- [ ] Sanitize rendered song content
- [ ] Protect against cross-site scripting
- [ ] Add authorization checks to every private resource
- [ ] Add rate limiting to public endpoints
- [ ] Log server errors
- [ ] Add monitoring
- [ ] Add automated database backups
- [ ] Test restoring a backup
- [ ] Store secrets outside the source repository
- [ ] Add automated tests for critical workflows
- [ ] Create a production error page

## 12. Mobile and browser testing

- [ ] Chrome on Windows
- [ ] Firefox on Windows
- [ ] Edge on Windows
- [ ] Safari on macOS
- [ ] Safari on iPhone
- [ ] Chrome on Android
- [ ] iPad screen sizes
- [ ] Small Android screens
- [ ] Keyboard-only navigation
- [ ] Touch-based setlist reordering
- [ ] Printing from common browsers

## 13. Analytics and feedback

- [ ] Track account registrations
- [ ] Track first song creation
- [ ] Track first setlist creation
- [ ] Track PDF exports
- [ ] Track shared-link creation
- [ ] Track repeat usage
- [ ] Track trial-to-paid conversion
- [ ] Add an in-app feedback button
- [ ] Add a way to report broken PDFs or rendering problems
- [ ] Avoid collecting unnecessary personal data

Your most important activation metric could be:

> Percentage of new users who create and export or share their first setlist.

## 14. Early-user validation

- [ ] Recruit 5–10 initial creators
- [ ] Include users outside your personal organization
- [ ] Watch at least three people use the app
- [ ] Note where they become confused
- [ ] Ask what process they currently use
- [ ] Ask what takes the most time
- [ ] Ask what would make them use the app weekly
- [ ] Ask for payment rather than only asking whether they like it
- [ ] Get the first real user to create a setlist for an actual event
- [ ] Get the first user who is not personally connected to you
- [ ] Get the first paying user
- [ ] Measure whether users return the following week

### Explicitly postpone until after the MVP

- [ ] Real-time collaborative editing
- [ ] Comments and mentions
- [ ] Native Android app
- [ ] Native iOS app
- [ ] Bluetooth pedal support
- [ ] Autoscrolling
- [ ] Projector presentation mode
- [ ] AI chord detection
- [ ] Automatic import from arbitrary websites
- [ ] Audio playback
- [ ] Complex organization permissions
- [ ] Public song marketplace
- [ ] Multiple PDF theme marketplaces
- [ ] Full offline synchronization
- [ ] Visual chord drag-and-drop
- [ ] Nashville Number System
- [ ] Integrations with Planning Center or similar services

These may be valuable later, but they are not necessary to prove that someone will pay.

## MVP completion criteria

The MVP is ready when a new user can:

- [ ] Register
- [ ] Create or import a ChordPro song
- [ ] Preview it correctly
- [ ] Transpose it
- [ ] Add it to a setlist
- [ ] Reorder the setlist
- [ ] Export a polished PDF
- [ ] Share a mobile-friendly link
- [ ] Let another person view it for free
- [ ] Purchase a creator subscription
- [ ] Complete the entire workflow without your assistance

The final checkbox is the most important:

- [ ] At least one person who does not know you has paid to use it
