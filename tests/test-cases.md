# Test cases and verification checklist

## Blocking and unblocking at scheduled times

1. Create a policy for `youtube.com` from 09:00 to 17:00 on weekdays.
2. Start the extension and wait for policy sync.
3. Navigate to a YouTube page during the allowed window and verify it is not blocked.
4. Navigate during the disallowed window and verify the request is blocked.
5. Change the schedule in the dashboard and verify the extension updates after the next sync.

## Multiple devices

1. Register two devices with different IDs.
2. Assign different policies to each device.
3. Confirm each extension loads only its assigned domains.

## Browser restart and offline behavior

1. Start with a valid policy synced to the extension.
2. Disconnect the device from the network and restart Chrome.
3. Confirm the last valid policy remains active during the offline window.
4. Reconnect and verify the extension resynchronizes.

## Unauthorized policy access

1. Sign in as a non-admin user.
2. Attempt to read another device's policies or usage records.
3. Confirm the request is rejected by Supabase Row Level Security.

## Expired authentication

1. Use a Supabase session that has expired.
2. Trigger a sync.
3. Confirm the extension stores the error and does not accept stale authorizations.

## Attempts to access blocked websites

1. Create a block rule for `facebook.com`.
2. Load a page to that domain.
3. Confirm the navigation is blocked and usage metadata is recorded without full URL logging.

## Incognito restriction configuration

1. In an enterprise-managed Chrome environment, apply the Incognito policy.
2. Verify the browser reports the restriction status as configured.
3. On an unmanaged browser, note that the status is not verifiable and cannot be enforced by the extension alone.

## Privacy and credential-data handling

1. Check that no password fields or login forms are accessed.
2. Confirm only domain-level analytics are captured.
3. Ensure no keystrokes, sessions, or typed text are transmitted.

## Permission minimization

1. Review the manifest permissions.
2. Confirm no unnecessary content script or broad host access is introduced.
3. Validate the extension only requests what is required for policy enforcement and analytics.

## Database access restrictions

1. Attempt direct SQL queries from a non-admin role.
2. Confirm the row-level security policies reject access to other devices and analytics records.

## Suggested automation coverage

- Unit test `isScheduleActive` against time and weekday transitions.
- Mock a policy assignment and validate `declarativeNetRequest` rule generation.
- Test stale-cache fallback behavior when Supabase is offline.
