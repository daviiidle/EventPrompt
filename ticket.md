You are working in a Next.js repository called EventPrompt.

Task: Create a bulk GitHub Issues import package from the BA tickets below.

Output requirements:
1) Create a file at .github/issue-import/issues.yaml
2) YAML schema:
   - repo: "<OWNER>/<REPO>"  (leave placeholder)
   - issues: array of objects
     - title: string
     - labels: array of strings
     - body: markdown string
3) Titles must be prefixed with category tags:
   [Foundation], [Security], [Setup], [Lock], [RSVP], [Dashboard], [SMS], [Observability], [Future]
4) Include all BA tickets exactly, with sections:
   User Story, Assumptions, Acceptance Criteria, Out of Scope, Dependencies.
5) Also create scripts:
   - scripts/create_issues_from_yaml.sh
   - scripts/add_issues_to_project.md (manual steps)
6) create_issues_from_yaml.sh must:
   - read repo from YAML
   - create issues via gh
   - apply labels
   - be idempotent-ish: if an issue with same title exists, skip it
7) Do not require any external dependencies beyond bash + gh + python3.

Here are the BA tickets to encode into YAML:
PASTE THE BA TICKETS YOU RECEIVED FROM CHATGPT HERE (EP-001 ... EP-103)
EPIC 1 — DATA, SECURITY & PLATFORM FOUNDATION
EP-001: Establish secure backend data store for EventPrompt

User Story
As a system owner,
I want all event, guest, and message data stored in a secure database,
So that the system can scale beyond Google Sheets and protect sensitive data.

Assumptions

Supabase (Postgres) is the chosen datastore

App is hosted separately (Next.js)

Acceptance Criteria

Supabase project exists

Environment variables for DB access are stored securely in GitHub Secrets

No production secrets exist in Google Apps Script

Out of Scope

Data migrations from legacy Sheets

Analytics or reporting views

Dependencies

None

EP-002: Define core data model for events, guests, and messages

User Story
As a system,
I need a normalized data model for events, guests, and scheduled messages,
So that reminders, dashboards, and locking logic can operate reliably.

Acceptance Criteria

Tables created:

events

guests

scheduled_messages

message_logs

Each table has:

Primary key

Created/updated timestamps

Foreign key relationships enforced

Status fields use constrained enums (not free text)

Out of Scope

Historical archiving

Soft deletes

Dependencies

EP-001

EP-003: Remove operational secrets from customer-accessible systems

User Story
As a system owner,
I want Twilio credentials and system secrets stored outside customer-accessible tools,
So that sharing data never exposes infrastructure access.

Acceptance Criteria

Twilio Account SID, Auth Token, and From Number stored only in environment variables

No secrets stored in:

Google Sheets

Apps Script properties

App can send SMS using env-based credentials

Out of Scope

Key rotation automation

Dependencies

EP-001

EPIC 2 — EVENT SETUP, FINALISATION & LOCKING
EP-010: Create event setup API for draft events

User Story
As an event owner,
I want to submit my event details through a single setup flow,
So that my event can be reviewed before being locked.

Acceptance Criteria

API accepts event setup payload

Event is created in draft state

Event slug is auto-generated and unique

Event is not publicly accessible while in draft

Out of Scope

Editing after finalisation

Multiple drafts per event

Dependencies

EP-002

EP-011: Implement review → finalise → lock workflow

User Story
As a system,
I want events to be locked after finalisation,
So that configuration remains stable and predictable.

Acceptance Criteria

Finalisation sets locked_at timestamp

Any write attempt after lock is rejected by backend

Locked events cannot:

Change RSVP deadline

Change reminder rules

Change guest list structure

Out of Scope

Paid change handling

Admin override tooling

Dependencies

EP-010

EP-012: Generate scheduled reminders upon event lock

User Story
As a system,
I want RSVP reminder jobs generated automatically when an event is locked,
So that reminders are predictable and require no manual setup.

Acceptance Criteria

On lock:

21-day reminder created

10-day reminder created

3-day reminder created

Reminders stored in scheduled_messages

Reminders include:

event_id

message_type

send_at timestamp

status = pending

Out of Scope

Custom reminder schedules

Reminder edits

Dependencies

EP-011

EPIC 3 — RSVP FLOW
EP-020: Accept RSVP submissions from guests

User Story
As a guest,
I want to submit my RSVP once,
So that my attendance is recorded correctly.

Acceptance Criteria

RSVP endpoint accepts guest response

Guest status updated to Yes / No

Duplicate submissions are prevented

RSVP updates are idempotent

Out of Scope

RSVP edits

Meal preference changes after submission

Dependencies

EP-002

EP-021: Display RSVP confirmation to guests

User Story
As a guest,
I want to see confirmation that my RSVP was received,
So that I know I do not need to respond again.

Acceptance Criteria

Confirmation message displayed after submission

Message reflects RSVP choice

No access to modify response

Out of Scope

Email confirmations

Dependencies

EP-020

EPIC 4 — CUSTOMER DASHBOARD (READ-ONLY)
EP-030: Provide read-only RSVP dashboard for event owners

User Story
As an event owner,
I want to see who has and hasn’t replied,
So that I can track attendance without managing reminders.

Acceptance Criteria

Dashboard shows:

Guest name

RSVP status

Summary counts visible:

Total invited

Yes / No / Pending

Dashboard is read-only

Out of Scope

Editing guests

Triggering reminders

Dependencies

EP-020

EP-031: Secure dashboard access per event

User Story
As a system,
I want dashboard access scoped to a single event,
So that customer data is isolated.

Acceptance Criteria

Dashboard URL includes secure access token

Token only grants read-only access

Access cannot be used to modify data

Out of Scope

User accounts

Password-based login

Dependencies

EP-030

EPIC 5 — SMS SCHEDULER (GITHUB ACTIONS)
EP-040: Create reminder execution API

User Story
As a system,
I want a single API endpoint that processes pending reminders,
So that scheduling can be handled externally.

Acceptance Criteria

Endpoint:

Fetches pending reminders where send_at <= now

Sends SMS via Twilio

Updates reminder status

Errors are logged

Out of Scope

Retry UI

Rate-limit optimisation

Dependencies

EP-012

EP-041: Prevent duplicate SMS sends

User Story
As a system,
I want reminder sending to be idempotent,
So that retries never cause duplicate messages.

Acceptance Criteria

Each reminder has unique idempotency key

Duplicate sends are rejected

Twilio Message SID stored

Out of Scope

SMS delivery guarantees

Dependencies

EP-040

EP-042: Schedule reminder execution via GitHub Actions

User Story
As a system owner,
I want reminders processed automatically on a schedule,
So that no manual intervention is required.

Acceptance Criteria

GitHub Actions cron runs on defined interval

Job calls reminder execution endpoint

Execution logs visible in GitHub Actions

Out of Scope

Real-time execution guarantees

Dependencies

EP-040

EPIC 6 — BACKLOG / FUTURE (DO NOT IMPLEMENT NOW)
EP-100: Replace GitHub Actions scheduler with platform-native cron

Type: Future
Reason: Reliability & scale

EP-101: Queue-based SMS dispatch

Type: Future
Reason: High-volume protection

EP-102: CSV export for event owners

Type: Nice-to-have

EP-103: Admin override tooling for paid changes

Type: Future