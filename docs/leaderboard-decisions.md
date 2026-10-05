# Leaderboard decisions

## Why this system is seasonal

The Community Challenge uses fixed seasons instead of a permanent all-time board. A fresh start gives new people a real chance to compete, keeps the prizes financially predictable, and makes it possible to review a small, clear group of provisional winners. The first season is **Fall 2026**, from Aug. 3 through Dec. 31 in Eastern Time.

## Who competes and how privacy works

Each person chooses one board for the season: **Student** or **Neighbor**. That choice is locked after enrollment so someone cannot move to a less competitive board. The public board shows only a nickname, position, and points. It never exposes email addresses, phone numbers, legal names, school details, referral history, or job details.

Students provide a school name and school email. Their score is visible immediately, but their prize eligibility is marked pending until Wurkzi manually verifies it. Neighbors are immediately eligible. This manual step is intentional: a $500 prize needs a human fraud and eligibility check, and the product does not yet have an administrative verification console.

## Points and fraud protection

Points are awarded only after a job is both completed and paid. A referrer receives 10 points once for a referred account's first paid job in either role. A Student earns 5 points for each completed paid job as the worker; a Neighbor earns 5 points for each completed paid job they posted. Existing referral credits and discounts continue unchanged.

Every award is saved as an immutable point event tied to its job or referral. A database uniqueness rule permits that event only once per season. Retried web requests, card-payment confirmation repeats, and cash-payment repeats therefore cannot duplicate points.

## Winners and prizes

There is one provisional winner per board. Rankings sort by total points, then completed paid jobs, then successful referrals, then the earliest time the tied score was reached. Wurkzi reviews the leading account for eligibility and fraud before awarding a prize.

- Student: $500 cash prize after eligibility review.
- Neighbor: one standard exterior house wash for a single-family home up to 2,500 sq ft in the service area, plus one 50-inch TV. If that TV cannot be supplied, Wurkzi may substitute a $350 retailer gift card.

## Admin workflow for future seasons and verification

Until an admin console exists, create a new season in Supabase with non-overlapping dates and set the prior season's `is_active` field to false. Verify a student with:

```sql
UPDATE "leaderboard_participants"
SET "verification_status" = 'VERIFIED', "verified_at" = NOW()
WHERE "season_id" = '<season id>' AND "user_id" = '<user id>';
```

Do this only after the winner review is complete. The public app does not expose this operation.
