export const BALLS = [
  { id:'mikasa-p850', name:'Mikasa P850 Four Square Ball', price:6400, color:'#83bd52', trim:'#ede1a5', pattern:'diagonal' },
  { id:'cannon-wound', name:'Cannon Sports 8.5″ Nylon-Wound Four Square Ball', price:3200, color:'#ed5734', trim:'#f2cf75', pattern:'tiles' },
  { id:'360-athletics', name:'360 Athletics Heavy-Duty Four Square Playball', price:1600, color:'#e6b32a', trim:'#414738', pattern:'panels' },
  { id:'cannon-multi', name:'Cannon Sports Multi-Game Rubber Playground Ball', price:800, color:'#e04f3b', trim:'#ea8a61', pattern:'ribs' },
  { id:'voit-vcg8h', name:'Voit VCG8H 8.5-Inch Four Square Utility Ball', price:400, color:'#d8a82f', trim:'#c27341', pattern:'tiles' },
  { id:'sportime-max', name:'Sportime Max 8.5″ Four Square Ball', price:200, color:'#e76765', trim:'#56a1ce', pattern:'dimples' },
  { id:'champion-textured', name:'Champion Sports 8.5″ Textured Playground Ball', price:100, color:'#e99d2e', trim:'#f7d27d', pattern:'diagonal' },
  { id:'gopher-rainbow', name:'Gopher Sport Rainbow 4-Square Ball', price:0, color:'#e48337', trim:'#88b46f', pattern:'panels' },
  { id:'spectrum', name:'S&S Worldwide Spectrum 2-Ply Playground Ball', price:0, color:'#c45f70', trim:'#ecb0a0', pattern:'ribs' },
  { id:'franklin-mystic', name:'Franklin Sports Mystic 8.5″ Rubber Playground Ball', price:0, color:'#343c4a', trim:'#31a1bf', pattern:'dimples' },
] as const;
export type BallDef = typeof BALLS[number];
export interface BallLook { id: BallDef['id']; color: string }
export const STARTER_BALL = BALLS[8];
export const validBallColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
