# Implementation Plan: Fully-Fledged Athlete Profile System

Build a comprehensive, production-grade Athlete Profile modal (`ProfileModal.tsx`) with detailed career statistics, interactive friends/followers social hub with direct match challenges, global circuit rankings, unlockable trophy badges, and saved replay theater.

---

## Proposed Features & UI Architecture

### 1. Header & Hero Persona Card
- **Athlete Avatar & Identity**: Equipped character 3D snapshot/avatar, custom player nickname, title badge (*"Oakridge Division King"*), level progress bar (*LVL 14 • 3,450 / 4,000 XP*).
- **Quick Action Buttons**: *Edit Customization* (opens customizer) and *Share Athlete Card*.

### 2. Tabbed Navigation Sections inside Profile Window
- **Tab 1: Career Statistics Dashboard**
  - **Key Metrics Grid**: Win/Loss Record, Win Rate % Gauge, Total Crown Holds, Longest Reigning Streak.
  - **Performance Analytics**: Peak Smash Speed (MPH), Shot Accuracy %, Total Points Scored, Average Rally Length, Receiver Fault Grace Ratio.
- **Tab 2: Friends, Followers & Social Hub**
  - **Interactive Friends List**: Roster of friends with live status indicators (*Online*, *In Match at Lincoln High*, *Offline*).
  - **Direct Match Challenge**: "CHALLENGE" button on each friend card to launch an immediate 4-Square match.
  - **Follower Count & Search**: Follower/Following counter + "Add Friend" player tag lookup.
  - **Live Activity Feed**: Timeline of friends' achievements (*"Skater Roxy won Lincoln High Showdown!"*).
- **Tab 3: Circuit Rankings & Ladder Standings**
  - Player's current rank across **Local Division** (#1), **School Campus** (#1), and **Global Circuit** (#3).
  - Division rank progression bar showing points needed to reach Tier #1.
- **Tab 4: Trophy Case & Career Badges**
  - Grid of unlockable achievement medals (*"Blacktop Legend"*, *"5-Consecutive Crown Holds"*, *"Classroom Scholar"*, *"Volley Ace"*).
- **Tab 5: Replay Theater**
  - List of saved 1-hour limit gameplay recordings with play/replay preview and management controls.

---

## Files to Create & Update

1. `src/types/profile.ts`: Define TypeScript interfaces for `FriendUser`, `ActivityFeedItem`, `ProfileAchievement`, `DetailedCareerStats`.
2. `src/utils/profileData.ts`: Initial mock social data, activity feed, achievements, and stats helpers.
3. `src/components/ProfileModal.tsx`: Complete overhaul of the profile window into a tabbed dark-themed modal.
4. `src/App.tsx`: Connect challenge friend action to launch matches directly from the profile modal.

---

## Verification Plan

1. **Compilation**: Run `compile_applet` to confirm zero syntax errors.
2. **Linting**: Run `lint_applet` to confirm TypeScript type safety.
3. **Server Restart**: Execute `restart_dev_server` to verify the live application.
