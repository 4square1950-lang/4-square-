import React, { useState } from 'react';
import { X, BookOpen, CheckSquare, Layers, Award, Scale, HelpCircle } from 'lucide-react';

interface RulebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHAPTERS = [
  {
    id: '01',
    title: '01 • Scope & Quick Start',
    summary: 'The 60-second explanation & league vs school baseline',
    content: `
### The 60-Second Explanation
• Four players occupy ranked squares 1, 2, 3 and 4; 1 is the highest (King), 4 the entry square (Rookie).
• The player in 1 drops and strikes the ball toward 4.
• Players keep the ball moving by hitting it into another square.
• A legal rally ends when a player commits an error. That player joins the back of the waiting line; lower-ranked players advance to fill the gap; the first waiting player enters 4.
• The aim is to reach square 1 and remain there. Four square is normally continuous rotation rather than a match with an automatic final winner.

### This Book's Baseline
• Default to the **Play Four Square league interpretation**: 16-foot court, 8-foot quarters, outside lines IN, inside lines OUT, drop-and-hit serve from 1 to diagonal 4, a one-fault allowance to the receiving player, and volleys allowed during ordinary rallies.
• **Playworks' school version**: 10-foot court, return required after a bounce, all line touches send hitter to queue.
    `,
  },
  {
    id: '02',
    title: '02 • Court, Ball & Setup',
    summary: 'Geometry, diagonal ranks, surface & clearance',
    content: `
### Court Dimensions
• Large square 16 ft by 16 ft, divided into four equal 8 ft by 8 ft squares. Lines no wider than 1 inch.
• Outer perimeter is the outside line; central cross consists of inside lines.
• **Diagonal Ranks**: Arrange ranks so 1 and 4 are diagonal! Top row: 1 | 2; Bottom row: 3 | 4. The other diagonal is 2 and 3.

### Ball & Surface
• 8.5-inch rubber playground ball that bounces reliably (~2 lbs inflation).
• Level surface with at least 6 feet of clearance around the court perimeter.
• Place active players in squares 1, 2, 3, 4 and all additional players in a first-in, first-out waiting line!
    `,
  },
  {
    id: '03',
    title: '03 • Serving & Rally Start',
    summary: 'Drop serve from 1 to diagonal 4 & receiver fault',
    content: `
### League Baseline Serve
• The player in 1 is always the server.
• From within or near their square, the server drops the ball, lets it bounce once, and hits it by hand into diagonal square 4.
• The receiving player lets the serve bounce once in 4 and returns it into another square.
• If server sends the ball outside 4, into an inside line, or fails to offer a legal serve, call a serve redo (repeat serve with no receiver elimination).

### Receiver's Fault Allowance
• Under Play Four Square rules, the receiver is allowed **one bad return per round**.
• On the first incorrect strike or return, replay the serve and state **"Fault: ONE"**.
• The second bad return eliminates them. This allowance belongs exclusively to the receiver of the serve!
    `,
  },
  {
    id: '04',
    title: '04 • Legal Hits & Possession',
    summary: 'Hands only, volleys vs bounce, poaching fouls',
    content: `
### Contact
• Legal strike uses the hand between wrist and fingertips, including back of hand; open hand or closed fist allowed.
• Do NOT catch, throw, carry, hold, cradle or rest the ball against the body.
• Spin is legal when created by a clean strike. Arm, leg, foot or head touches are illegal.
• Each player may hit only once per play (no double tapping).

### Before & After the Bounce
• **Before Bounce**: In League mode, any active player may volley the ball out of the air.
• **After Bounce**: Once it bounces in a square, that square's owner has exclusive right and obligation to play it.
• **Poaching**: An outsider who hits after a bounce in another player's square commits poaching and is OUT!
• Owner may let the ball bounce no more than once. A second bounce eliminates the owner.
    `,
  },
  {
    id: '05',
    title: '05 • Landings, Lines & Out Calls',
    summary: 'Outside lines IN, inside lines OUT, patch contact',
    content: `
### League Line Rule
• **Outside Line = IN**: A ball touching an outside perimeter line is IN and playable!
• **Inside Line = OUT**: A ball touching any part of an inside dividing line is OUT; the last hitter is eliminated!
• Ball landing wholly beyond outside line is OUT; last hitter eliminated.
• Ball landing back in hitter's own square is an error on the hitter: eliminated!
• Use ball's point or patch of initial floor contact, not its shadow.
    `,
  },
  {
    id: '06',
    title: '06 • Errors, Elimination & Rotation',
    summary: 'Who is out, stepping up ranks & queue entry',
    content: `
### Who is Out?
• **Owner is OUT**: For a second bounce in their square, or failure to return a ball that bounced there.
• **Hitter is OUT**: For a landing beyond perimeter, on an inside line, or back in own square.
• **Offender is OUT**: For illegal body contact, carrying, second hit, or poaching.

### Fill the Opening (Rotation)
• The eliminated player leaves and joins the end of the waiting queue.
• Everyone below the vacant rank advances one rank:
  - If 2 is out: 3 moves to 2, 4 moves to 3, queue enters 4.
  - If 1 is out: 2 moves to 1 (New King!), 3 to 2, 4 to 3, queue enters 4.
  - If 4 is out: next waiting player replaces them in 4.
    `,
  },
  {
    id: '07',
    title: '07 • Interference & Showdowns',
    summary: 'External interruptions & 2-player Showdowns',
    content: `
### External Interference
• When the live ball touches an outside object, stray ball, spectator or hazardous slip, call interference and replay the round with the same four players.

### Showdowns for Close Calls
• For an unresolvable dispute, Play Four Square describes a two-player Showdown (Rock Paper Scissors or quick point).
• The loser leaves to the queue; winner remains. Showdowns do not add an ordinary error to records.
    `,
  },
  {
    id: '08',
    title: '08 • House Rules & King Calls',
    summary: 'Top square announcements & accessible variants',
    content: `
### How to Add a Rule
• In Play Four Square's tradition, the player in Square 1 (King) may announce a special house rule for that round:
  - **No Volleys**: Must let ball bounce once.
  - **Cherry Bomb**: High bounce shots encouraged!
  - **Underhand Only**: Low soft strikes.
  - **Corner Pocket**: Deep shots only.
• The King must call the rule again next round or defaults return.
    `,
  },
  {
    id: '09',
    title: '09 • Scoring & Tournaments',
    summary: 'Crown holds, continuous rotation & formats',
    content: `
### Continuous Recess
• Traditional playground queue format ranks court positions. Aim is to reach and hold Square 1.

### Championship Format (Schoolyard Showdown)
• Players earn points or **Crown Holds** for each round survived while occupying Square 1.
• Reach **5 Crown Holds** as King to win the Playground Championship!
    `,
  },
  {
    id: '10',
    title: '10 • Official Decision Tree',
    summary: 'Step-by-step checklist for digital & court referees',
    content: `
### Official Decision Order
1. **Did an outside object interrupt live ball?** -> If yes, STOP & replay.
2. **Did a player make illegal contact or poach?** -> If yes, eliminate offender (subject to receiver's 1st fault allowance).
3. **Was first bounce outside or on an inside line?** -> If yes, eliminate last hitter!
4. **Did ball land in hitter's own square?** -> If yes, eliminate hitter!
5. **Did ball bounce twice in owner's square?** -> If yes, eliminate owner!
6. **Otherwise** -> Continue the rally!
    `,
  },
];

