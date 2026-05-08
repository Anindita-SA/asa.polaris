// Web Audio API Synthesizer for high-performance zero-dependency chimes
export const playChime = (type = 'success') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    
    if (type === 'success') {
      // Warm, glowing double chime (e.g., for task completion)
      const playNote = (freq, startTime, duration, type) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = type
        osc.frequency.setValueAtTime(freq, startTime)
        
        // Envelope
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
        
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(startTime)
        osc.stop(startTime + duration)
      }
      
      const now = ctx.currentTime
      playNote(523.25, now, 0.4, 'sine') // C5
      playNote(659.25, now + 0.1, 0.6, 'sine') // E5
    } else if (type === 'pomodoro') {
      // Deeper, resonant bell for pomodoro session complete
      const playBell = (freq, startTime) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, startTime)
        
        gain.gain.setValueAtTime(0, startTime)
        gain.gain.linearRampToValueAtTime(0.4, startTime + 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2)
        
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(startTime)
        osc.stop(startTime + 2)
      }
      
      const now = ctx.currentTime
      playBell(440, now) // A4
      playBell(554.37, now + 0.05) // C#5
      playBell(659.25, now + 0.1) // E5
    }
  } catch (e) {
    console.warn('Audio chime failed to play:', e)
  }
}
