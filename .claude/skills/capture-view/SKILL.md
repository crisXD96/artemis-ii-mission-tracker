---
name: capture-view
description: >
  Generate a specific camera view of the Artemis II mission at
  a given time. Use when the user asks to see a particular
  moment of the mission.
disable-model-invocation: true
argument-hint: "<MET-time> <view-preset>"
---

# Capture Mission View

Set up a specific camera view at a mission time point.

## Arguments
- $0 = MET time (e.g., "005:19:00:00" for lunar flyby)
- $1 = View preset: "earth", "moon", "follow-orion", "overview", "earthrise"

## Steps
1. Read `src/data/trajectory.ts` to find spacecraft position at MET $0
2. Read `src/data/celestial.ts` to get Earth/Moon positions at that time
3. Calculate the ideal camera position for view "$1":
   - **earth**: Camera behind Orion looking back at Earth
   - **moon**: Camera near Moon surface looking at approaching Orion
   - **follow-orion**: Camera trailing Orion with Moon/Earth in background
   - **overview**: Zoomed out showing full trajectory
   - **earthrise**: Camera angle replicating the famous Earthrise photo
4. Update `public/js/app.js` to add a bookmark function for this view
5. Report the camera coordinates and what the user will see