import { supabase } from '../supabase';

function LoginPage() {

  const handleGitHubLogin = async () => {
    // 開始 GitHub OAuth 流程
    const {  error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: 'https://a920604a.github.io/ebook-reader/dashboard'
        // redirectTo: 'http://localhost:3000/ebook-reader/dashboard'
      }
    });

    if (error) {
      console.error('GitHub 登入失敗:', error.message);
      alert('GitHub 登入失敗：' + error.message);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">登入</h2>
        
        <button
          className="bg-blue-500 text-white p-2 w-full"
          onClick={handleGitHubLogin}
        >
          使用 GitHub 登入
        </button>
      </div>
    </div>
  );
}

export default LoginPage;
