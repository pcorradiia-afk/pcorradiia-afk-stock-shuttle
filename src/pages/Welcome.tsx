import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createProfile,
  deleteProfile,
  gradeLabel,
  listProfiles,
  PlayerId,
  PlayerProfile,
  PROFILE_COLORS,
  PROFILE_EMOJIS,
  selectPlayer,
  updateProfile,
  useGameState,
} from "@/store/game";
import { Level, LEVEL_META, LEVEL_ORDER } from "@/data/trivia";

type EditorMode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; profile: PlayerProfile };

export function Welcome() {
  const navigate = useNavigate();
  const game = useGameState();
  const profiles = listProfiles(game);
  const [editor, setEditor] = useState<EditorMode>({ kind: "closed" });

  useEffect(() => {
    if (game.activePlayer) navigate("/", { replace: true });
  }, [game.activePlayer, navigate]);

  function choose(id: PlayerId) {
    selectPlayer(id);
    navigate("/");
  }

  return (
    <div className="min-h-screen safe-top safe-bottom bg-gradient-to-br from-sky-500 via-violet-600 to-fuchsia-600 text-white px-6 py-10 flex flex-col">
      <div className="text-center mb-8">
        <div className="text-6xl mb-2">⚽</div>
        <h1 className="text-3xl font-extrabold leading-tight">Mundial 2026</h1>
        <p className="text-lg font-semibold opacity-90">Mi Álbum de Figuritas</p>
        <p className="text-sm opacity-80 mt-2">Respondé trivia y ganá figuritas 🇦🇷</p>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-4 max-w-sm mx-auto w-full">
        <p className="text-center font-semibold mb-1">¿Quién va a jugar?</p>

        {profiles.map((p) => (
          <div key={p.id} className="relative">
            <button
              onClick={() => choose(p.id)}
              className={`w-full relative overflow-hidden rounded-3xl p-5 text-left bg-gradient-to-br ${p.color} shadow-xl active:scale-95 transition-transform border-4 border-white/30`}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center text-4xl border-2 border-white/40">
                  {p.emoji}
                </div>
                <div className="flex-1 pr-10">
                  <div className="text-2xl font-extrabold">{p.name}</div>
                  <div className="text-sm opacity-90">{gradeLabel(p.defaultLevel)}</div>
                </div>
                <div className="text-2xl">▶</div>
              </div>
              <div className="shine absolute inset-0 pointer-events-none" />
            </button>
            <button
              aria-label={`Editar ${p.name}`}
              onClick={(e) => {
                e.stopPropagation();
                setEditor({ kind: "edit", profile: p });
              }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/25 backdrop-blur text-white text-sm flex items-center justify-center border border-white/40 active:scale-90"
            >
              ✎
            </button>
          </div>
        ))}

        <button
          onClick={() => setEditor({ kind: "create" })}
          className="rounded-3xl p-4 text-center bg-white/15 backdrop-blur border-2 border-dashed border-white/50 font-extrabold text-white active:scale-95"
        >
          + Crear perfil
        </button>
      </div>

      <p className="text-center text-xs opacity-70 mt-6">
        Hecho con ❤️ para Dante y Otto
      </p>

      {editor.kind !== "closed" && (
        <ProfileEditor
          initial={editor.kind === "edit" ? editor.profile : null}
          onClose={() => setEditor({ kind: "closed" })}
        />
      )}
    </div>
  );
}

function ProfileEditor({
  initial,
  onClose,
}: {
  initial: PlayerProfile | null;
  onClose: () => void;
}) {
  const isEdit = initial !== null;
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? PROFILE_EMOJIS[0]);
  const [color, setColor] = useState(initial?.color ?? PROFILE_COLORS[0]);
  const [level, setLevel] = useState<Level>(initial?.defaultLevel ?? "primaria-baja");

  function onSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (initial) {
      updateProfile(initial.id, { name: trimmed, emoji, color });
    } else {
      createProfile({ name: trimmed, emoji, color, level });
    }
    onClose();
  }

  function onDelete() {
    if (!initial) return;
    if (!confirm(`¿Borrar el perfil de ${initial.name}? Se pierden sus figuritas y aciertos.`)) {
      return;
    }
    deleteProfile(initial.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-extrabold">
            {isEdit ? "Editar perfil" : "Nuevo perfil"}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-500"
          >
            ✕
          </button>
        </div>

        <label className="block text-sm font-bold mb-1">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Felipe"
          maxLength={20}
          className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 mb-4 focus:border-primary outline-none"
        />

        <div className="text-sm font-bold mb-2">Avatar</div>
        <div className="grid grid-cols-8 gap-1.5 mb-4">
          {PROFILE_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition ${
                emoji === e
                  ? "bg-primary/15 border-2 border-primary scale-105"
                  : "bg-slate-100 border-2 border-transparent"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="text-sm font-bold mb-2">Color</div>
        <div className="grid grid-cols-8 gap-1.5 mb-4">
          {PROFILE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`aspect-square rounded-xl bg-gradient-to-br ${c} transition ${
                color === c ? "ring-4 ring-slate-900/30 scale-105" : ""
              }`}
            />
          ))}
        </div>

        {!isEdit && (
          <>
            <div className="text-sm font-bold mb-2">Grado</div>
            <div className="grid grid-cols-1 gap-1.5 mb-4">
              {LEVEL_ORDER.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={`text-left px-3 py-2 rounded-xl border-2 text-sm font-bold transition ${
                    level === lvl
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-slate-200 text-slate-700"
                  }`}
                >
                  {LEVEL_META[lvl].label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="rounded-2xl bg-slate-50 p-3 mb-4 flex items-center gap-3">
          <div
            className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-3xl border-2 border-white shadow`}
          >
            {emoji}
          </div>
          <div>
            <div className="font-extrabold">{name.trim() || "Tu nombre"}</div>
            <div className="text-xs text-slate-500">Vista previa</div>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={!name.trim()}
          className="w-full rounded-2xl py-3 bg-gradient-to-br from-sky-500 to-indigo-500 text-white font-extrabold shadow active:scale-95 disabled:opacity-50"
        >
          {isEdit ? "Guardar" : "Crear y jugar"}
        </button>

        {isEdit && (
          <button
            onClick={onDelete}
            className="w-full mt-2 rounded-2xl py-3 bg-rose-50 text-rose-600 font-bold active:scale-95"
          >
            Borrar perfil
          </button>
        )}
      </div>
    </div>
  );
}
