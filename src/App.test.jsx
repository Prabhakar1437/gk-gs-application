import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App'; // The component under test
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key) => {
      delete store[key];
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock GoogleGenerativeAI
const mockGenerateContent = jest.fn(() =>
  Promise.resolve({
    response: {
      text: () => 'Mocked answer for your question.',
    },
  })
);

const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

// Mock framer-motion components
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    header: ({ children, ...props }) => <header {...props}>{children}</header>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="xaxis" />,
  YAxis: () => <div data-testid="yaxis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
}));

// Mock navigator.clipboard
const mockWriteText = jest.fn(() => Promise.resolve());
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

// Mock window.speechSynthesis
const mockSpeak = jest.fn();
const mockCancel = jest.fn();
const mockUtterance = {
  rate: 0.9,
  onend: jest.fn(),
};
Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  value: jest.fn(() => mockUtterance),
});
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: mockSpeak,
    cancel: mockCancel,
    speaking: false, // Default to not speaking
  },
  writable: true,
});

// Mock window.SpeechRecognition
const mockStartRecognition = jest.fn();
const mockStopRecognition = jest.fn();
let mockRecognitionOnResult = jest.fn();
let mockRecognitionOnStart = jest.fn();
let mockRecognitionOnEnd = jest.fn();

const MockSpeechRecognition = jest.fn(() => ({
  continuous: false,
  interimResults: false,
  onstart: (...args) => mockRecognitionOnStart(...args),
  onend: (...args) => mockRecognitionOnEnd(...args),
  onresult: (...args) => mockRecognitionOnResult(...args),
  start: mockStartRecognition,
  stop: mockStopRecognition,
}));

Object.defineProperty(window, 'SpeechRecognition', {
  value: MockSpeechRecognition,
  writable: true,
});
Object.defineProperty(window, 'webkitSpeechRecognition', {
  value: MockSpeechRecognition,
  writable: true,
});

// Mock window.confirm for clearAllHistory
const mockConfirm = jest.fn(() => true);
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
});

