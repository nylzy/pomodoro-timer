"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [minutes, setMinutes] = useState(0);
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

const playSound = () => {
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Play three notes in sequence for a chime effect
  const playNote = (frequency: number, startTime: number) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    
    // Quick attack, gradual decay (bell-like)
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.6);
  };
  
  // Three ascending notes: C-E-G chord (like a pleasant bell)
  playNote(523.25, audioContext.currentTime);        // C note
  playNote(659.25, audioContext.currentTime + 0.15); // E note
  playNote(783.99, audioContext.currentTime + 0.30); // G note
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
    playSound(); // NEW: Play sound when timer completes!
    
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-200 to-teal-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-emerald-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">⏱</span>
            </div>
            <h1 className="text-2xl font-bold text-emerald-900">FocusFlow</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-semibold hover:bg-emerald-200 transition-all flex items-center gap-2">
              <span>⚙️</span>
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Timer Section */}
      <section className="py-12 px-4">
        <div className="max-w-md mx-auto">
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
      </section>

      {/* Information Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-emerald-900 mb-8 text-center">
            How to Use FocusFlow
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">1️⃣</span>
              </div>
              <h3 className="text-xl font-semibold text-emerald-900 mb-2">Set Your Focus</h3>
              <p className="text-gray-600">
                Click Start to begin a 25-minute focused work session. Eliminate distractions and dive deep into your task.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">2️⃣</span>
              </div>
              <h3 className="text-xl font-semibold text-emerald-900 mb-2">Take a Break</h3>
              <p className="text-gray-600">
                After each session, take a 5-minute break. Stretch, hydrate, or rest your eyes. You earned it!
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">3️⃣</span>
              </div>
              <h3 className="text-xl font-semibold text-emerald-900 mb-2">Repeat & Track</h3>
              <p className="text-gray-600">
                Complete multiple sessions and watch your productivity soar. Track your progress over time.
              </p>
            </div>
          </div>

          {/* About Pomodoro */}
          <div className="bg-emerald-50 rounded-2xl p-8 border-2 border-emerald-100">
            <h3 className="text-2xl font-bold text-emerald-900 mb-4">What is the Pomodoro Technique?</h3>
            <p className="text-gray-700 mb-4">
              The Pomodoro Technique is a time management method developed by Francesco Cirillo in the late 1980s. 
              It uses a timer to break work into focused intervals, traditionally 25 minutes in length, separated by short breaks.
            </p>
            <p className="text-gray-700">
              This technique helps improve focus, reduce mental fatigue, and boost productivity by creating a 
              sustainable work rhythm throughout your day.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-emerald-900 text-white text-center">
        <p className="text-sm">Built with focus 🌿 | © 2024 FocusFlow</p>
      </footer>
    </div>
  );
}