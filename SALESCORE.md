# What is SalesCore?

This document explains SalesCore to someone who has never seen it before, with
no technical background assumed. If you want architecture diagrams, the RBAC
matrix, the API, or how to run the code, that's [`README.md`](./README.md) —
this page is the plain-English version of the same product.

## The one-sentence version

SalesCore is the system a sales team uses to keep track of who they're
talking to, what those companies might buy, how likely each deal is to close,
and whether the business as a whole is on track — instead of scattering all
of that across spreadsheets, email threads, and one salesperson's memory.

## A worked example: following one company through the system

Rather than describe every screen, here is one fictional company moving
through SalesCore from first contact to closed deal. Every step below is a
real, working part of the product.

### 1. A company shows up

A sales rep at SalesCore's own team hears about **Atlas Furniture Co.**, a
mid-size retailer. The rep creates a **Company** record for Atlas: industry
(Retail), size, country, website. This is just a filing cabinet entry so
far — nothing has been sold, no one has even had a conversation yet.

### 2. A person becomes a contact

The rep finds out that Atlas's Head of Operations, Maria, is the person who'd
actually make a purchasing decision. Maria becomes a **Contact** attached to
the Atlas company record — a name, an email, a job title, a phone number.
Now there's a specific person to talk to, not just a company name.

### 3. Interest becomes a lead

After an initial conversation, Maria says Atlas is looking to replace their
inventory software. That interest is captured as a **Lead** — a record that
says "someone here might buy something," with a source (referral, website,
LinkedIn, an event) and a status. A lead is a maybe, not yet a commitment.

### 4. A lead becomes a deal

Once it's clear Atlas has a real budget and a real problem to solve, the rep
**converts the lead into a Deal** — one click in SalesCore, which reuses the
existing Atlas company record and starts a new deal already sitting at the
"Qualified" stage of the pipeline, with an estimated value attached (say,
$45,000).

### 5. The deal moves through the pipeline

From here, the deal lives on the **Pipeline** — a kanban board with columns
for each stage: *Lead → Qualified → Opportunity → Proposal → Negotiation →
Won/Lost*. The rep drags the Atlas deal rightward as things progress: a
proposal gets sent, a price gets negotiated. SalesCore won't let the deal
jump straight from "Qualified" to "Won" — every stage has to be passed
through in order, because that's how the sales process actually works, and
skipping stages would make the pipeline data meaningless. Every time the
deal moves, SalesCore silently records *when* it moved and *from which stage*
— this becomes important in the next section.

### 6. Won or lost

Eventually the deal reaches an outcome. If Atlas signs, the rep marks the
deal **Won**, and Atlas becomes a paying customer — its Company record now
shows a "Customer since" date and starts accumulating **lifetime value**
(the total of everything Atlas has ever bought). If Atlas walks away, the
deal is marked **Lost**, and that outcome is preserved too — lost deals
aren't deleted, because *why* deals are lost is itself valuable information
(see below).

That's the whole customer journey SalesCore is built around: **Company →
Contact → Lead → Deal → Pipeline → Won/Lost.** Every other feature in the
product — activities, tasks, reports, analytics — exists to support or
measure some part of this same journey.

## From data to a decision

SalesCore isn't only a filing system — it's also supposed to help someone
make a better decision than they would have without it. That happens in four
steps, and it's easiest to see by zooming out from one deal to many.

**Data.** Every time a deal changes stage — like Atlas moving from
"Proposal" to "Negotiation" — SalesCore records a plain fact: *this deal, this
stage, this timestamp.* On its own, one of these records tells you almost
nothing. It's just a row in a database.

**Information.** Once there are hundreds of these stage-change records
across many deals, SalesCore can count them: *this month, 20 deals reached
the Proposal stage, and only 13 of them reached Negotiation.* That's no
longer a single fact — it's a rate, a trend, a number a person can compare
against last month.

**Insight.** A number alone still needs a human to notice it. SalesCore's
Business Insights engine does that noticing automatically, and says so in a
sentence a manager can read in two seconds: *"Proposal → Negotiation
conversion decreased 9% this month."* That sentence is an insight — a
number with a "so what" attached.

**Decision.** Now a sales manager has something to act on. Maybe they pull
up the deals that stalled at Proposal and call the reps who own them.
Maybe they notice it's the same objection coming up again and again, and
fix the proposal template. Either way, a decision got made that wouldn't
have happened if the raw stage-change records had just stayed as rows in a
database — the whole point of the analytics side of the product is to
shorten the distance between "something happened" and "someone did something
about it."

This same four-step chain — Data → Information → Insight → Decision — is
also how the dashboard's KPI cards, the sales funnel, and the win/loss trend
all work; the Business Insights sentences are just the most direct version
of it, because they skip straight to the "so what" instead of leaving it to
the reader.

## Who actually uses this, day to day

- **A sales rep** lives in the Pipeline and CRM sections — creating
  companies and contacts, moving their own deals forward, logging calls and
  meetings as activities, and working through a task list of things due
  today.
- **A sales manager** watches the same pipeline across the *whole team*, not
  just their own deals, sets monthly targets per rep or department, and
  reads the Business Insights to know where to step in.
- **An operations/admin role** manages who has access to what, keeps the
  employee and department records current, and can pull the audit log to
  answer "who changed this, and when."
- **Anyone deciding something** — rep, manager, or an executive who just
  wants the state of the business — lands on Analytics, where the numbers
  and the plain-language insights live together.

## Why it's built this way

A CRM that only *stores* records isn't actually useful to a business — it
has to also *enforce* the process (so the pipeline data is trustworthy) and
*surface* what the data means (so someone acts on it). SalesCore's three
pillars map directly onto that: CRM stores the customer journey described
above, YBS (the operations/management side) enforces who is allowed to see
and change what, and BI turns the accumulated history of that journey into
the insights and decisions described above. None of the three is optional —
a CRM without enforced access control isn't safe to run a real business on,
and a CRM without analytics is just a very expensive address book.
