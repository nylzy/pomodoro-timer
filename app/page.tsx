"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showBreakOption, setShowBreakOption] = useState(false);

  // Calculate progress percentage
  const getTotalSeconds = () => {
    return mode === "work" ? 25 * 60 : 5 * 60;
  };

  const getRemainingSeconds = () => {
    return minutes * 60 + seconds;
  };

  const getProgressPercentage = () => {
    const total = getTotalSeconds();
    const remaining = getRemainingSeconds();
    return ((total - remaining) / total) * 100;
  };

  // Countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            handleTimerComplete();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, minutes, seconds]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    if (mode === "work") {
      setSessionsCompleted(sessionsCompleted + 1);
      setShowBreakOption(true);
    } else {
      setMode("work");
      setMinutes(25);
      setSeconds(0);
      setShowBreakOption(false);
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (mode === "work") {
      setMinutes(25);
      setSeconds(0);
    } else {
      setMinutes(5);
      setSeconds(0);
    }
  };

  const startBreak = () => {
    setMode("break");
    setMinutes(5);
    setSeconds(0);
    setIsRunning(true);
  };

  const skipBreak = () => {
    setIsRunning(false);
    setMode("work");
    setMinutes(25);
    setSeconds(0);
    setShowBreakOption(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <h1 className="text-3xl font-semibold text-emerald-900 mb-8 text-center tracking-tight">
          Focus Timer
        </h1>

        {/* Sessions Counter */}
        <div className="text-center mb-6">
          <p className="text-emerald-700 text-sm font-medium">
            Sessions Completed: <span className="font-bold">{sessionsCompleted}</span>
          </p>
        </div>

        {/* Break Option */}
        {showBreakOption && mode === "work" && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-teal-200">
            <p className="text-center text-teal-900 font-semibold mb-4">
              🎉 Work session complete! Time for a break?
            </p>
            <div className="flex gap-3">
              <button
                onClick={startBreak}
                className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-all shadow-lg"
              >
                Take Break (5 min)
              </button>
              <button
                onClick={skipBreak}
                className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-semibold hover:bg-emerald-200 transition-all"
              >
                Skip Break
              </button>
            </div>
          </div>
        )}
        
        {/* Timer Card */}
        <div className="bg-white rounded-2xl shadow-xl p-12 mb-8">
          <div className="text-center">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-linear ${
                    mode === "work" ? "bg-emerald-600" : "bg-teal-600"
                  }`}
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            </div>

            {/* Timer Display */}
            <div
              className={`rounded-xl p-8 mb-8 border-2 ${
                mode === "work"
                  ? "bg-emerald-50 border-emerald-100"
                  : "bg-teal-50 border-teal-100"
              }`}
            >
              <div
                className={`text-7xl font-bold tracking-wider font-mono ${
                  mode === "work" ? "text-emerald-900" : "text-teal-900"
                }`}
              >
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </div>
            </div>

            {/* Status Text */}
            <p
              className={`text-sm font-medium mb-6 tracking-wide uppercase ${
                mode === "work" ? "text-emerald-600" : "text-teal-600"
              }`}
            >
              {isRunning
                ? mode === "work"
                  ? "Focus Time"
                  : "Break Time"
                : mode === "work"
                ? "Ready to Focus"
                : "Ready to Rest"}
            </p>

            {/* Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={toggleTimer}
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 text-white ${
                  mode === "work"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-teal-600 hover:bg-teal-700"
                }`}
              >
                {isRunning ? "Pause" : "Start"}
              </button>
              
              <button
                onClick={resetTimer}
                className={`px-8 py-4 rounded-xl font-semibold transition-all duration-200 active:scale-95 ${
                  mode === "work"
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                }`}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="text-center text-emerald-700 text-sm">
          {mode === "work" ? "25 minutes of focused work" : "5 minutes of rest"}
        </div>
      </div>
    </main>
  );
}