import { useEffect, useState } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ExamTimerProps {
  totalSeconds: number;
  onTimeExpired: () => void;
  isPaused?: boolean;
}

export default function ExamTimer({ totalSeconds, onTimeExpired, isPaused = false }: ExamTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (isPaused || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          onTimeExpired();
          return 0;
        }
        setIsWarning(next <= 300); // 5 minutes warning
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, secondsRemaining, onTimeExpired]);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <Card className={`p-4 border-2 ${isWarning ? "border-red-500 bg-red-50" : "border-slate-200"}`}>
      <div className="flex items-center gap-3">
        <Clock className={`w-5 h-5 ${isWarning ? "text-red-600 animate-pulse" : "text-teal-600"}`} />
        <div>
          <p className="text-xs text-slate-600 font-medium">Time Remaining</p>
          <p className={`text-2xl font-bold font-mono ${isWarning ? "text-red-600" : "text-slate-900"}`}>
            {formattedTime}
          </p>
        </div>
        {isWarning && (
          <div className="ml-auto flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">Hurry up!</span>
          </div>
        )}
      </div>
    </Card>
  );
}
