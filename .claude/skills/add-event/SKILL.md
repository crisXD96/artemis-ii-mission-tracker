---
name: add-event
description: Add a new mission event to the Artemis II timeline
disable-model-invocation: true
argument-hint: "<title> <MET-timestamp> <description>"
allowed-tools: Read Write Edit Bash(npm test *)
---

# Add Mission Event

Add a new event to the Artemis II mission timeline.

## Arguments
- $0 = Event title (e.g., "Lunar Flyby Closest Approach")
- $1 = Mission Elapsed Time timestamp (e.g., "005:19:02:00" for day 5, 19h, 2m)
- $2 = Description

## Steps
1. Read `src/data/mission-events.ts` to see the current event format
2. Add the new event in chronological order within the array
3. Assign the next sequential ID
4. Determine the `phase` from the MET:
   - 000:00-000:02 = "launch"
   - 000:02-001:00 = "translunar_injection"
   - 001:00-005:00 = "outbound"
   - 005:00-006:00 = "lunar_flyby"
   - 006:00-009:00 = "return"
   - 009:00+ = "reentry"
5. Run `npm test` to verify nothing broke
6. Report the event added with its ID and phase