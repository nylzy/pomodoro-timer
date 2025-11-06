"use client";

import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/next"
import { Merriweather } from "next/font/google";
import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


const merriweather = Merriweather({
  weight: ['400', '700'],
  subsets: ['latin'],
});

export default function Home() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showBreakOption, setShowBreakOption] = useState(false);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const { isSignedIn, user } = useUser();

  // NEW: State for session history - now tracking minutes too
  const [sessionHistory, setSessionHistory] = useState<Array<{date: string, sessions: number, totalMinutes: number}>>([]);

  // Load saved data on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('sessionHistory');
    const savedWorkDuration = localStorage.getItem('workDuration');
    const savedBreakDuration = localStorage.getItem('breakDuration');
    
    if (savedHistory) {
      const history = JSON.parse(savedHistory);
      
      // Migrate old data format (count) to new format (sessions + totalMinutes)
      const migratedHistory = history.map((day: any) => {
        if (day.count !== undefined && day.sessions === undefined) {
          // Old format - migrate it
          return {
            date: day.date,
            sessions: day.count,
            totalMinutes: day.count * 25 // Assume 25 min sessions for old data
          };
        }
        return day; // Already new format
      });
    
    setSessionHistory(migratedHistory);
    
    // Calculate total sessions from history
    const total = migratedHistory.reduce((sum: number, day: any) => sum + (day.sessions || 0), 0);
    setSessionsCompleted(total);
    
    // Save migrated data
    localStorage.setItem('sessionHistory', JSON.stringify(migratedHistory));
  }
  
  if (savedWorkDuration) setWorkDuration(Number(savedWorkDuration));
  if (savedBreakDuration) setBreakDuration(Number(savedBreakDuration));
}, []);

  // Save session history whenever it changes
  useEffect(() => {
    if (sessionHistory.length > 0) {
      localStorage.setItem('sessionHistory', JSON.stringify(sessionHistory));
    }
  }, [sessionHistory]);

  // Save settings whenever they change
  useEffect(() => {
    localStorage.setItem('workDuration', String(workDuration));
    localStorage.setItem('breakDuration', String(breakDuration));
  }, [workDuration, breakDuration]);

  // Load data from database when user signs in
  useEffect(() => {
    if (isSignedIn) {
      fetchUserData();
    }
  }, [isSignedIn]);

  // Calculate progress percentage
  const getTotalSeconds = () => {
    return mode === "work" ? workDuration * 60 : breakDuration * 60;
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
    
    const playNote = (frequency: number, startTime: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.6);
    };
    
    playNote(523.25, audioContext.currentTime);
    playNote(659.25, audioContext.currentTime + 0.15);
    playNote(783.99, audioContext.currentTime + 0.30);
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
  playSound();
  
  if (mode === "work") {
    // Update session count
    setSessionsCompleted(sessionsCompleted + 1);
    
    // Add to session history with minutes tracked
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    setSessionHistory(prev => {
      const existingDay = prev.find(day => day.date === today);
      if (existingDay) {
        // Increment today's sessions and minutes
        return prev.map(day => 
          day.date === today 
            ? { ...day, sessions: day.sessions + 1, totalMinutes: day.totalMinutes + workDuration } 
            : day
        );
      } else {
        // Add new day
        return [...prev, { date: today, sessions: 1, totalMinutes: workDuration }];
      }
    });
    
    saveSessionToDb(workDuration);

    setShowBreakOption(true);
  } else {
    setMode("work");
    setMinutes(workDuration);
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
      setMinutes(workDuration);
      setSeconds(0);
    } else {
      setMinutes(breakDuration);
      setSeconds(0);
    }
  };

  const startBreak = () => {
    setMode("break");
    setMinutes(breakDuration);
    setSeconds(0);
    setIsRunning(true);
  };

  const skipBreak = () => {
    setIsRunning(false);
    setMode("work");
    setMinutes(workDuration);
    setSeconds(0);
    setShowBreakOption(false);
  };

  // Save settings and close modal
  const saveSettings = () => {

    saveSettingsToDb(workDuration, breakDuration);
    
  // Update current timer if not running
  if (!isRunning) {
    if (mode === "work") {
      setMinutes(workDuration);
    } else {
      setMinutes(breakDuration);
    }
    setSeconds(0);
  }
  setShowSettings(false);
  };

    // NEW: Fetch user data from database
  const fetchUserData = async () => {
    if (!isSignedIn) return;
    
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      
      if (data.sessionHistory) {
        setSessionHistory(data.sessionHistory);
        setSessionsCompleted(data.totalSessions);
      }
      
      if (data.settings) {
        setWorkDuration(data.settings.workDuration);
        setBreakDuration(data.settings.breakDuration);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // NEW: Save session to database
  const saveSessionToDb = async (minutes: number) => {
    if (!isSignedIn) return;
    
    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes })
      });
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  // NEW: Save settings to database
  const saveSettingsToDb = async (work: number, break_duration: number) => {
    if (!isSignedIn) return;
    
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workDuration: work, 
          breakDuration: break_duration 
        })
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-200 to-teal-200">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-emerald-900 mb-6">Timer Settings</h2>
            
            {/* Work Duration */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-emerald-900 mb-2">
                Work Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={workDuration}
                onChange={(e) => setWorkDuration(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:outline-none text-lg font-bold text-gray-600"
              />
            </div>

            {/* Break Duration */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-emerald-900 mb-2">
                Break Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={breakDuration}
                onChange={(e) => setBreakDuration(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 focus:outline-none text-lg font-bold text-gray-600"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={saveSettings}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-emerald-100 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">⏱</span>
              </div>
              <h1 className={`text-2xl font-bold text-emerald-900 ${merriweather.className}`}>
                PomoTomo
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Settings button - always visible */}
              <button 
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-semibold hover:bg-emerald-200 transition-all flex items-center gap-2"
              >
                <span>⚙️</span>
                Settings
              </button>

              <SignedOut>
                <SignInButton mode="modal">
                  <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all">
                    Get Started
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
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
                  Take Break ({breakDuration} min)
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
            {mode === "work" ? `${workDuration} minutes of focused work` : `${breakDuration} minutes of rest`}
          </div>
        </div>
      </section>

      {/* Graph Section */}
<section className="py-16 px-4 bg-gradient-to-br from-emerald-50 to-teal-50">
  <div className="max-w-4xl mx-auto">
    <h2 className="text-3xl font-bold text-emerald-900 mb-8 text-center">
      Your Progress
    </h2>
    
    <div className="bg-white rounded-2xl shadow-xl p-8">
      {isSignedIn ? (
        // Signed In - Show Graph
        sessionHistory.length > 0 ? (
          <>
            <h3 className="text-xl font-semibold text-emerald-900 mb-6">
              Focused Minutes Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sessionHistory.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
                <XAxis 
                  dataKey="date" 
                  stroke="#059669"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#059669" label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '2px solid #10b981', borderRadius: '8px' }}
                  labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  formatter={(value: any) => [`${value} minutes`, 'Focused Time']}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalMinutes" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
            
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div className="bg-emerald-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-emerald-900">
                  {sessionHistory.reduce((sum, day) => sum + day.totalMinutes, 0)}
                </p>
                <p className="text-sm text-emerald-600">Total Minutes</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-emerald-900">
                  {sessionHistory.find(day => day.date === new Date().toISOString().split('T')[0])?.totalMinutes || 0}
                </p>
                <p className="text-sm text-emerald-600">Today's Minutes</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-emerald-900">{sessionsCompleted}</p>
                <p className="text-sm text-emerald-600">Total Sessions</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-2">No sessions yet!</p>
            <p className="text-gray-500 text-sm">Complete your first pomodoro session to see your progress here.</p>
          </div>
        )
      ) : (
        // Not Signed In - Show CTA
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">📊</span>
          </div>
          <h3 className="text-2xl font-bold text-emerald-900 mb-4">
            Track Your Progress Over Time
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Sign in to unlock detailed analytics, view your productivity trends, and track your focused minutes across all your devices.
          </p>
          <SignInButton mode="modal">
            <button className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg">
              Get Started - It's Free
            </button>
          </SignInButton>
          <p className="text-gray-500 text-sm mt-4">
            Takes less than 30 seconds
          </p>
        </div>
      )}
    </div>
  </div>
</section>

      {/* Information Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-normal text-emerald-700 mb-8 text-center">
            How to Use <span className={`font-bold text-emerald-900 ${merriweather.className}`}>PomoTomo</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">1️⃣</span>
              </div>
              <h3 className="text-xl font-semibold text-emerald-900 mb-2">Set Your Focus</h3>
              <p className="text-gray-600">
                Click Start to begin a focused work session. Eliminate distractions and dive deep into your task.
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
        <p className="text-sm">Built by Tom Nylund🌿 | © 2025 PomoTomo</p>
      </footer>
      <Analytics /> 
    </div>
  );
}