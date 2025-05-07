import { useState } from 'react';
import { supabase } from '../supabase';

// GitHub Icon
const GitHubIcon = () => (
  <svg
    className="h-5 w-5 mr-2"
    aria-hidden="true"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path
      fillRule="evenodd"
      d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
      clipRule="evenodd"
    />
  </svg>
);

// Error Alert
const Alert = ({ message }) => (
  <div className="mb-4 bg-orange-50 !border-l-4 !border-orange-500 p-4 !text-orange-700 rounded-lg animate-fade-in">
    <p role="alert">{message}</p>
  </div>
);

function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: 'https://a920604a.github.io/ebook-reader/dashboard',
          // redirectTo: 'http://localhost:3000/ebook-reader/dashboard',
        },
      });

      if (error) {
        console.error('GitHub login failed:', error.message);
        setError(error.message);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('發生意外錯誤，請重試。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen !bg-gradient-to-br !from-purple-50 !to-blue-300 flex flex-col justify-center items-center p-4">
      <div className="max-w-xs w-full mx-auto sm:max-w-sm">
        <div className="text-center mb-8">
          <h1 className="mt-4 text-3xl font-semibold !text-gray-900 tracking-tight sm:text-4xl">eBook Reader</h1>
          <p className="mt-1 text-lg !text-gray-700 sm:text-xl">隨時隨地閱讀和管理你的電子書</p>
        </div>

        <div className="bg-white/80 !backdrop-blur-md py-8 px-6 shadow-lg rounded-xl !border !border-purple-200 transition-all duration-300 hover:shadow-xl">
          <h2 className="text-lg font-semibold !text-gray-800 mb-6 text-center sm:text-xl">登入你的帳戶</h2>

          {error && <Alert message={error} />}

          <button
            onClick={handleGitHubLogin}
            disabled={isLoading}
            className={`w-full flex items-center justify-center !bg-purple-600 hover:!bg-purple-800 !text-white py-3 px-4 rounded-xl shadow-md transition-all duration-300 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            aria-label="使用 GitHub 登入"
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5 mr-3 !text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <span className="flex items-center">
                <GitHubIcon />
                使用 GitHub 登入
              </span>
            )}
          </button>

          <p className="mt-6 text-center text-sm !text-gray-500 sm:text-base">
          登入即表示你同意我們的服務條款和隱私政策。
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;