# Safety pilot demo pack

This pack is ready for a one-screen pilot using capabilities that exist today:
the OpsBoard safety preset, the existing Countdown app in count-up mode, and an
optional planned Alert item inside an ordinary playlist rotation.

It does **not** implement or demonstrate emergency takeover. Alert is a
full-screen visual only while its assigned rotation slot is playing. It cannot
interrupt another item, target all devices instantly, or replace a siren,
public-address system, evacuation procedure, or regulated alarm system.

## Files

- `opsboard-safety.fixture.json` contains a manual OpsBoard config and the
  normalized rows expected on screen. It covers PPE, current risk, next
  training, and incident status.
- `pilot-playlist.fixture.json` is an assembly plan for three app instances and
  their rotation. Its `ref` and `configRef` values are symbolic fixture links,
  not backend IDs and not a directly POST-able API body.
- `../../architecture/ADR-SAFE-01-EMERGENCY-TAKEOVER.md` defines the separate
  future core feature and its release/claim gate.

## Pilot setup, step by step

1. Name one customer-side HSE content owner and one backup. Agree who may edit
   PPE, risk, training, and incident status, and how often each value is checked.
2. Copy `opsboard-safety.fixture.json.config` into a new `opsboard` instance.
   Keep `preset=safety`, `source=manual`, and `layout=cards` for the first demo.
3. Replace all example facts, dates, areas, and instructions with values approved
   by the HSE owner. Do not present sample fixture values as live site data.
4. Create a `countdown` instance from the playlist fixture. Set `mode=up` and
   replace `target` with the actual incident-free start as
   `YYYY-MM-DDTHH:mm` in the **screen site's local clock**. Countdown already
   performs the elapsed-time arithmetic and continues ticking offline.
5. If the customer wants a planned high-contrast notice, create the fixture's
   `alert` instance. Use it only for a message that is safe to show on its normal
   playlist turn; do not use it for time-critical activation.
6. Create one playlist, resolve the symbolic `appRef` values to the three real
   app-instance IDs, and use the listed order and dwell times. Assign the
   playlist to exactly one consenting test screen.
7. Load the screen online once. Verify all four OpsBoard cards, the Countdown
   direction/start time, the Alert copy, text fit, and the complete 75-second
   loop from the normal viewing distance.
8. Disconnect the network for at least two complete loops. Confirm that the
   manual board and Countdown remain readable, that Alert appears only in its
   normal slot, and that rotation resumes after it.
9. Reconnect, change one non-critical OpsBoard row, publish, and record the time
   until the test screen receives the revision. This measures ordinary content
   delivery, not emergency response time.
10. Have the HSE owner sign off the wording and current-behavior boundary before
    any customer-facing demo. Record the owner, screen, test time, and result in
    the pilot notes.

## Acceptance checklist

- [ ] PPE, current risk, next training, and incident status are all visible.
- [ ] Empty or unapproved sample data is not presented as current customer data.
- [ ] Incident-free time uses the Countdown app rather than duplicate OpsBoard
      date arithmetic.
- [ ] The Countdown start is checked against the screen site's local clock.
- [ ] Alert is observed entering and leaving as an ordinary rotation item.
- [ ] Offline playback is tested only after the screen has loaded the content.
- [ ] Demo language explicitly says there is no emergency takeover yet.
- [ ] No one describes SignageWall as a certified or primary alarm system.

## Claim boundary

Safe current wording: “A digital safety board for planned HSE information,
current status, training reminders, incident-free time, and high-contrast
notices in the normal screen rotation.”

Forbidden before CORE-04 is implemented and its release gates pass:

- “instant emergency takeover”;
- “overrides every screen”;
- “guaranteed delivery to offline screens”;
- “emergency broadcast system”;
- any claim that the product replaces certified alarms or site procedures.
