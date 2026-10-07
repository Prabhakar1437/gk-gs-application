import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaSun, FaMoon, FaCopy, FaVolumeUp, FaStop, FaMicrophone, 
  FaTrophy, FaHistory, FaChartLine, FaRocket, FaFire 
} from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('General');
  const [quizMode, setQuizMode] = useState(false);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [streak, setStreak] = useState(0);
  const [categoryStats, setCategoryStats] = useState({});

  const apiKey =
  typeof process !== 'undefined' && process.env
    ? process.env.GEMINI_API_KEY || ''
    : '';
  const genAI = new GoogleGenerativeAI(apiKey);
  // const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });


  const categories = [
    { name: 'General', icon: '🌍', color: 'bg-blue-500' },
    { name: 'History', icon: '📜', color: 'bg-purple-500' },
    { name: 'Geography', icon: '🗺️', color: 'bg-green-500' },
    { name: 'Science', icon: '🔬', color: 'bg-red-500' },
    { name: 'Sports', icon: '⚽', color: 'bg-yellow-500' },
    { name: 'Technology', icon: '💻', color: 'bg-indigo-500' },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Load saved data
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedHistory = JSON.parse(localStorage.getItem('history') || '[]');
    const savedStats = JSON.parse(localStorage.getItem('categoryStats') || '{}');
    const savedScore = parseInt(localStorage.getItem('score') || '0');
    const savedStreak = parseInt(localStorage.getItem('streak') || '0');
    
    setDarkMode(savedDarkMode);
    setHistory(savedHistory);
    setCategoryStats(savedStats);
    setScore(savedScore);
    setStreak(savedStreak);
  }, []);

  // Save data to localStorage
  const saveToLocalStorage = (key, value) => {
    localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    saveToLocalStorage('darkMode', newDarkMode);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(answer).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const speakAnswer = () => {
    if ('speechSynthesis' in window) {
      if (speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
      } else {
        const utterance = new SpeechSynthesisUtterance(answer);
        utterance.rate = 0.9;
        utterance.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setSpeaking(true);
      }
    } else {
      alert('Text-to-speech not supported');
    }
  };

  // Voice Input
  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuestion(transcript);
      };

      recognition.start();
    } else {
      alert('Speech recognition not supported in your browser');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim()) {
      alert('Please enter a question!');
      return;
    }

    setLoading(true);
    setAnswer('');

    try {
      const prompt = quizMode 
        ? `Generate a ${selectedCategory} GK/GS question with 4 options (A, B, C, D) and mark the correct answer. Format: Question: [question]\nA) [option]\nB) [option]\nC) [option]\nD) [option]\nCorrect Answer: [letter]`
        : `Answer this ${selectedCategory} question: ${question}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      setAnswer(text);
      
      // Update stats
      const newHistory = [...history, { 
        question: quizMode ? 'Quiz Question' : question, 
        answer: text, 
        category: selectedCategory,
        timestamp: new Date().toISOString()
      }];
      setHistory(newHistory);
      saveToLocalStorage('history', newHistory);

      // Update category stats
      const newStats = { ...categoryStats };
      newStats[selectedCategory] = (newStats[selectedCategory] || 0) + 1;
      setCategoryStats(newStats);
      saveToLocalStorage('categoryStats', newStats);

      setTotalQuestions(totalQuestions + 1);
      setStreak(streak + 1);
      saveToLocalStorage('streak', streak + 1);

      setQuestion('');
    } catch (error) {
      console.error('Error:', error);
      setAnswer('ERROR: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuestion('');
    setAnswer('');
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  };

  const clearAllHistory = () => {
    if (confirm('Clear all history and stats?')) {
      setHistory([]);
      setCategoryStats({});
      setScore(0);
      setStreak(0);
      setTotalQuestions(0);
      localStorage.clear();
    }
  };

  // Prepare chart data
  const chartData = Object.entries(categoryStats).map(([name, value]) => ({
    name,
    questions: value
  }));

  const pieData = Object.entries(categoryStats).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-all duration-500">
        
        {/* Header */}
        <motion.header 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="bg-white dark:bg-gray-800 shadow-lg sticky top-0 z-50 backdrop-blur-lg bg-opacity-90 dark:bg-opacity-90"
        >
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-3"
              >
                <span className="text-4xl">🎓</span>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    GK Master Pro
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">AI-Powered Learning Platform</p>
                </div>
              </motion.div>

              <div className="flex items-center gap-4">
                {/* Streak Display */}
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900 px-4 py-2 rounded-full"
                >
                  <FaFire className="text-orange-500" />
                  <span className="font-bold text-orange-700 dark:text-orange-300">{streak} Streak</span>
                </motion.div>

                {/* Stats Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowStats(!showStats)}
                  className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                >
                  <FaChartLine className="text-xl" />
                </motion.button>

                {/* Dark Mode Toggle */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 180 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleDarkMode}
                  className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 shadow-lg"
                >
                  {darkMode ? <FaSun className="text-yellow-400 text-xl" /> : <FaMoon className="text-gray-700 text-xl" />}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          
          {/* Stats Dashboard */}
          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 overflow-hidden"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FaTrophy className="text-yellow-500" /> Your Statistics
                  </h2>
                  <button
                    onClick={clearAllHistory}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"
                  >
                    <div className="text-4xl mb-2">📊</div>
                    <div className="text-3xl font-bold">{totalQuestions}</div>
                    <div className="text-blue-100">Total Questions</div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"
                  >
                    <div className="text-4xl mb-2">⭐</div>
                    <div className="text-3xl font-bold">{score}</div>
                    <div className="text-green-100">Score Points</div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"
                  >
                    <div className="text-4xl mb-2">📚</div>
                    <div className="text-3xl font-bold">{Object.keys(categoryStats).length}</div>
                    <div className="text-purple-100">Categories Explored</div>
                  </motion.div>
                </div>

                {chartData.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Questions by Category</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="questions" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Category Distribution</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => entry.name}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Categories */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <FaRocket /> Select Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {categories.map((cat) => (
                <motion.button
                  key={cat.name}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`p-4 rounded-xl shadow-lg transition-all duration-300 ${
                    selectedCategory === cat.name
                      ? `${cat.color} text-white shadow-2xl`
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <div className="font-semibold text-sm">{cat.name}</div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Quiz Mode Toggle */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">🎯 Quiz Mode</h3>
                <p className="text-purple-100">Generate random questions with multiple choice</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuizMode(!quizMode)}
                className={`px-8 py-3 rounded-full font-bold transition-all ${
                  quizMode 
                    ? 'bg-white text-purple-600' 
                    : 'bg-purple-600 bg-opacity-50 text-white border-2 border-white'
                }`}
              >
                {quizMode ? 'ON' : 'OFF'}
              </motion.button>
            </div>
          </motion.div>

          {/* Question Input */}
                    {/* Question Input */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-700 dark:text-gray-200 font-bold mb-3 text-lg">
                  {quizMode ? '🎲 Generate Quiz Question' : '❓ Ask Your Question'}
                </label>
                
                {/* Input with Voice Button - IMPROVED LAYOUT */}
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder={quizMode ? "Click 'Get Answer' to generate a quiz" : "e.g., What is the capital of India?"}
                      className="w-full px-6 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-lg transition-all"
                      disabled={quizMode}
                    />
                  </div>
                  
                  {/* Voice Button - Separate from Input */}
                  {!quizMode && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={startListening}
                      className={`px-6 py-4 rounded-xl font-bold transition-all shadow-lg ${
                        listening 
                          ? 'bg-red-500 animate-pulse text-white' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                      title="Voice Input"
                    >
                      <FaMicrophone className="text-2xl" />
                    </motion.button>
                  )}
                </div>
                
                {/* Voice Status Indicator */}
                {listening && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center gap-2 text-red-500 font-semibold"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-3 h-3 bg-red-500 rounded-full"
                    />
                    Listening... Speak now!
                  </motion.div>
                )}
              </div>

              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      Processing...
                    </span>
                  ) : (
                    '🚀 Get Answer'
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleClear}
                  className="px-8 bg-gray-500 text-white py-4 rounded-xl font-bold hover:bg-gray-600 transition-all shadow-lg"
                >
                  Clear
                </motion.button>
              </div>
            </form>
          </motion.div>

          {/* Answer Display */}
          <AnimatePresence>
            {answer && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-2xl p-8 mb-8 border-2 border-blue-200 dark:border-blue-800"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    ✨ Answer
                  </h2>
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-lg"
                    >
                      <FaCopy />
                      {copied ? 'Copied!' : 'Copy'}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={speakAnswer}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${
                        speaking ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
                      } text-white`}
                    >
                      {speaking ? <FaStop /> : <FaVolumeUp />}
                      {speaking ? 'Stop' : 'Speak'}
                    </motion.button>
                  </div>
                </div>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">
                    {answer}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* History */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <FaHistory /> Question History ({history.length})
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {history.slice().reverse().map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, x: 10 }}
                    className="border-l-4 border-purple-500 pl-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all rounded-r-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs">
                            {item.category}
                          </span>
                          Q: {item.question}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          A: {item.answer.substring(0, 200)}...
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 mt-16 py-6 text-center shadow-lg">
          <p className="text-gray-600 dark:text-gray-400">
            Made with ❤️ using React + Gemini AI • Free Tier: 15 requests/min
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
