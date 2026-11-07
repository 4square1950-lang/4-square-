import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import {
  X,
  GraduationCap,
  BookOpen,
  Sparkles,
  Trophy,
  Users,
  Award,
  Zap,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Coins,
  Play,
  Volume2,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';
import { soundFX } from '../services/soundEffects';
import { CHARACTERS, CharacterDef } from '../utils/characters';
import { buildSeatedStudent, buildTeacherInstructor } from '../utils/characterModelBuilder';
import { FourSquareCoin } from './FourSquareCoin';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonQuiz {
  id: string;
  title: string;
  subject: string;
  teacher: string;
  description: string;
  statBonus: string;
  rewardCoins: number;
  questions: QuizQuestion[];
}

interface ClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMatchWithClassmate?: (classmate?: CharacterDef) => void;
  onRewardCoins?: (amount: number) => void;
}

const LESSON_QUIZZES: LessonQuiz[] = [
  {
    id: 'lesson-1',
    title: 'King Service & Square 1 Hierarchy',
    subject: 'Official Serving & Court Hierarchy',
    teacher: 'Coach Leo',
    description: 'Master the opening serve. Learn why Square 1 must always deliver an underhand strike into Square 4, and the penalties for illegal serves.',
    statBonus: '+10% Serve Placement',
    rewardCoins: 50,
    questions: [
      {
        id: 'q1-1',
        question: 'Under official Four Square rules, which player initiates every rally by serving?',
        options: [
          'Square 4 (Ace)',
          'Square 1 (King)',
          'The player who won the previous rally',
          'Any player chosen by coin toss',
        ],
        correctIndex: 1,
        explanation: 'Square 1 (the King) always serves the ball to begin play, delivering it underhand diagonally into Square 4.',
      },
      {
        id: 'q1-2',
        question: 'How must a legal Four Square serve be executed?',
        options: [
          'Overhand downward spike directly from hand',
          'Drop the ball, let it bounce once in Square 1, and hit underhand below waist',
          'Throw the ball into the air and kick it',
          'Bounce the ball twice in the server’s square before hitting',
        ],
        correctIndex: 1,
        explanation: 'The server must drop the ball, let it bounce once in their own square, and strike it cleanly underhand below waist level into Square 4.',
      },
    ],
  },
  {
    id: 'lesson-2',
    title: 'Inside Lines vs. Outside Boundaries',
    subject: 'Boundary Physics & Line Calls',
    teacher: 'Mr. Henderson',
    description: 'Understand the difference between neutral interior chalk seams and outer perimeter boundary lines.',
    statBonus: '+10% Corner Accuracy',
    rewardCoins: 50,
    questions: [
      {
        id: 'q2-1',
        question: 'If a struck ball lands directly on an INSIDE line (dividing two squares), what is the official call?',
        options: [
          'Out of bounds, hitter is eliminated immediately',
          'Redo / Line Ball (fault charged to nobody, replay the serve)',
          'Point awarded to the King automatically',
          'Double penalty with automatic elimination to queue',
        ],
        correctIndex: 1,
        explanation: 'Interior court lines dividing the four squares are neutral. A clean line landing is ruled a line ball or redo.',
      },
      {
        id: 'q2-2',
        question: 'If the ball lands on the OUTSIDE perimeter baseline of the court, what happens?',
        options: [
          'It is in bounds and play continues normally',
          'It is OUT of bounds, and the player who hit it is eliminated',
          'The King earns 2 bonus crown points',
          'A coin toss decides the fault',
        ],
        correctIndex: 1,
        explanation: 'Unlike tennis, outside court baselines in standard Four Square are out of bounds. Any strike landing on or beyond the exterior boundary eliminates the hitter.',
      },
    ],
  },
  {
    id: 'lesson-3',
    title: 'Receiver Faults & Contact Violations',
    subject: 'Receiving Discipline & Illegal Hits',
    teacher: 'Coach Leo',
    description: 'Learn when a receiver is allowed to strike the ball, and avoid illegal mid-air volleys, carries, and double contacts.',
    statBonus: '+15% Fault Recovery',
    rewardCoins: 50,
    questions: [
      {
        id: 'q3-1',
        question: 'When is a receiving player legally allowed to strike the ball entering their square?',
        options: [
          'In mid-air before it bounces (volley strike)',
          'ONLY after the ball bounces exactly once in their own square',
          'After the ball bounces twice',
          'While the ball is still hovering over the opponent’s square',
        ],
        correctIndex: 1,
        explanation: 'The ball must bounce once—and only once—inside your square before you may strike it. Striking in mid-air is an illegal receiver volley fault!',
      },
      {
        id: 'q3-2',
        question: 'What constitutes an illegal "Carry" or "Double Hit"?',
        options: [
          'Catching, scooping, lifting, or contacting the ball multiple times in one stroke',
          'Striking with an open palm with both hands touching together',
          'Hitting the ball softly into an adjacent square',
          'Calling a house rule before serving',
        ],
        correctIndex: 0,
        explanation: 'The ball must be struck with an open palm or closed fist in an instantaneous rebound. Lifting, scooping, or double-contacting eliminates the player.',
      },
    ],
  },
  {
    id: 'lesson-4',
    title: 'Schoolyard House Rules & Declarations',
    subject: 'Playground Culture & King Rules',
    teacher: 'Coach Leo',
    description: 'Explore classic schoolyard customs—Cherry Bombs, Bus Stops, Tea Parties, and Popcorn—and who holds the legal right to call them.',
    statBonus: '+250 RPM Spin Control',
    rewardCoins: 50,
    questions: [
      {
        id: 'q4-1',
        question: 'Who officially holds the privilege to declare active House Rules during schoolyard play?',
        options: [
          'Any player in the waiting queue',
          'The reigning King in Square 1 before delivering the serve',
          'The player in Square 4',
          'Whoever brought the rubber ball to recess',
        ],
        correctIndex: 1,
        explanation: 'By playground custom, the reigning King in Square 1 announces active house rules before serving.',
      },
      {
        id: 'q4-2',
        question: 'What does the classic schoolyard call "Cherry Bomb" represent?',
        options: [
          'A soft lob that bounces twice in the server’s square',
          'A high-velocity downward slam struck with maximum power',
          'A strike that must bounce through the receiver’s legs',
          'Spinning around 360 degrees before contacting the ball',
        ],
        correctIndex: 1,
        explanation: 'A Cherry Bomb is an explosive downward smash where the hitter strikes with maximum force, sending the ball soaring sky-high off the pavement.',
      },
    ],
  },
  {
    id: 'lesson-5',
    title: '45-Degree Vector Geometry & Corner Cuts',
    subject: 'Applied Trigonometry & Tactical Angling',
    teacher: 'Mr. Henderson',
    description: 'Calculate defensive coverage zones and execute 45-degree corner strikes that force opponents into lunging digs.',
    statBonus: '+12% Smash Power',
    rewardCoins: 50,
    questions: [
      {
        id: 'q5-1',
        question: 'Why is a 45-degree angle strike toward the far outer corner of an opponent’s square tactically devastating?',
        options: [
          'It gives the opponent extra time to recover',
          'It forces the receiver to travel maximum lateral distance away from the court center',
          'It guarantees an automatic line redo',
          'It reduces the rubber ball’s bounce height to zero',
        ],
        correctIndex: 1,
        explanation: 'Striking diagonally at 45 degrees targets the furthest geometric point from the receiver’s ready stance, forcing off-balance reach digs.',
      },
      {
        id: 'q5-2',
        question: 'When receiving a heavy topspin drop shot close to the line, what is the best recovery technique?',
        options: [
          'Stand upright and try to kick it',
          'Lower your center of gravity and use an upward underhand palm scoop to reset the rally',
          'Catch the ball with two hands',
          'Step completely out of bounds and concede the round',
        ],
        correctIndex: 1,
        explanation: 'Getting low under the ball’s apex and using an upward underhand palm strike absorbs the momentum and lofts a safe floater back into play.',
      },
    ],
  },
];

