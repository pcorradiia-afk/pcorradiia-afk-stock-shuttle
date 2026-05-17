import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { GoalKick } from "@/components/play/GoalKick";
import { QuestionCard } from "@/components/play/QuestionCard";
import { PackReveal } from "@/components/play/PackReveal";
import { Category, pickQuestions, Question } from "@/data/trivia";
import {
  awardPack,
  awardSingle,
  openOnePack,
  recordAnswer,
  useActivePlayer,
} from "@/store/game";
import { StickerCard } from "@/components/album/StickerCard";
import { ALL_STICKERS, Sticker } from "@/data/stickers";
import { Confetti } from "@/components/Confetti";

type Phase = "idle" | "kick" | "question" | "result" | "pack" | "session";

const ROUND_QUESTIONS = 5;
const STREAK_PACK_AT = 3;

export function Play() {
  const active = useActivePlayer();
  const [phase, setPhase] = useState<Phase>("idle");
  const [question, setQuestion] = useState<Question | null>(null);
  const [stickerWon, setStickerWon] = useState<Sticker | null>(null);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [questionsDone, setQuestionsDone] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [streakInRound, setStreakInRound] = useState(0);
  const [kickKey, setKickKey] = useState(0);
  const [packKey, setPackKey] = useState(0);

  useEffect(() => {
    if (active && active.state.unopenedPacks > 0 && phase === "idle") {
      setPhase("pack");
    }
  }, [active, phase]);

  if (!active) return null;
  const level = active.profile.level;

  function startRound() {
    setRoundCorrect(0);
    setQuestionsDone(0);
    setStreakInRound(0);
    setKickKey((k) => k + 1);
    setPhase("kick");
  }

  function onKickDone(cat: Category) {
    const [q] = pickQuestions(level, 1, [cat]);
    setQuestion(q ?? null);
    setPhase("question");
  }

  function rewardSticker(): Sticker {
    const missing = ALL_STICKERS.filter((s) => !active!.state.ownedCounts[s.id]);
    const pool = missing.length > 0 ? missing : ALL_STICKERS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    awardSingle(pick.id);
    return pick;
  }

  function onQuestionDone(correct: boolean) {
    if (!question) return;
    recordAnswer(question.category, correct);
    let won: Sticker | null = null;
    let newStreak = streakInRound;
    if (correct) {
      won = rewardSticker();
      newStreak = streakInRound + 1;
      setStreakInRound(newStreak);
      setShowConfetti(true);
      window.setTimeout(() => setShowConfetti(false), 1500);
    } else {
      setStreakInRound(0);
    }
    setStickerWon(won);
    setRoundCorrect((c) => c + (correct ? 1 : 0));
    setQuestionsDone((c) => c + 1);

    if (correct && newStreak > 0 && newStreak % STREAK_PACK_AT === 0) {
      awardPack(1);
    }
    setPhase("result");
  }

  function nextStep() {
    if (questionsDone >= ROUND_QUESTIONS) {
      setPhase("session");
      return;
    }
    setKickKey((k) => k + 1);
    setPhase("kick");
  }

  function closePack() {
    if (active!.state.unopenedPacks > 0) {
      setPackKey((k) => k + 1);
    } else {
      setPhase("idle");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <AppHeader title="Jugar" />
      {showConfetti && <Confetti count={24} />}
      <main className="max-w-md mx-auto px-4 pt-4">
        {phase === "idle" && (
          <IdleScreen
            onStart={startRound}
            packs={active.state.unopenedPacks}
            onOpenPack={() => setPhase("pack")}
          />
        )}

        {phase === "pack" && (
          <PackReveal
            key={packKey}
            onOpen={() => openOnePack()}
            onClose={closePack}
          />
        )}

        {phase === "kick" && (
          <div>
            <RoundHeader
              done={questionsDone}
              total={ROUND_QUESTIONS}
              correct={roundCorrect}
              streak={streakInRound}
            />
            <GoalKick key={kickKey} onPicked={onKickDone} />
          </div>
        )}

        {phase === "question" && question && (
          <div>
            <RoundHeader
              done={questionsDone}
              total={ROUND_QUESTIONS}
              correct={roundCorrect}
              streak={streakInRound}
            />
            <QuestionCard
              question={question}
              timeLimit={level === "facil" ? 30 : 22}
              onDone={onQuestionDone}
            />
          </div>
        )}

        {phase === "result" && (
          <ResultScreen
            sticker={stickerWon}
            onNext={nextStep}
            streak={streakInRound}
            justEarnedPack={
              streakInRound > 0 && streakInRound % STREAK_PACK_AT === 0 && stickerWon !== null
            }
          />
        )}

        {phase === "session" && (
          <SessionEnd
            correct={roundCorrect}
            total={ROUND_QUESTIONS}
            packs={active.state.unopenedPacks}
            onPlayAgain={startRound}
            onOpenPacks={() => setPhase("pack")}
          />
        )}
      </main>
    </div>
  );
}

function RoundHeader({
  done,
  total,
  correct,
  streak,
}: {
  done: number;
  total: number;
  correct: number;
  streak: number;
}) {
  return (
    <div className="flex items-center justify-between mb-3 text-sm">
      <div className="font-bold text-slate-600">
        Pregunta {Math.min(done + 1, total)} / {total}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-emerald-600 font-bold">✅ {correct}</span>
        {streak >= 2 && (
          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-extrabold text-xs">
            🔥 racha x{streak}
          </span>
        )}
      </div>
    </div>
  );
}

function IdleScreen({
  onStart,
  packs,
  onOpenPack,
}: {
  onStart: () => void;
  packs: number;
  onOpenPack: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-6 gap-5">
      <div className="text-7xl animate-bounce-soft">🥅</div>
      <div>
        <h2 className="text-2xl font-extrabold">Tiro al arco</h2>
        <p className="text-slate-600 mt-1">
          Pateá al arco. Donde cae la pelota, te toca esa pregunta.
          <br />
          <b>1 acierto = 1 figurita</b>. <b>3 seguidas = ¡sobre!</b>
        </p>
      </div>

      {packs > 0 && (
        <button
          onClick={onOpenPack}
          className="w-full rounded-2xl p-4 bg-gradient-to-br from-amber-400 to-orange-500 text-white font-extrabold shadow active:scale-95"
        >
          📦 Tenés {packs} {packs === 1 ? "sobre" : "sobres"} sin abrir
        </button>
      )}

      <button
        onClick={onStart}
        className="w-full rounded-3xl py-4 bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500 text-white font-extrabold text-xl shadow-xl active:scale-95"
      >
        ¡Empezar a jugar!
      </button>
    </div>
  );
}

function ResultScreen({
  sticker,
  onNext,
  streak,
  justEarnedPack,
}: {
  sticker: Sticker | null;
  onNext: () => void;
  streak: number;
  justEarnedPack: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-6 animate-pop-in">
      {sticker ? (
        <>
          <div className="text-2xl font-extrabold text-emerald-600">¡GOOOL! 🎉</div>
          <div className="text-sm text-slate-500">Ganaste esta figurita:</div>
          <StickerCard sticker={sticker} owned={true} size="lg" isNew />
          {streak >= 2 && (
            <div className="text-orange-600 font-extrabold">🔥 Racha x{streak}</div>
          )}
          {justEarnedPack && (
            <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white px-4 py-3 font-extrabold animate-pop-in shadow text-center">
              🎁 ¡Bonus! Te ganaste un <b>SOBRE</b> con 4 figuritas más
            </div>
          )}
        </>
      ) : (
        <>
          <div className="text-2xl font-extrabold text-rose-500">¡Atajada! 🧤</div>
          <div className="text-slate-600 text-center">
            La próxima la rompés. Seguí pateando.
          </div>
          <div className="text-6xl">⚽</div>
        </>
      )}
      <button
        onClick={onNext}
        className="w-full rounded-2xl py-3 bg-primary text-white font-bold shadow active:scale-95"
      >
        Siguiente
      </button>
    </div>
  );
}

function SessionEnd({
  correct,
  total,
  packs,
  onPlayAgain,
  onOpenPacks,
}: {
  correct: number;
  total: number;
  packs: number;
  onPlayAgain: () => void;
  onOpenPacks: () => void;
}) {
  const message = useMemo(() => {
    const pct = correct / total;
    if (pct === 1) return "¡PERFECTO! Sos un crack 🏆";
    if (pct >= 0.6) return "¡Muy bien! Seguí así 💪";
    if (pct >= 0.4) return "Nada mal, ¡a la próxima la rompés!";
    return "¡Seguí practicando, vas a mejorar! 🚀";
  }, [correct, total]);

  return (
    <div className="flex flex-col items-center gap-5 py-8 text-center animate-pop-in">
      <div className="text-6xl">🏁</div>
      <div>
        <div className="text-2xl font-extrabold">Ronda terminada</div>
        <div className="text-slate-600 mt-1">{message}</div>
      </div>
      <div className="text-5xl font-extrabold">
        {correct}<span className="text-slate-400 text-2xl"> / {total}</span>
      </div>
      {packs > 0 && (
        <button
          onClick={onOpenPacks}
          className="w-full rounded-2xl py-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white font-extrabold shadow active:scale-95"
        >
          📦 Abrir {packs} {packs === 1 ? "sobre" : "sobres"}
        </button>
      )}
      <button
        onClick={onPlayAgain}
        className="w-full rounded-2xl py-3 bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white font-extrabold shadow active:scale-95"
      >
        Jugar de nuevo
      </button>
    </div>
  );
}
