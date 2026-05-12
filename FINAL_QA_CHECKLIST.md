# Final QA Checklist -- EndoScribe Workspace OS

Run through this checklist before sharing the app with your team.

## A. Authentication

- [ ] Logged-out user is redirected to /login
- [ ] Login page shows EndoScribe branding and feature cards
- [ ] Successful login redirects to Home
- [ ] Logged-in user visiting /login is redirected to Home
- [ ] New user without invite sees "Pending approval" page
- [ ] Deactivated user sees "Access deactivated" page
- [ ] Non-admin visiting /admin/* sees "Access restricted" page

## B. Users (Admin)

- [ ] Admin can create invite (email + role)
- [ ] Admin can change user role (Admin/User)
- [ ] Admin can deactivate a user
- [ ] Admin can reactivate a user
- [ ] Protected admin cannot be accidentally demoted
- [ ] Last admin cannot be demoted
- [ ] Audit log records user management actions

## C. Tasks

- [ ] Create new task from Tasks page
- [ ] Create new task from inside a workspace
- [ ] Edit task (click to open detail/edit)
- [ ] Inline status change (dropdown in table)
- [ ] Inline priority change (dropdown in table)
- [ ] Inline due date change (date picker in table)
- [ ] Duplicate task (three-dot menu)
- [ ] Bulk select tasks (checkboxes)
- [ ] Bulk change status
- [ ] Bulk change priority
- [ ] Bulk move to workspace
- [ ] Admin can archive tasks
- [ ] Non-admin cannot see archive button

## D. Workspaces

- [ ] Five default workspaces visible
- [ ] Task count shows per workspace card
- [ ] Open workspace shows task list
- [ ] Create task from workspace (New Task button)
- [ ] Filter: All / Mine / Overdue / Done
- [ ] Admin can rename workspace (Manage mode)
- [ ] Admin can create new workspace
- [ ] Admin can delete custom workspace (with confirmation)
- [ ] System workspaces protected from deletion

## E. Calendar

- [ ] Create meeting with required meeting link
- [ ] Meeting appears in Upcoming section
- [ ] Download .ics file (logged in)
- [ ] .ics request blocked if not authenticated (401)
- [ ] Google/Outlook sync shows "coming soon" message

## F. Reports

- [ ] Reports page loads
- [ ] Weekly Summary / Project Status / Export show "Coming soon"
- [ ] Advanced section is collapsed by default
- [ ] Click Advanced to reveal: Timeline, Network Map, Regulatory, Compliance, Validation
- [ ] Network Map loads in 2D by default

## G. Mobile / PWA

- [ ] PWA installable from Chrome/Edge address bar
- [ ] iPhone: Safari Share → Add to Home Screen works
- [ ] Android: Chrome menu → Install app works
- [ ] Mobile sidebar hamburger menu works
- [ ] Task cards display properly on phone
- [ ] No horizontal overflow on small screens
- [ ] Meeting form usable on phone

## H. Android Shell (if building APK)

- [ ] `npm run cap:android:sync` completes
- [ ] `npm run cap:android` opens Android Studio
- [ ] Gradle sync succeeds
- [ ] Debug APK builds
- [ ] App loads the Vercel URL in WebView
- [ ] Login works inside native shell
- [ ] Tasks/Workspaces/Calendar load

## I. Security

- [ ] No service-role key in frontend code
- [ ] No patient identifiers or clinical data entered
- [ ] Admin pages hidden from non-admin users
- [ ] Audit log records admin actions
- [ ] .ics API requires authentication
- [ ] RLS enabled on all sensitive tables (check /setup)
