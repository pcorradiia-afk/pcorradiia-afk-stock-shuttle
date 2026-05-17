import { useEffect, useState } from "react";
import { CATEGORY_META, Question } from "@/data/trivia";
import { Clock } from "lucide-react";

interface Props {
  question: Question;
  timeLimit?: number;
  onDone: (correct: boolean) => void;
}

export function QuestionCard({ question, timeLimit = 25, onDone }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const meta = CATEGORY_META[question.category];

  useEffect(() => {
    setPicked(null);
    setTimeLeft(timeLimit);
  }, [question.id, timeLimit]);

  useEffect(() => {
    if (picked !== null) return;
    if (timeLeft <= 0) {
      pick(-1);
      return;
    }
    const t = window.setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [timeLeft, picked]);

  function pick(idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    const correct = idx === question.answer;
    window.setTimeout(() => onDone(correct), 1400);
  }

  const pctTime = (timeLeft / timeLimit) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-3xl p-5 text-white bg-gradient-to-br ${meta.color} shadow-lg`}>
        <div className="flex items-center justify-between text-xs uppercase tracking-wider font-bold opacity-90 mb-2">
          <span>{meta.emoji} {meta.label}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {timeLeft}s
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/25 overflow-hidden mb-3">
          <div
            className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${pctTime}%` }}
          />
        </div>
        <div className="text-lg font-bold leading-snug">{question.prompt}</div>
        {question.hint && timeLeft < timeLimit * 0.5 && picked === null && (
          <div className="mt-2 text-xs italic opacity-80">💡 {question.hint}</div>
        )}
      </div>

      <div className="grid gap-3">
        {question.options.map((opt, idx) => {
          const isAnswer = idx === question.answer;
          const isPicked = picked === idx;
          let style = "bg-white border-slate-200 text-slate-800";
          if (picked !== null) {
            if (isAnswer) style = "bg-emerald-500 border-emerald-600 text-white animate-pop-in";
            else if (isPicked) style = "bg-rose-500 border-rose-600 text-white animate-shake";
            else style = "bg-slate-100 border-slate-200 text-slate-400";
          }
          return (
            <button
              key={idx}
              onClick={() => pick(idx)}
              disabled={picked !== null}
              className={`w-full text-left p-4 rounded-2xl border-2 font-bold shadow-sm active:scale-[0.98] transition ${style}`}
            >
              <span className="inline-flex w-7 h-7 rounded-full bg-black/10 items-center justify-center text-sm mr-3">
                {String.fromCharCode(65 + idx)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
