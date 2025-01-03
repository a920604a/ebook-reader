import { useState } from "react";
import { useNavigate } from "react-router-dom";

function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = () => {
        if (username && password) {
            localStorage.setItem("user", JSON.stringify({ username }));
            navigate("/dashboard");
        } else {
            alert("請輸入帳號和密碼");
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="bg-white p-8 rounded shadow-md w-96">
                <h2 className="text-2xl font-bold mb-4">登入</h2>
                <input
                    type="text"
                    placeholder="帳號"
                    className="w-full mb-2 p-2 border"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="密碼"
                    className="w-full mb-4 p-2 border"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button
                    className="bg-blue-500 text-white p-2 w-full"
                    onClick={handleLogin}
                >
                    登入
                </button>
            </div>
        </div>
    );
}

export default LoginPage;