// Mock window.alert for unsupported features
const mockAlert = jest.fn();
Object.defineProperty(window, 'alert', {
  value: mockAlert,
  writable: true,
});

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Mocked answer for your question.' },
    });
    window.speechSynthesis.speaking = false;
    mockConfirm.mockReturnValue(true); // Reset confirm to true for most tests
  });

  // --- Initial Render Tests ---
  test('should render the main title and default elements on initial load', () => {
    render(<App />);

    expect(screen.getByText('GK Master Pro')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., What is the capital of India?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get answer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /general/i })).toBeInTheDocument();
    expect(screen.getByText(/0 Streak/i)).toBeInTheDocument();
    expect(screen.queryByText(/Answer/i)).not.toBeInTheDocument(); // Answer section should not be visible
    expect(screen.queryByText(/question history/i)).not.toBeInTheDocument(); // History should not be visible
  });

  test('should load dark mode setting from localStorage on initial render', () => {
    localStorage.setItem('darkMode', 'true');
    render(<App />);
    expect(screen.getByTestId('responsive-container').parentElement).toHaveClass('dark'); // Main div
    expect(screen.getByRole('button', { name: /dark mode toggle/i }).querySelector('svg')).toHaveClass('fa-sun'); // Sun icon for dark mode
  });

  test('should load history and categoryStats from localStorage on initial render', () => {
    const savedHistory = [{ question: 'Q1', answer: 'A1', category: 'General', timestamp: new Date().toISOString() }];
    const savedStats = { General: 5 };
    const savedScore = 10;
    const savedStreak = 3;

    localStorage.setItem('history', JSON.stringify(savedHistory));
    localStorage.setItem('categoryStats', JSON.stringify(savedStats));
    localStorage.setItem('score', savedScore.toString());
    localStorage.setItem('streak', savedStreak.toString());

    render(<App />);

    expect(screen.getByText('3 Streak')).toBeInTheDocument();

    // Open stats to check them
    fireEvent.click(screen.getByRole('button', { name: /stats button/i }));
    expect(screen.getByText('Your Statistics')).toBeInTheDocument();
    expect(screen.getByText('1 Total Questions')).toBeInTheDocument(); // History length
    expect(screen.getByText('10 Score Points')).toBeInTheDocument();
    expect(screen.getByText('1 Categories Explored')).toBeInTheDocument();
    expect(screen.getByText('Questions by Category')).toBeInTheDocument();
    expect(screen.getByText('Category Distribution')).toBeInTheDocument();

    // Close stats, check history
    fireEvent.click(screen.getByRole('button', { name: /stats button/i }));
    expect(screen.queryByText('Your Statistics')).not.toBeInTheDocument();
    expect(screen.getByText(/Question History \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Q: Q1/i)).toBeInTheDocument();
  });

  // --- Dark Mode Toggle ---
  test('should toggle dark mode when the button is clicked', () => {
    render(<App />);
    const darkModeButton = screen.getByRole('button', { name: /dark mode toggle/i });
    const mainDiv = screen.getByTestId('responsive-container').parentElement; // The outermost div for dark class

    // Initial state: light mode
    expect(mainDiv).not.toHaveClass('dark');
    expect(darkModeButton.querySelector('svg')).toHaveClass('fa-moon');

    // Toggle to dark mode
    fireEvent.click(darkModeButton);
    expect(mainDiv).toHaveClass('dark');
    expect(darkModeButton.querySelector('svg')).toHaveClass('fa-sun');
    expect(localStorage.getItem('darkMode')).toBe('true');

    // Toggle back to light mode
    fireEvent.click(darkModeButton);
    expect(mainDiv).not.toHaveClass('dark');
    expect(darkModeButton.querySelector('svg')).toHaveClass('fa-moon');
    expect(localStorage.getItem('darkMode')).toBe('false');
  });

  // --- Category Selection ---
  test('should change selected category when a category button is clicked', () => {
    render(<App />);
    const generalButton = screen.getByRole('button', { name: /general/i });
    const historyButton = screen.getByRole('button', { name: /history/i });

    // Initial state
    expect(generalButton).toHaveClass('bg-blue-500'); // Check for specific class indicating selection

    // Click History
    fireEvent.click(historyButton);
    expect(historyButton).toHaveClass('bg-purple-500');
    expect(generalButton).not.toHaveClass('bg-blue-500'); // General should no longer be selected
  });

  // --- Quiz Mode Toggle ---
  test('should toggle quiz mode when the button is clicked and disable/enable input', () => {
    render(<App />);
    const quizModeToggle = screen.getByRole('button', { name: /off/i });
    const questionInput = screen.getByPlaceholderText('e.g., What is the capital of India?');

    // Initial state
    expect(questionInput).not.toBeDisabled();
    expect(quizModeToggle).toHaveTextContent('OFF');

    // Toggle ON
    fireEvent.click(quizModeToggle);
    expect(questionInput).toBeDisabled();
    expect(questionInput).toHaveAttribute('placeholder', "Click 'Get Answer' to generate a quiz");
    expect(quizModeToggle).toHaveTextContent('ON');
    expect(screen.queryByRole('button', { name: /voice input/i })).not.toBeInTheDocument(); // Voice input should be gone

    // Toggle OFF
    fireEvent.click(quizModeToggle);
    expect(questionInput).not.toBeDisabled();
    expect(questionInput).toHaveAttribute('placeholder', "e.g., What is the capital of India?");
    expect(quizModeToggle).toHaveTextContent('OFF');
    expect(screen.getByRole('button', { name: /voice input/i })).toBeInTheDocument(); // Voice input should be back
  });

  // --- Question Submission (Normal Mode) ---
  test('should submit a question, display answer, update history and stats', async () => {
    render(<App />);
    const questionInput = screen.getByPlaceholderText('e.g., What is the capital of India?');
    const submitButton = screen.getByRole('button', { name: /get answer/i });

    fireEvent.change(questionInput, { target: { value: 'What is the highest mountain?' } });
    fireEvent.click(submitButton);

    expect(screen.getByText(/processing.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-flash-latest' });
      expect(mockGenerateContent).toHaveBeenCalledWith('Answer this General question: What is the highest mountain?');
      expect(screen.getByText('Mocked answer for your question.')).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });

    expect(questionInput).toHaveValue('');
    expect(screen.getByText(/question history \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Q: What is the highest mountain?/i)).toBeInTheDocument();
    expect(screen.getByText(/A: Mocked answer for your question./i)).toBeInTheDocument();
    expect(localStorage.getItem('history')).toContain('What is the highest mountain?');
    expect(localStorage.getItem('categoryStats')).toContain('{"General":1}');
    expect(localStorage.getItem('streak')).toBe('1');
    expect(screen.getByText('1 Streak')).toBeInTheDocument();

    // Check category stats in UI after opening stats
    fireEvent.click(screen.getByRole('button', { name: /stats button/i }));
    await waitFor(() => {
      expect(screen.getByText('1 Total Questions')).toBeInTheDocument();
      expect(screen.getByText('1 Categories Explored')).toBeInTheDocument();
      expect(screen.getByText('Questions by Category')).toBeInTheDocument();
    });
  });

  // --- Question Submission (Quiz Mode) ---
  test('should submit a question in quiz mode with the correct prompt', async () => {
    render(<App />);
    const quizModeToggle = screen.getByRole('button', { name: /off/i });
    const submitButton = screen.getByRole('button', { name: /get answer/i });
    const categoryButton = screen.getByRole('button', { name: /science/i });

    fireEvent.click(categoryButton); // Select Science category
    fireEvent.click(quizModeToggle); // Turn quiz mode ON

    fireEvent.click(submitButton);

    expect(screen.getByText(/processing.../i)).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGenerateContent).toHaveBeenCalledWith(
        'Generate a Science GK/GS question with 4 options (A, B, C, D) and mark the correct answer. Format: Question: [question]\nA) [option]\nB) [option]\nC) [option]\nD) [option]\nCorrect Answer: [letter]'
      );
      expect(screen.getByText('Mocked answer for your question.')).toBeInTheDocument();
    });
    expect(screen.getByText(/Q: Quiz Question/i)).toBeInTheDocument(); // History entry should say 'Quiz Question'
    expect(screen.getByText('1 Streak')).toBeInTheDocument();
  });

  // --- Error Handling ---
  test('should display an alert if question input is empty on submission (normal mode)', async () => {
    render(<App />);
    const submitButton = screen.getByRole('button', { name: /get answer/i });

    fireEvent.click(submitButton);

    expect(mockAlert).toHaveBeenCalledWith('Please enter a question!');
    expect(mockGenerateContent).not.toHaveBeenCalled();
    expect(screen.queryByText(/processing.../i)).not.toBeInTheDocument();
  });

  test('should display an alert if question input is empty on submission (quiz mode input is disabled but still checks empty)', async () => {
    render(<App />);
    const quizModeToggle = screen.getByRole('button', { name: /off/i });
    fireEvent.click(quizModeToggle); // Turn quiz mode ON, input is disabled and empty
    const submitButton = screen.getByRole('button', { name: /get answer/i });

    // In quiz mode, the input is disabled, but if it was somehow empty and submitted, it would still warn.
    // However, the current logic only checks for `!question.trim()`. Since quiz mode makes the input value
    // *not* change, it would effectively pass the empty check if the question state isn't explicitly set to empty,
    // which it is by default. The key here is that the input box itself becomes irrelevant.
    // The prompt is generated regardless of the input text when in quiz mode.
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // It proceeds in quiz mode
    });
    expect(mockAlert).not.toHaveBeenCalled(); // No alert, as empty check is bypassed by quiz mode logic.
  });

  test('should display an error message if the API call fails', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API rate limit exceeded.'));
    render(<App />);
    const questionInput = screen.getByPlaceholderText('e.g., What is the capital of India?');
    const submitButton = screen.getByRole('button', { name: /get answer/i });

    fireEvent.change(questionInput, { target: { value: 'Test question' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('ERROR: API rate limit exceeded.')).toBeInTheDocument();
      expect(screen.queryByText(/processing.../i)).not.toBeInTheDocument();
    });
    expect(screen.getByText('ERROR: API rate limit exceeded.')).toHaveClass('whitespace-pre-wrap');
    expect(submitButton).not.toBeDisabled();
  });

  // --- Clear Button ---
  test('should clear question and answer when the clear button is clicked', async () => {
    render(<App />);
    const questionInput = screen.getByPlaceholderText('e.g., What is the capital of India?');
    const submitButton = screen.getByRole('button', { name: /get answer/i });
    const clearButton = screen.getByRole('button', { name: /clear/i });

    fireEvent.change(questionInput, { target: { value: 'Temporary question' } });
    fireEvent.click(submitButton);
    await waitFor(() => expect(screen.getByText('Mocked answer for your question.')).toBeInTheDocument());

    fireEvent.click(clearButton);
    expect(questionInput).toHaveValue('');
    expect(screen.queryByText('Mocked answer for your question.')).not.toBeInTheDocument();
  });

  test('should cancel speech synthesis if speaking when clear is clicked', async () => {
    render(<App />);
    const questionInput = screen.getByPlaceholderText('e.g., What is the capital of India?');
    const submitButton = screen.getByRole('button', { name: /get answer/i });
    const clearButton = screen.getByRole('button', { name: /clear/i });

    fireEvent.change(questionInput, { target: { value: 'Test question for speech' } });
    fireEvent.click(submitButton);
    await waitFor(() => expect(screen.getByText('Mocked answer for your question.')).toBeInTheDocument());

    const speakButton = screen.getByRole('button', { name: /speak/i });
    fireEvent.click(speakButton);
    expect(mockSpeak).toHaveBeenCalledTimes(1);
    window.speechSynthesis.speaking = true; // Simulate speaking state

    fireEvent.click(clearButton);
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(window.speechSynthesis.speaking).toBe(false); // Should be false after cancel
  });

  // --- Copy to Clipboard ---
  test('should copy answer to clipboard and show "Copied!" message', async () => {
    jest.useFakeTimers(); // For setTimeout

    render(<App />);
    const questionInput = screen.getByPlaceholderText('e.g., What is the capital of India?');
    const submitButton = screen.getByRole('button', { name: /get answer/i });

    fireEvent.change(questionInput, { target: { value: 'Question to copy' } });
    fireEvent.click(submitButton);
    await waitFor(() => expect(screen.getByText('Mocked answer for your question.')).toBeInTheDocument());

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith('Mocked answer for your question.');
    expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument();

    jest.advanceTimersByTime(2000);
    await waitFor(() => expect(screen.queryByRole('button', { name: /copied!/i })).not.toBeInTheDocument());

    jest.useRealTimers();
  });

  // --- Text-to-Speech ---
  test('should speak the answer when the speak button is clicked', async () => {
    render(<App />);
    const questionInput = screen.getByPlaceholderText('e.g., What is the capital of India?');
    const submitButton = screen.getByRole('button', { name: /get answer/i });

    fireEvent.change(questionInput, { target: { value: 'Question for speech' } });
    fireEvent.click(submitButton);
    await waitFor(() => expect(screen.getByText('Mocked answer for your question.')).toBeInTheDocument());

    const speakButton = screen.getByRole('button', { name: /speak/i });
    fireEvent.click(speakButton);

    expect(window.SpeechSynthesisUtterance).toHaveBeenCalledWith('Mocked answer for your question.');
    expect(mockSpeak).toHaveBeenCalledWith(mockUtterance);
    expect(speakButton).toHaveTextContent('Stop'); // Button changes to Stop
    expect(speakButton.querySelector('svg')).toHaveClass('fa-stop'); // Icon changes
    expect(speakButton).toHaveClass('bg-red-500'); // Speaking state styling

    // Simulate speech end
    mockUtterance.onend();
    await waitFor(() => {
      expect(speakButton).toHaveTextContent('Speak');
      expect(speakButton.querySelector('svg')).toHaveClass('fa-volume-up');
      expect(speakButton).toHaveClass('bg-blue-500');
    });
  });

  test('should stop speaking when the stop button is clicked', async () => {
    render(<App />);
    const questionInput = screen.getByPlaceholderText('e.g., What is the capital of India?');
    const submitButton = screen.getByRole('button', { name: /get answer/i });

    fireEvent.change(questionInput, { target: { value: 'Question for speech' } });
    fireEvent.click(submitButton);
    await waitFor(() => expect(screen.getByText('Mocked answer for your question.')).toBeInTheDocument());

    const speakButton = screen.getByRole('button', { name: /speak/i });
    fireEvent.click(speakButton); // Start speaking
    window.speechSynthesis.speaking = true; // Manually set to true to simulate actual speaking

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    expect(speakButton).toHaveTextContent('Stop');

    fireEvent.click(speakButton); // Click again to stop
    expect(mockCancel).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(speakButton).toHaveTextContent('Speak');
    });
  });

  test('should show alert if speech synthesis is not supported', async () => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined }); // Mock as unsupported

    render(<App />);
    const questionInput = screen.getByPlaceholderText('e.g., What is the capital of India?');
    const submitButton = screen.getByRole('button', { name: /get answer/i });

    fireEvent.change(questionInput, { target: { value: 'Test question' } });
    fireEvent.click(submitButton);
    await waitFor(() => expect(screen.getByText('Mocked answer for your question.')).toBeInTheDocument());

    const speakButton = screen.getByRole('button', { name: /speak/i });
    fireEvent.click(speakButton);

    expect(mockAlert).toHaveBeenCalledWith('Text-to-speech not supported');
  });

  // --- Speech-to-Text ---
  test('should start listening and update question input with transcript', async () => {
    render(<App />);
    const voiceInputButton = screen.getByRole('button', { name: /voice input/i });
    const questionInput = screen.getByPlaceholderText('e.g., What is the capital of India?');

    fireEvent.click(voiceInputButton);

    expect(mockStartRecognition).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Listening... Speak now!')).toBeInTheDocument();

    // Simulate onstart event
    mockRecognitionOnStart();
    expect(voiceInputButton).toHaveClass('animate-pulse');

    // Simulate a recognition result
    const mockTranscript = 'Hello world from voice';
    mockRecognitionOnResult({
      results: [[{ transcript: mockTranscript, confidence: 0.9 }]],
    });

    await waitFor(() => {
      expect(questionInput).toHaveValue(mockTranscript);
    });

    // Simulate onend event
    mockRecognitionOnEnd();
    await waitFor(() => {
      expect(screen.queryByText('Listening... Speak now!')).not.toBeInTheDocument();
      expect(voiceInputButton).not.toHaveClass('animate-pulse');
    });
  });

  test('should show alert if speech recognition is not supported', () => {
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined });
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined });

    render(<App />);
    const voiceInputButton = screen.getByRole('button', { name: /voice input/i });

    fireEvent.click(voiceInputButton);
    expect(mockAlert).toHaveBeenCalledWith('Speech recognition not supported in your browser');
  });

  // --- Stats Dashboard ---
  test('should show/hide stats dashboard when stats button is clicked', async () => {
    render(<App />);
    const statsButton = screen.getByRole('button', { name: /stats button/i });

    // Initially hidden
    expect(screen.queryByText('Your Statistics')).not.toBeInTheDocument();

    // Show stats
    fireEvent.click(statsButton);
    await waitFor(() => {
      expect(screen.getByText('Your Statistics')).toBeInTheDocument();
      expect(screen.getByText('Total Questions')).toBeInTheDocument();
      expect(screen.getByText('Score Points')).toBeInTheDocument();
      expect(screen.getByText('Categories Explored')).toBeInTheDocument();
    });

    // Hide stats
    fireEvent.click(statsButton);
    await waitFor(() => {
      expect(screen.queryByText('Your Statistics')).not.toBeInTheDocument();
    });
  });

  test('should clear all history and stats when "Clear All" is confirmed', async () => {
    localStorage.setItem('history', '[{"question":"Q","answer":"A"}]');
    localStorage.setItem('categoryStats', '{"General":1}');
    localStorage.setItem('score', '10');
    localStorage.setItem('streak', '5');
    localStorage.setItem('darkMode', 'true'); // Should not clear this

    render(<App />);

    // Open stats
    fireEvent.click(screen.getByRole('button', { name: /stats button/i }));
    await waitFor(() => expect(screen.getByText('Your Statistics')).toBeInTheDocument());

    const clearAllButton = screen.getByRole('button', { name: 'Clear All' });
    fireEvent.click(clearAllButton);

    expect(mockConfirm).toHaveBeenCalledWith('Clear all history and stats?');
    expect(localStorage.clear).toHaveBeenCalledTimes(1);

    // Verify UI updates
    expect(screen.getByText('0 Total Questions')).toBeInTheDocument();
    expect(screen.getByText('0 Score Points')).toBeInTheDocument();
    expect(screen.getByText('0 Categories Explored')).toBeInTheDocument();
    expect(screen.getByText('0 Streak')).toBeInTheDocument();
    expect(localStorage.getItem('darkMode')).toBe('true'); // Should retain dark mode
    expect(screen.queryByText(/Question History/i)).not.toBeInTheDocument();
  });

  test('should not clear history and stats if "Clear All" is cancelled', async () => {
    const savedHistory = '[{"question":"Q","answer":"A"}]';
    const savedStats = '{"General":1}';
    localStorage.setItem('history', savedHistory);
    localStorage.setItem('categoryStats', savedStats);
    mockConfirm.mockReturnValue(false); // Cancel the confirmation

    render(<App />);

    // Open stats
    fireEvent.click(screen.getByRole('button', { name: /stats button/i }));
    await waitFor(() => expect(screen.getByText('Your Statistics')).toBeInTheDocument());

    const clearAllButton = screen.getByRole('button', { name: 'Clear All' });
    fireEvent.click(clearAllButton);

    expect(mockConfirm).toHaveBeenCalledWith('Clear all history and stats?');
    expect(localStorage.clear).not.toHaveBeenCalled();

    // Verify UI retains old values
    expect(screen.getByText('1 Total Questions')).toBeInTheDocument();
    expect(screen.getByText('1 Categories Explored')).toBeInTheDocument();
    expect(localStorage.getItem('history')).toBe(savedHistory);
    expect(localStorage.getItem('categoryStats')).toBe(savedStats);
  });
});