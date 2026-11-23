import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { soundFX } from '../services/soundEffects';
import { CHARACTERS, CharacterDef } from '../utils/characters';
import { buildSeatedStudent } from '../utils/characterModelBuilder';
import { animateCampusTeacher, buildCampusTeacher } from '../utils/campusRooms';

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
  onRewardCoins?: (amount: number) => void;
  passedLessons?:string[];
  onPassLesson?:(id:string,coins:number)=>void;
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

const ASSESSMENTS:LessonQuiz[] = [...LESSON_QUIZZES,{
  ...LESSON_QUIZZES[0], id:'court-exam', subject:'School Circuit assessment', title:'Four Square practical test',
  description:'Apply serving, receiving, line calls, and court science.', rewardCoins:100,
  questions:LESSON_QUIZZES.flatMap(({questions})=>questions.slice(0,1)),
}];

export const ClassroomModal: React.FC<ClassroomModalProps> = ({
  isOpen,
  onClose,
  onRewardCoins,
  passedLessons,
  onPassLesson,
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
  const workbookOpen=useRef(false);
  workbookOpen.current=Boolean(activeQuiz && !quizFinished);
  useEffect(()=>{if(passedLessons)setCompletedLessons(passedLessons);},[passedLessons]);

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
      new THREE.BoxGeometry(10.3, 3.55, 0.1),
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
    const teacher = buildCampusTeacher();
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

    const desks = deskPositions.map((dp) => {
      const studentChar = classroomStudents[dp.charIdx % classroomStudents.length];
      const studentDesk = buildSeatedStudent(studentChar, { deskWidth: 1.4, deskDepth: 0.8 });
      studentDesk.position.set(dp.x, 0, dp.z);
      room.add(studentDesk);
      return studentDesk;
    });

    scene.add(room);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      desks.forEach((desk,index)=>{
        const writing=desk.getObjectByName('writingHand');
        if (writing) {
          writing.position.x=.18+Math.sin(elapsed*3+index)*.08;
          writing.position.z=.11+Math.cos(elapsed*2.8+index)*.04;
          writing.rotation.z=Math.sin(elapsed*2+index)*.11;
        }
      });
      animateCampusTeacher(teacher, elapsed);
      teacher.rotation.y=.2+Math.sin(elapsed*1.2)*.23;
      camera.position.lerp(workbookOpen.current ? new THREE.Vector3(.95,2.12,2.56) : new THREE.Vector3(0,3.2,7.2),.06);
      if(workbookOpen.current) camera.lookAt(0,.75,2.2);
      else camera.lookAt(0,1.6,-2);

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
          setActiveTab('classmates');
          return;
        }
        if (cur.userData.isTeacher) {
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
    if (selectedOption === null || !activeQuiz || isAnswerSubmitted) return;
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
      const isPassed = correctAnswersCount >= Math.ceil(activeQuiz.questions.length * (activeQuiz.id==='court-exam' ? .75 : .5));
      
      if (isPassed) {
        soundFX.playSchoolPAChime();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });

        if (!completedLessons.includes(activeQuiz.id)) {
          setCompletedLessons((prev) => [...prev, activeQuiz.id]);
          if (onPassLesson) onPassLesson(activeQuiz.id,activeQuiz.rewardCoins);
          else if (onRewardCoins) {
            onRewardCoins(activeQuiz.rewardCoins);
          }
        }
      }
    }
  };

  const question = activeQuiz?.questions[currentQuestionIdx];
  const passed = activeQuiz && correctAnswersCount >= Math.ceil(activeQuiz.questions.length * (activeQuiz.id === 'court-exam' ? .75 : .5));
  const showLessons = () => { setActiveQuiz(null); setActiveTab('lessons'); };

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/70 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Classroom">
      <section className="league-panel flex h-full w-full max-w-6xl flex-col overflow-hidden">
        <header className="league-header flex-wrap gap-3">
          <h2>Classroom</h2>
          <nav aria-label="Classroom sections" className="flex flex-wrap gap-2">
            <button className="league-button" aria-pressed={activeTab === 'classroom'} onClick={() => { setActiveQuiz(null); setActiveTab('classroom'); }}>Room</button>
            <button className="league-button" aria-pressed={activeTab === 'lessons'} onClick={showLessons}>Quizzes &amp; tests</button>
            <button className="league-button" aria-pressed={activeTab === 'classmates'} onClick={() => { setActiveQuiz(null); setActiveTab('classmates'); }}>Classmates</button>
          </nav>
          <button className="league-button" onClick={onClose}>Back</button>
        </header>
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(9rem,38%)_1fr] md:grid-cols-[1.25fr_1fr] md:grid-rows-1">
          <div className="min-h-0 cursor-pointer bg-[#282f2a]" ref={containerRef} onClick={handleCanvasClick} />
          <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
            {activeTab === 'classroom' && <div className="grid gap-4">
              <h3 className="text-xl font-semibold">Court tactics</h3>
              <button className="league-primary justify-self-start" onClick={showLessons}>Open workbook</button>
            </div>}
            {activeTab === 'lessons' && !activeQuiz && <div className="grid gap-3">
              <h3 className="text-lg font-semibold">Workbook</h3>
              {LESSON_QUIZZES.map((quiz) => <button key={quiz.id} className="league-button flex justify-between gap-3 text-left" onClick={() => handleStartQuiz(quiz)}>
                <span>{quiz.title}</span><span>{completedLessons.includes(quiz.id) ? 'Passed' : quiz.id === 'court-exam' ? 'Test' : 'Quiz'}</span>
              </button>)}
            </div>}
            {activeTab === 'lessons' && activeQuiz && question && <div key={question.id} className="grid gap-4">
              <button className="league-button justify-self-start" onClick={showLessons}>All lessons</button>
              <h3 className="text-lg font-semibold">{activeQuiz.title}</h3>
              {quizFinished ? <div role="status">
                <strong>{passed ? 'Passed' : 'Try again'}</strong>
                <p>{correctAnswersCount} of {activeQuiz.questions.length} correct</p>
                {!passed && <button className="league-primary mt-3" onClick={() => handleStartQuiz(activeQuiz)}>Retake</button>}
              </div> : <>
                <progress className="w-full accent-amber-200" max={activeQuiz.questions.length} value={currentQuestionIdx + 1} aria-label="Workbook progress" />
                <p className="text-sm text-stone-300">Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}</p>
                <p>{question.question}</p>
                {question.options.map((option, index) => <button key={option} disabled={isAnswerSubmitted} aria-pressed={selectedOption === index} className="league-button text-left disabled:opacity-70" onClick={() => setSelectedOption(index)}>{option}</button>)}
                {isAnswerSubmitted ? <>
                  <div role="status" className="rounded-lg border border-white/15 p-3">
                    <strong>{selectedOption === question.correctIndex ? 'Correct' : 'Incorrect'}</strong>
                    <p>{question.explanation}</p>
                  </div>
                  <button className="league-primary" onClick={handleNextQuestion}>{currentQuestionIdx + 1 === activeQuiz.questions.length ? 'See results' : 'Next question'}</button>
                </> : <button className="league-primary" disabled={selectedOption === null} onClick={handleSubmitAnswer}>Check answer</button>}
              </>}
            </div>}
            {activeTab === 'classmates' && <div className="grid gap-3">
              <h3 className="text-lg font-semibold">Classmates</h3>
              {classroomStudents.map((student) => <button className="league-button text-left" key={student.id} aria-pressed={inspectedClassmate?.id === student.id} onClick={() => setInspectedClassmate(student)}>{student.name}</button>)}
              {inspectedClassmate && <p className="border-t border-white/15 pt-3">{inspectedClassmate.quote}</p>}
            </div>}
          </div>
        </div>
      </section>
    </div>
  );
};