export const RulebookModal: React.FC<RulebookModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState(CHAPTERS[0].id);

  if (!isOpen) return null;

  const currentChapter = CHAPTERS.find((c) => c.id === activeTab) || CHAPTERS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400 text-slate-950">
              <BookOpen className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">FOUR SQUARE OFFICIAL RULEBOOK</h2>
              <p className="text-xs text-slate-400">
                10-Page practical guide: Play Four Square league baseline & Playworks school variations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Sidebar Chapters + Chapter Viewer */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Sidebar */}
          <div className="w-full md:w-72 bg-slate-950/60 border-r border-slate-800/80 p-3 overflow-y-auto flex md:flex-col gap-1.5 shrink-0">
            {CHAPTERS.map((chap) => {
              const isActive = chap.id === activeTab;
              return (
                <button
                  key={chap.id}
                  onClick={() => setActiveTab(chap.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                      : 'border-transparent text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs">{chap.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">{chap.summary}</div>
                </button>
              );
            })}
          </div>

          {/* Main Reading Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                Chapter {currentChapter.id}
              </span>
              <h1 className="text-2xl font-black text-white mt-1">{currentChapter.title}</h1>
              <p className="text-sm text-slate-400 mt-1">{currentChapter.summary}</p>
            </div>

            {/* Markdown-like rendered content */}
            <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed space-y-3 whitespace-pre-line font-sans">
              {currentChapter.content}
            </div>

            {/* Quick Visual Infobox on Chapter 5 */}
            {currentChapter.id === '05' && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50">
                  <div className="font-bold text-emerald-400 text-sm">OUTSIDE LINE = IN</div>
                  <p className="text-slate-300 mt-1">
                    Touching the outside perimeter line is legal and in play under official league rules!
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50">
                  <div className="font-bold text-rose-400 text-sm">INSIDE LINE = OUT</div>
                  <p className="text-slate-300 mt-1">
                    Touching any part of the inside cross dividing lines is OUT. Last hitter is eliminated!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6">
          <span>Sources: Play Four Square (squarefour.org) & Playworks</span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 font-bold text-slate-950 transition-all cursor-pointer"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};
