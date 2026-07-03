import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, CheckCircle2, Building2, BedDouble, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

const ROOM_TYPES = ['standard','double','suite','twin','family','single','deluxe','presidential'];

interface RoomDraft { type: string; room_number: string; floor: string; capacity: number }

const INIT_ROOM: RoomDraft = { type: 'standard', room_number: '', floor: '', capacity: 2 };

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [rooms, setRooms] = useState<RoomDraft[]>([{ ...INIT_ROOM }]);

  const { data: profile } = useQuery({
    queryKey: ['hotel-profile'],
    queryFn:  () => api.get('/hotel/profile').then((r) => r.data.data),
  });

  const addRoomMut = useMutation({
    mutationFn: (room: RoomDraft) => api.post('/hotel/rooms', room),
  });

  const completeMut = useMutation({
    mutationFn: () => api.post('/hotel/onboarding/complete'),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['hotel-profile'] }); navigate('/hotel/dashboard'); },
  });

  const addRoom = () => setRooms((r) => [...r, { ...INIT_ROOM }]);
  const removeRoom = (i: number) => setRooms((r) => r.filter((_, idx) => idx !== i));
  const updateRoom = (i: number, k: keyof RoomDraft, v: string | number) =>
    setRooms((r) => r.map((room, idx) => idx === i ? { ...room, [k]: v } : room));

  const handleRoomsNext = async () => {
    const validRooms = rooms.filter((r) => r.room_number.trim());
    for (const room of validRooms) {
      try { await addRoomMut.mutateAsync(room); } catch {}
    }
    setStep(2);
  };

  const STEPS = [
    { label: 'Bienvenue', icon: ShieldCheck },
    { label: 'Vos chambres', icon: BedDouble },
    { label: 'C\'est parti !', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#F5F4EF' }}>
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: '#1B3A5F' }}>
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-lg" style={{ color: '#1B3A5F' }}>CheckTunisia</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={{ background: i <= step ? '#1B3A5F' : '#E0DDD7', color: i <= step ? '#fff' : '#9ca3af' }}>
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i <= step ? 'text-gray-700' : 'text-gray-400'}`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-8 bg-gray-200" />}
          </div>
        ))}
      </div>

      <div className="card w-full max-w-md p-8">

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'linear-gradient(135deg,#1B3A5F,#2A5090)' }}>
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Bienvenue{profile ? `, ${profile.name}` : ''} !
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                Votre compte CheckTunisia est prêt. Prenons 2 minutes pour configurer votre
                établissement avant de commencer les check-ins.
              </p>
            </div>
            <div className="w-full flex flex-col gap-2 text-left p-4 rounded-xl" style={{ background: '#F5F4EF' }}>
              {['Ajouter vos chambres', 'Scanner votre premier passeport', 'Gérer vos check-ins'].map((item, i) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: '#1B3A5F' }}>{i + 1}</div>
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <Button fullWidth size="lg" className="gap-2" onClick={() => setStep(1)}>
              Commencer la configuration <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ── Step 1: Rooms ── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Vos chambres</h2>
              <p className="text-sm text-gray-400">Ajoutez vos chambres pour pouvoir assigner des check-ins. Vous pourrez en ajouter d'autres plus tard.</p>
            </div>

            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
              {rooms.map((room, i) => (
                <div key={i} className="rounded-xl p-3 flex flex-col gap-2" style={{ background: '#F5F4EF' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-500">Chambre {i + 1}</span>
                    {rooms.length > 1 && (
                      <button onClick={() => removeRoom(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="N° chambre" value={room.room_number}
                      onChange={(e) => updateRoom(i, 'room_number', e.target.value)} />
                    <Input label="Étage" value={room.floor}
                      onChange={(e) => updateRoom(i, 'floor', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Type</label>
                      <select className="input w-full" value={room.type}
                        onChange={(e) => updateRoom(i, 'type', e.target.value)}>
                        {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <Input label="Capacité" type="number" min={1} max={10} value={room.capacity}
                      onChange={(e) => updateRoom(i, 'capacity', parseInt(e.target.value) || 1)} />
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addRoom} className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#1B3A5F' }}>
              <Plus className="h-4 w-4" /> Ajouter une chambre
            </button>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep(2)}>Passer</Button>
              <Button fullWidth loading={addRoomMut.isPending} onClick={handleRoomsNext}>
                Enregistrer et continuer
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 2: Done ── */}
        {step === 2 && (
          <div className="flex flex-col items-center text-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Tout est prêt !</h2>
              <p className="text-sm text-gray-500">
                Votre établissement est configuré. Vous pouvez maintenant créer votre premier check-in.
              </p>
            </div>
            <Button fullWidth size="lg" loading={completeMut.isPending} onClick={() => completeMut.mutate()}>
              Accéder au tableau de bord
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
