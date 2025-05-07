import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBooksFromSupabase, uploadToSupabase, deleteFromSupabase } from "../components/BookManager";
import { supabase } from '../supabase';
import { v4 as uuidv4 } from "uuid";
import { getAllBooksFromIndexedDB, saveBookToIndexedDB, deleteBookFromIndexedDB} from "../components/IndexedDB";



function Dashboard() {
    const navigate = useNavigate();
    const [books, setBooks] = useState([]);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false); // <--- 新增
    

    const getUserId = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        return user ? user.id : null;
    };

    useEffect(() => {
        const fetchBooks = async () => {
            setLoading(true); // 開始 loading
            const userId = await getUserId();
            if (!userId) {
                console.warn("未登入，無法獲取書籍");
                setLoading(false);
                return;
            }

            const localBooks = await getAllBooksFromIndexedDB();
            const supabaseBooks = await getBooksFromSupabase(userId);

            
            // 3. 找出僅存在於 Supabase 但不存在於 IndexedDB 的書籍
            const missingBooks = supabaseBooks.filter(
                sb => !localBooks.some(lb => lb.id === sb.id)
            );

            for (const book of missingBooks) {
                await saveBookToIndexedDB(book, userId, book.file_url);
            }

            const allBooks = [...localBooks, ...missingBooks];
            setBooks(allBooks);

            setBooks(supabaseBooks);
            setLoading(false); // 結束 loading
        };

        fetchBooks();
    }, []);

    const handleUpload = () => {
        if (file) {
            setLoading(true); // 開始 loading
            const reader = new FileReader();
            reader.onload = async (e) => {
                const newBook = {
                    id: uuidv4(),
                    name: file.name,
                    data: e.target.result,
                };

                const userId = await getUserId();
                if (!userId) {
                    console.warn("未登入，跳過 Supabase 同步");
                    setLoading(false); // 結束 loading
                    return;
                }

                const fileUrl = await uploadToSupabase(newBook, userId);
                if (!fileUrl) {
                    console.error("檔案 URL 未取得，無法儲存至 IndexedDB");
                    setLoading(false);
                    return;
                }

                
                await saveBookToIndexedDB(newBook, userId, fileUrl);

                const updatedBooks = await getAllBooksFromIndexedDB();
                setBooks(updatedBooks);
                setFile(null);
                setLoading(false); // 結束 loading
            };
            reader.readAsDataURL(file);
        }
        else{
            alert("請選擇一個檔案來上傳！");
        }
    };

    const handleDelete = async (id, name) => {
        
        
        await deleteBookFromIndexedDB(id);

        const userId = await getUserId();
        if (userId) {
            await deleteFromSupabase(name, userId);
        }

        const updatedBooks = await getAllBooksFromIndexedDB();
        setBooks(updatedBooks);
    };

    const handleRead = (id) => {
        navigate(`/reader/${id}`);
    };

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">電子書目錄</h1>

            <div className="flex items-center mb-4">
                <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="mr-2"
                />
                <button
                    onClick={handleUpload}
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                >
                    上傳電子書
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center mt-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
                    <span className="ml-4 text-gray-600 text-lg">載入中...</span>
                </div>
            ) : (
                books.length > 0 ? (
                    <ul className="space-y-2">
                        {books.map((book) => (
                            <li
                                key={book.id}
                                className="flex justify-between items-center bg-white p-4 shadow rounded"
                            >
                                <span>{book.name}</span>
                                <div>
                                    <button
                                        onClick={() => handleRead(book.id)}
                                        className="bg-green-500 text-white px-4 py-2 rounded mr-2"
                                    >
                                        閱讀
                                    </button>
                                    <button
                                        onClick={() => handleDelete(book.id, book.name)}
                                        className="bg-red-500 text-white px-4 py-2 rounded"
                                    >
                                        刪除
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>目前沒有任何電子書。</p>
                )
            )}
        </div>
    );
}

export default Dashboard;