export const ClassroomModal: React.FC<ClassroomModalProps> = ({
  isOpen,
  onClose,
  onStartMatchWithClassmate,
  onRewardCoins,
}) => {
  const [activeTab, setActiveTab] = useState<'classroom' | 'lessons' | 'classmates'>('classroom');
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  
  // Active Quiz State
  const [activeQuiz, setActiveQuiz] = useState<LessonQuiz | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Selected Classmate Dialogue State
  const [inspectedClassmate, setInspectedClassmate] = useState<CharacterDef | null>(null);

  // 3D Scene Viewport Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const classroomGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Classmate roster
  const classroomStudents = [
    CHARACTERS[0], // Toby "Patch" McCall
    CHARACTERS[1], // Blocky
    CHARACTERS[2], // Skater Roxy
    CHARACTERS[4], // Gloop Slime King
    CHARACTERS[5], // Nova
    CHARACTERS[6], // Ren
  ];

  // Initialize 3D Classroom with Seated Students and Teaching Instructor
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0, 3.2, 7.2);
    camera.lookAt(0, 1.2, 0);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      renderer = new THREE.WebGLRenderer({ antialias: false });
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Warm Classroom Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xfffbe8, 0x1e293b, 1.4);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.8);
    keyLight.position.set(4, 7, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Room Container
    const room = new THREE.Group();
    classroomGroupRef.current = room;

    // Polished Oak Wooden Classroom Floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 14).rotateX(-Math.PI / 2), floorMat);
    floor.position.y = 0;
    floor.receiveShadow = true;
    room.add(floor);

    // Classroom North Wall (Front Chalkboard Wall)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wallMat);
    backWall.position.set(0, 3.0, -5.5);
    room.add(backWall);

    // Grand Green Chalkboard with Four Square Vector Math Diagram
    const boardCanvas = document.createElement('canvas');
    boardCanvas.width = 1024;
    boardCanvas.height = 512;
    const bctx = boardCanvas.getContext('2d');
    if (bctx) {
      bctx.fillStyle = '#064e3b';
      bctx.fillRect(0, 0, 1024, 512);

      // Wooden Frame
      bctx.strokeStyle = '#78350f';
      bctx.lineWidth = 16;
      bctx.strokeRect(8, 8, 1008, 496);

      // Chalk Text & Diagrams
      bctx.fillStyle = '#ffffff';
      bctx.font = 'bold 36px monospace';
      bctx.fillText('FOUR SQUARE GEOMETRY: 45° CORNER CUT', 40, 60);

      // Chalk Court Diagram
      bctx.strokeStyle = '#fbbf24';
      bctx.lineWidth = 4;
      bctx.strokeRect(360, 100, 300, 300);
      bctx.beginPath();
      bctx.moveTo(510, 100);
      bctx.lineTo(510, 400);
      bctx.moveTo(360, 250);
      bctx.lineTo(660, 250);
      bctx.stroke();

      bctx.fillStyle = '#fef08a';
      bctx.font = 'bold 28px sans-serif';
      bctx.fillText('1 (KING)', 390, 180);
      bctx.fillText('2', 580, 180);
      bctx.fillText('3', 580, 340);
      bctx.fillText('4 (ACE)', 390, 340);

      // 45 Degree Diagonal Vector Arrow from 1 to 4
      bctx.strokeStyle = '#ef4444';
      bctx.lineWidth = 6;
      bctx.beginPath();
      bctx.moveTo(440, 180);
      bctx.lineTo(590, 330);
      bctx.stroke();

      bctx.fillStyle = '#93c5fd';
      bctx.font = '22px monospace';
      bctx.fillText('• Square 1 Serves to Square 4', 40, 440);
      bctx.fillText('• 1 Bounce Minimum in Target', 40, 475);
    }
    const boardTex = new THREE.CanvasTexture(boardCanvas);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 3.2, 0.1),
      new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.35 })
    );
    board.position.set(0, 3.0, -5.4);
    room.add(board);

    // Teacher Podium & Red Voit Rubber Ball
    const podiumMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    const podium = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.9), podiumMat);
    podium.position.set(-3.6, 0.55, -3.4);
    podium.castShadow = true;
    room.add(podium);

    const redBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 })
    );
    redBall.position.set(-3.6, 1.34, -3.4);
    room.add(redBall);

    // 1. TEACHER INSTRUCTOR (Coach Leo) Standing at Chalkboard Teaching
    const teacher = buildTeacherInstructor('Coach Leo', 'Four Square Head Instructor');
    teacher.position.set(1.4, 0, -4.2);
    teacher.rotation.y = 0.2;
    room.add(teacher);

    // 2. SEATED STUDENTS AT DESKS (2 Rows x 3 Columns = 6 Students)
    const deskPositions = [
      { col: -1, row: 0, x: -2.4, z: -0.4, charIdx: 0 },
      { col: 0, row: 0, x: 0, z: -0.4, charIdx: 1 },
      { col: 1, row: 0, x: 2.4, z: -0.4, charIdx: 2 },
      { col: -1, row: 1, x: -2.4, z: 2.2, charIdx: 3 },
      { col: 0, row: 1, x: 0, z: 2.2, charIdx: 4 },
      { col: 1, row: 1, x: 2.4, z: 2.2, charIdx: 5 },
    ];

    deskPositions.forEach((dp) => {
      const studentChar = classroomStudents[dp.charIdx % classroomStudents.length];
      const studentDesk = buildSeatedStudent(studentChar, { deskWidth: 1.4, deskDepth: 0.8 });
      studentDesk.position.set(dp.x, 0, dp.z);
      room.add(studentDesk);
    });

    scene.add(room);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle camera sway or breathing
      if (classroomGroupRef.current) {
        classroomGroupRef.current.position.y = Math.sin(elapsed * 1.5) * 0.01;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.innerHTML = '';
      }
    };
  }, [isOpen]);

  // Click on 3D students/teacher in canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(sceneRef.current.children, true);

    for (const hit of intersects) {
      let cur: THREE.Object3D | null = hit.object;
      while (cur && cur !== sceneRef.current) {
        if ((cur as any).userData?.character) {
          const char = (cur as any).userData.character as CharacterDef;
          soundFX.playClick();
          setInspectedClassmate(char);
          return;
        }
        if ((cur as any).userData?.isTeacher) {
          soundFX.playWhistle();
          setActiveTab('lessons');
          return;
        }
        cur = cur.parent;
      }
    }
  };

  if (!isOpen) return null;

  // Handle Starting a Lesson Quiz
  const handleStartQuiz = (quiz: LessonQuiz) => {
    soundFX.playClick();
    setActiveQuiz(quiz);
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setCorrectAnswersCount(0);
    setQuizFinished(false);
  };

  // Submit Answer to Active Question
  const handleSubmitAnswer = () => {
    if (selectedOption === null || !activeQuiz) return;
    setIsAnswerSubmitted(true);

    const question = activeQuiz.questions[currentQuestionIdx];
    const isCorrect = selectedOption === question.correctIndex;

    if (isCorrect) {
      soundFX.playCheer();
      setCorrectAnswersCount((prev) => prev + 1);
    } else {
      soundFX.playAww();
    }
  };

  // Move to Next Question or Complete Quiz
  const handleNextQuestion = () => {
    if (!activeQuiz) return;

    if (currentQuestionIdx < activeQuiz.questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      // Quiz Finished!
      setQuizFinished(true);
      const isPassed = correctAnswersCount + (selectedOption === activeQuiz.questions[currentQuestionIdx].correctIndex ? 1 : 0) >= Math.ceil(activeQuiz.questions.length / 2);
      
      if (isPassed) {
        soundFX.playSchoolPAChime();
        soundFX.speakAnnouncer(`Classroom quiz passed! ${activeQuiz.statBonus} unlocked!`);
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });

        if (!completedLessons.includes(activeQuiz.id)) {
          setCompletedLessons((prev) => [...prev, activeQuiz.id]);
          if (onRewardCoins) {
            onRewardCoins(activeQuiz.rewardCoins);
          }
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col select-none font-sans text-slate-100 overflow-hidden animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="h-16 px-6 bg-slate-900 border-b border-amber-500/30 flex items-center justify-between shrink-0 shadow-xl z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 font-black">
              OAKRIDGE ELEMENTARY • FOUR SQUARE ACADEMY
            </span>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
              ROOM 104 • THEORY & SCHOOLYARD LIFE
            </h1>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab('classroom');
              setActiveQuiz(null);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'classroom' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            3D Classroom
          </button>
          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab('lessons');
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'lessons' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Optional Quizzes ({completedLessons.length}/{LESSON_QUIZZES.length})</span>
          </button>
          <button
            onClick={() => {
              soundFX.playClick();
              setActiveTab('classmates');
              setActiveQuiz(null);
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'classmates' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Classmates ({classroomStudents.length})</span>
          </button>
        </div>

        <button
          onClick={() => {
            soundFX.playClick();
            onClose();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-lg"
        >
          <X className="w-4 h-4" />
          <span>Exit School</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
        {/* LEFT / 3D CLASSROOM VIEWPORT (60% width) */}
        <div className="w-full md:w-3/5 h-1/2 md:h-full relative bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col">
          <div
            ref={containerRef}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-pointer touch-none z-10"
          />

          <div className="absolute top-4 left-4 z-20 pointer-events-none">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-amber-400/40 flex items-center gap-2 shadow-lg">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                💡 CLICK ON ANY STUDENT AT THEIR DESK OR TEACHER TO TALK & CHALLENGE!
              </span>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none flex items-center justify-between">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-[11px] text-slate-300">
              Teacher: <strong>Coach Leo</strong> • Blackboard: <strong>45° Vector Cut</strong>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-[11px] text-amber-300 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              <span>Pass optional quizzes to earn +50 Coins & Court Perks</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE PANEL: Lessons, Quizzes, Classmates or Character Dialogue */}
        <div className="w-full md:w-2/5 h-1/2 md:h-full bg-slate-950 p-6 overflow-y-auto flex flex-col">
          {/* Active Quiz View */}
          {activeQuiz ? (
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                      {activeQuiz.subject}
                    </span>
                    <h2 className="text-lg font-black text-white">{activeQuiz.title}</h2>
                  </div>
                  <button
                    onClick={() => setActiveQuiz(null)}
                    className="text-xs font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-900"
                  >
                    Back to Quizzes
                  </button>
                </div>

                {!quizFinished ? (
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}</span>
                      <span className="text-amber-400 font-bold">Reward: +{activeQuiz.rewardCoins} Coins</span>
                    </div>

                    {/* Question Card */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                      <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
                        {activeQuiz.questions[currentQuestionIdx].question}
                      </p>

                      {/* Options */}
                      <div className="space-y-2 pt-2">
                        {activeQuiz.questions[currentQuestionIdx].options.map((opt, oIdx) => {
                          const isSelected = selectedOption === oIdx;
                          const isCorrect = oIdx === activeQuiz.questions[currentQuestionIdx].correctIndex;
                          let btnStyle = 'bg-slate-950 border-slate-800 text-slate-200 hover:border-amber-400';

                          if (isAnswerSubmitted) {
                            if (isCorrect) {
                              btnStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-black';
                            } else if (isSelected) {
                              btnStyle = 'bg-rose-950/60 border-rose-500 text-rose-200';
                            } else {
                              btnStyle = 'bg-slate-950 border-slate-900 text-slate-500 opacity-60';
                            }
                          } else if (isSelected) {
                            btnStyle = 'bg-amber-500/20 border-amber-400 text-white font-black shadow-md';
                          }

                          return (
                            <button
                              key={oIdx}
                              disabled={isAnswerSubmitted}
                              onClick={() => {
                                soundFX.playClick();
                                setSelectedOption(oIdx);
                              }}
                              className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {isAnswerSubmitted && isCorrect && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                              {isAnswerSubmitted && isSelected && !isCorrect && (
                                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Referee Explanation on submit */}
                      {isAnswerSubmitted && (
                        <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-amber-400/30 text-xs text-amber-200 space-y-1 animate-in fade-in">
                          <div className="font-bold flex items-center gap-1.5 text-amber-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Referee Rulebook Citation:</span>
                          </div>
                          <p className="leading-relaxed">
                            {activeQuiz.questions[currentQuestionIdx].explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Quiz Results Screen */
                  <div className="space-y-4 mt-6 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-amber-400/20 border border-amber-400 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                      <Trophy className="w-8 h-8" />
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white">Quiz Completed!</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        You scored {correctAnswersCount} / {activeQuiz.questions.length} correct.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="text-xs text-amber-400 font-bold">Reward Unlocked:</div>
                      <div className="text-sm font-black text-white">{activeQuiz.statBonus}</div>
                      <div className="flex items-center justify-center gap-1.5 text-xs text-amber-300 font-mono">
                        <Coins className="w-4 h-4" />
                        <span>+{activeQuiz.rewardCoins} Four Square Coins</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveQuiz(null)}
                      className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg"
                    >
                      Return to Lesson Curriculum
                    </button>
                  </div>
                )}
              </div>

              {!quizFinished && (
                <div className="pt-4 border-t border-slate-800">
                  {!isAnswerSubmitted ? (
                    <button
                      disabled={selectedOption === null}
                      onClick={handleSubmitAnswer}
                      className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                        selectedOption !== null
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Submit Answer
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>
                        {currentQuestionIdx < activeQuiz.questions.length - 1
                          ? 'Next Question'
                          : 'View Quiz Results'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : inspectedClassmate ? (
            /* Student Dialogue & Challenge Card */
            <div className="flex-1 flex flex-col justify-between space-y-4 my-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-md"
                      style={{ backgroundColor: inspectedClassmate.avatarColor }}
                    >
                      {inspectedClassmate.name[0]}
                    </div>
                    <div>
                      <h3 className="font-black text-base text-white">{inspectedClassmate.name}</h3>
                      <div className="text-xs text-amber-400 font-bold">{inspectedClassmate.nickname}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setInspectedClassmate(null)}
                    className="p-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quote Bubble */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-sm italic text-slate-200">
                  "{inspectedClassmate.quote}"
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Corner Cut</span>
                    <div className="text-sm font-black text-amber-400">{inspectedClassmate.cornerCutAccuracy}%</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Smash Speed</span>
                    <div className="text-sm font-black text-cyan-400">{inspectedClassmate.smashVelocityMph} MPH</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Spin Control</span>
                    <div className="text-sm font-black text-emerald-400">{inspectedClassmate.spinControlRpm} RPM</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Fault Recovery</span>
                    <div className="text-sm font-black text-rose-400">{inspectedClassmate.faultRecoveryRate}%</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-800">
                <button
                  onClick={() => {
                    soundFX.playClick();
                    if (onStartMatchWithClassmate) {
                      onStartMatchWithClassmate(inspectedClassmate);
                    }
                    onClose();
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  <span>Challenge {inspectedClassmate.name} to Match!</span>
                </button>
                <button
                  onClick={() => setInspectedClassmate(null)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Close Dialogue
                </button>
              </div>
            </div>
          ) : activeTab === 'classroom' ? (
            /* Tab 1: 3D Classroom Overview */
            <div className="space-y-6 my-auto">
              <div className="space-y-2">
                <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest">
                  OAKRIDGE FOUR SQUARE ACADEMY
                </span>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Welcome to Theory Class
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Students study court trigonometry, spin physics, and official USFA rules here before hitting the asphalt. Click any student at their desk to trade tips or invite them directly to a Four Square match!
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('lessons')}
                  className="w-full p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-400 text-left transition-all cursor-pointer flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-black shrink-0 border border-amber-400/30">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                      Attend Optional Four Square Quizzes
                    </div>
                    <div className="text-xs text-slate-400">
                      Earn +50 Coins & Stat Boosts on Rules & Geometry
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    soundFX.playClick();
                    if (onStartMatchWithClassmate) onStartMatchWithClassmate();
                    onClose();
                  }}
                  className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-left transition-all cursor-pointer flex items-center gap-4 hover:brightness-110 shadow-lg"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-950/20 text-slate-950 flex items-center justify-center font-black shrink-0">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-black uppercase tracking-wide">
                      Start Recess Four Square Match
                    </div>
                    <div className="text-xs font-bold text-slate-900/80">
                      Head to the court with the classroom lineup
                    </div>
                  </div>
                </button>
              </div>
            </div>
          ) : activeTab === 'lessons' ? (
            /* Tab 2: Optional Quizzes Curriculum */
            <div className="space-y-4 my-auto">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest">
                  OPTIONAL THEORY QUIZZES
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {completedLessons.length} / {LESSON_QUIZZES.length} Passed
                </span>
              </div>

              <div className="space-y-3">
                {LESSON_QUIZZES.map((quiz) => {
                  const isDone = completedLessons.includes(quiz.id);
                  return (
                    <div
                      key={quiz.id}
                      className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-cyan-400 font-bold">{quiz.subject}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30">
                          {quiz.statBonus}
                        </span>
                      </div>

                      <h3 className="font-black text-sm text-white">{quiz.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{quiz.description}</p>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-mono">
                          Taught by {quiz.teacher} • +{quiz.rewardCoins} Coins
                        </span>

                        {isDone ? (
                          <span className="flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30">
                            <Check className="w-3.5 h-3.5" />
                            <span>Passed</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleStartQuiz(quiz)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow"
                          >
                            <Play className="w-3 h-3 fill-slate-950" />
                            <span>Take Quiz</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Tab 3: Classmates Roster */
            <div className="space-y-4 my-auto text-left">
              <div className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest">
                CLASSMATES & CLASSROOM CHALLENGERS
              </div>

              <div className="space-y-2.5">
                {classroomStudents.map((student, sIdx) => (
                  <div
                    key={student.id}
                    className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between hover:border-amber-400/40 transition-colors"
                  >
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => setInspectedClassmate(student)}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0 shadow"
                        style={{ backgroundColor: student.avatarColor }}
                      >
                        {student.name[0]}
                      </div>
                      <div>
                        <div className="font-black text-sm text-white flex items-center gap-2">
                          <span>{student.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            Desk #{sIdx + 1}
                          </span>
                        </div>
                        <div className="text-xs text-amber-300">{student.nickname}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setInspectedClassmate(student)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                        title="Talk to Student"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (onStartMatchWithClassmate) onStartMatchWithClassmate(student);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer shadow"
                      >
                        Challenge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
