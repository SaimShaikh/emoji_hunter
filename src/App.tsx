import React, { useState, useEffect, useRef, useCallback } from 'react';

// Game constants
const GRID_SIZE = 10;
const TIME_LIMIT = 7;
const TARGET_EMOJIS = ["🦊", "🐱", "🐶", "🐵", "🦄", "🐼", "🐸", "🐤", "🐙"];
const DECOY_EMOJIS = ["🐯", "🐰", "🐻", "🐷", "🐮", "🐺", "🐹", "🐭", "🐨", "🐦", "🐧", "🦆", "🐢", "🐍", "🦎", "🐝", "🦋", "🐛", "🐠", "🐟"];

// Particle system class
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animationId = null;
    this.init();
  }

  init() {
    // Create initial particles
    for (let i = 0; i < 50; i++) {
      this.particles.push(this.createParticle());
    }
    this.animate();
  }

  createParticle() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 1,
      opacity: Math.random() * 0.3 + 0.1,
      life: 1
    };
  }

  createBurst(x, y) {
    // Create celebration particles at specific position
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        radius: Math.random() * 3 + 2,
        opacity: 1,
        life: 1,
        burst: true
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Update burst particles
      if (particle.burst) {
        particle.life -= 0.02;
        particle.opacity = particle.life;
        if (particle.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
      }
      
      // Wrap around screen for normal particles
      if (!particle.burst) {
        if (particle.x < 0) particle.x = this.canvas.width;
        if (particle.x > this.canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = this.canvas.height;
        if (particle.y > this.canvas.height) particle.y = 0;
      }
      
      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(45, 212, 191, ${particle.opacity})`;
      this.ctx.fill();
      
      // Add glow effect
      this.ctx.shadowColor = 'rgba(45, 212, 191, 0.5)';
      this.ctx.shadowBlur = 10;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// Helper functions
const generateEmojiGrid = (targetEmoji) => {
  const grid = [];
  const targetIndex = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
  
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    if (i === targetIndex) {
      grid.push(targetEmoji);
    } else {
      const randomDecoy = DECOY_EMOJIS[Math.floor(Math.random() * DECOY_EMOJIS.length)];
      grid.push(randomDecoy);
    }
  }
  
  return { grid, targetIndex };
};

const playSound = (frequency, duration) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    // Fallback: no sound if Web Audio API is blocked
  }
};

export default function App() {
  // Game state
  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'success', 'fail'
  const [playerName, setPlayerName] = useState('');
  const [points, setPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [currentTarget, setCurrentTarget] = useState('');
  const [emojiGrid, setEmojiGrid] = useState([]);
  const [targetIndex, setTargetIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [feedback, setFeedback] = useState('');
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

  // Refs
  const canvasRef = useRef(null);
  const particleSystemRef = useRef(null);
  const timerRef = useRef(null);
  const gameAreaRef = useRef(null);

  // Initialize particle system
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particleSystemRef.current = new ParticleSystem(canvas);

      const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (particleSystemRef.current) {
          particleSystemRef.current.resize();
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (particleSystemRef.current) {
          particleSystemRef.current.destroy();
        }
      };
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => {
          const newTime = Math.max(0, prev - 0.1);
          if (newTime <= 0) {
            handleTimeUp();
          }
          return newTime;
        });
      }, 100);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [gameState, timeLeft]);

  // Start new stage
  const startStage = useCallback(() => {
    const target = TARGET_EMOJIS[Math.floor(Math.random() * TARGET_EMOJIS.length)];
    const { grid, targetIndex: newTargetIndex } = generateEmojiGrid(target);
    
    setCurrentTarget(target);
    setEmojiGrid(grid);
    setTargetIndex(newTargetIndex);
    setSelectedIndex(-1);
    setTimeLeft(TIME_LIMIT);
    setGameState('playing');
    setFeedback('');
    setShowCorrectAnswer(false);
  }, []);

  // Handle emoji click
  const handleEmojiClick = useCallback((index) => {
    if (gameState !== 'playing') return;

    setSelectedIndex(index);
    
    if (index === targetIndex) {
      // Correct answer
      setGameState('success');
      setPoints(prev => prev + 1);
      setFeedback('Nice! +1');
      playSound(800, 0.2);
      
      // Create particle burst at clicked position
      const rect = gameAreaRef.current?.getBoundingClientRect();
      if (rect && particleSystemRef.current) {
        const cols = Math.min(GRID_SIZE, Math.floor(rect.width / 60));
        const tileSize = rect.width / cols;
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = rect.left + col * tileSize + tileSize / 2;
        const y = rect.top + row * tileSize + tileSize / 2;
        particleSystemRef.current.createBurst(x, y);
      }
      
      // Auto advance after delay
      setTimeout(() => {
        startStage();
      }, 700);
    } else {
      // Wrong answer
      handleFailure();
    }
  }, [gameState, targetIndex, startStage]);

  // Handle failure (wrong click or timeout)
  const handleFailure = useCallback(() => {
    setGameState('fail');
    setPoints(0);
    setFeedback(`Oops — you lost your points. The ${currentTarget} was here:`);
    setShowCorrectAnswer(true);
    playSound(200, 0.5);
  }, [currentTarget]);

  // Handle time up
  const handleTimeUp = useCallback(() => {
    if (gameState === 'playing') {
      handleFailure();
    }
  }, [gameState, handleFailure]);

  // Start game
  const handleStartGame = () => {
    if (playerName.trim()) {
      startStage();
    }
  };

  // Restart game
  const handleRestart = () => {
    setPoints(0);
    startStage();
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState === 'start') {
        if (e.key === 'Enter' && playerName.trim()) {
          handleStartGame();
        }
      } else if (gameState === 'playing') {
        const cols = Math.min(GRID_SIZE, 10);
        const currentRow = Math.floor(selectedIndex / cols);
        const currentCol = selectedIndex % cols;
        
        let newIndex = selectedIndex;
        
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            newIndex = selectedIndex >= cols ? selectedIndex - cols : selectedIndex;
            break;
          case 'ArrowDown':
            e.preventDefault();
            newIndex = selectedIndex + cols < emojiGrid.length ? selectedIndex + cols : selectedIndex;
            break;
          case 'ArrowLeft':
            e.preventDefault();
            newIndex = currentCol > 0 ? selectedIndex - 1 : selectedIndex;
            break;
          case 'ArrowRight':
            e.preventDefault();
            newIndex = currentCol < cols - 1 ? selectedIndex + 1 : selectedIndex;
            break;
          case 'Enter':
          case ' ':
            e.preventDefault();
            if (selectedIndex >= 0) {
              handleEmojiClick(selectedIndex);
            }
            break;
        }
        
        setSelectedIndex(newIndex);
      } else if (gameState === 'fail') {
        if (e.key === 'Enter' || e.key === ' ') {
          handleRestart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, playerName, selectedIndex, emojiGrid.length, handleEmojiClick]);

  // Calculate progress percentage for timer
  const progressPercentage = (timeLeft / TIME_LIMIT) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-slate-950 text-white relative overflow-hidden">
      {/* Particle Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        
        {/* Start Screen */}
        {gameState === 'start' && (
          <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-gray-800/50 max-w-md w-full">
            <h1 className="text-4xl font-bold text-center mb-6 bg-gradient-to-r from-teal-400 to-violet-400 bg-clip-text text-transparent">
              Emoji Hunt
            </h1>
            <p className="text-center text-gray-300 mb-6">
              Find the hidden emoji in 7 seconds!
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="playerName" className="block text-sm font-medium text-gray-300 mb-2">
                  Your Name
                </label>
                <input
                  id="playerName"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all"
                  placeholder="Enter your name..."
                  autoFocus
                />
              </div>
              
              <button
                onClick={handleStartGame}
                disabled={!playerName.trim()}
                className="w-full py-3 px-6 bg-gradient-to-r from-teal-500 to-violet-500 hover:from-teal-400 hover:to-violet-400 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold transition-all transform hover:scale-105 focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-black"
                aria-label="Start the emoji hunt game"
              >
                Start Hunt
              </button>
            </div>
          </div>
        )}

        {/* Game Screen */}
        {(gameState === 'playing' || gameState === 'success' || gameState === 'fail') && (
          <div className="w-full max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-teal-400">
                {playerName} — Points: {points}
              </h2>
              
              {/* Timer */}
              {gameState === 'playing' && (
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    {/* Timer Circle */}
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="rgb(17, 24, 39)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="rgb(45, 212, 191)"
                        strokeWidth="4"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercentage / 100)}`}
                        className="transition-all duration-100"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span 
                        className="text-lg font-bold text-teal-400"
                        aria-live="polite"
                        aria-label={`${timeLeft.toFixed(1)} seconds remaining`}
                      >
                        {timeLeft.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Target Display */}
            {gameState === 'playing' && (
              <div className="text-center mb-4">
                <p className="text-gray-300 mb-2">Find this emoji:</p>
                <div className="text-4xl mb-4">{currentTarget}</div>
              </div>
            )}

            {/* Emoji Grid */}
            <div 
              ref={gameAreaRef}
              className="bg-black/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-gray-800/50"
            >
              <div className="grid gap-2" style={{
                gridTemplateColumns: `repeat(${Math.min(GRID_SIZE, 10)}, minmax(0, 1fr))`
              }}>
                {emojiGrid.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => handleEmojiClick(index)}
                    disabled={gameState !== 'playing'}
                    className={`
                      aspect-square bg-gray-900/70 hover:bg-gray-800/90 rounded-lg flex items-center justify-center text-2xl sm:text-3xl transition-all duration-200 transform hover:scale-105 active:scale-95 focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-black
                      ${selectedIndex === index ? 'ring-2 ring-violet-400' : ''}
                      ${index === targetIndex && gameState === 'success' ? 'bg-green-500/50 ring-2 ring-green-400 animate-pulse' : ''}
                      ${selectedIndex === index && gameState === 'fail' && index !== targetIndex ? 'bg-red-500/50 ring-2 ring-red-400 animate-pulse' : ''}
                      ${index === targetIndex && gameState === 'fail' && showCorrectAnswer ? 'bg-yellow-500/50 ring-2 ring-yellow-400 animate-pulse' : ''}
                    `}
                    aria-label={`Emoji ${emoji}, position ${index + 1}`}
                    style={{
                      animation: selectedIndex === index && gameState === 'fail' ? 'shake 0.5s ease-in-out' : undefined
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div className="text-center mt-6">
                <p className={`text-xl font-semibold ${
                  gameState === 'success' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {feedback}
                </p>
                
                {gameState === 'fail' && (
                  <button
                    onClick={handleRestart}
                    className="mt-4 py-2 px-6 bg-gradient-to-r from-teal-500 to-violet-500 hover:from-teal-400 hover:to-violet-400 rounded-xl font-semibold transition-all transform hover:scale-105 focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-black"
                    aria-label="Restart the game and reset score"
                  >
                    Restart Game
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shake Animation */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}