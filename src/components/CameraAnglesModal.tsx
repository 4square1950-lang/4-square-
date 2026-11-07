import React from 'react';
import { X, Camera, Eye, User, Compass, Video, Check, Layers } from 'lucide-react';
import { soundFX } from '../services/soundEffects';
import { CameraViewMode } from './HamburgerDropdown';

interface CameraAnglesModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameraView: CameraViewMode;
  onSelectCameraView: (view: CameraViewMode) => void;
}

export const CameraAnglesModal: React.FC<CameraAnglesModalProps> = ({
  isOpen,
  onClose,
  cameraView,
  onSelectCameraView,
}) => {
  if (!isOpen) return null;

  const views: { id: CameraViewMode; title: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'first_person',
      title: '1st Person (Immersive)',
      desc: 'See the court directly through your character\'s eyes. Default experience.',
      icon: <Eye className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'third_person',
      title: '3rd Person (Over-Shoulder)',
      desc: 'Follow right behind your player with clear view of all 4 squares.',
      icon: <User className="w-5 h-5 text-cyan-400" />,
    },
    {
      id: 'isometric',
      title: 'Isometric 3/4 Broadcast',
      desc: 'Elevated broadcast stadium angle framing all players and spectators.',
      icon: <Layers className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'top_down',
      title: 'Top-Down Tactical Radar',
      desc: 'Birds-eye perpendicular view of all four quadrants and lines.',
      icon: <Compass className="w-5 h-5 text-purple-400" />,
    },
    {
      id: 'action',
      title: 'Action Dynamic Cam',
      desc: 'Low-angle cinematic tracking focusing on strikes and dives.',
      icon: <Video className="w-5 h-5 text-rose-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border-2 border-amber-400 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">CAMERA ANGLES</h2>
              <p className="text-xs text-slate-400">Select your preferred viewing perspective</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFX.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-5 space-y-2.5">
          {views.map((v) => {
            const isSelected = cameraView === v.id;
            return (
              <button
                key={v.id}
                onClick={() => {
                  soundFX.playClick();
                  onSelectCameraView(v.id);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400/20 text-white shadow-lg ring-1 ring-amber-400/50'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                    {v.icon}
                  </div>
                  <div>
                    <div className="text-sm font-black flex items-center gap-2">
                      <span>{v.title}</span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400 text-slate-950">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{v.desc}</div>
                  </div>
                </div>

                {isSelected && <Check className="w-5 h-5 text-amber-400 stroke-[3] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
