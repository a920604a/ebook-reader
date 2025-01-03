import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { openDB } from "../components/OpenDB"; // 根据实际路径修改


// 获取所有书籍
const getBooks = async () => {
    const db = await openDB();
    const transaction = db.transaction(["books"], "readonly");
    const store = transaction.objectStore("books");
    const books = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
    return books;
};

// 保存书籍
const saveBook = async (book) => {
    const db = await openDB();
    const transaction = db.transaction(["books"], "readwrite");
    const store = transaction.objectStore("books");
    store.put(book);
};

function Dashboard() {
    const navigate = useNavigate();
    const [books, setBooks] = useState([]);
    const [file, setFile] = useState(null);

    useEffect(() => {
        const fetchBooks = async () => {
            const books = await getBooks();
            setBooks(books);
        };
        fetchBooks();
    }, []);

    const handleUpload = () => {
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const newBook = {
                    id: Date.now(),
                    name: file.name,
                    data: e.target.result, // base64 编码的 PDF
                };
                await saveBook(newBook); // 将书籍保存到 IndexedDB
                const updatedBooks = await getBooks(); // 获取更新后的书籍列表
                setBooks(updatedBooks);
                setFile(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDelete = async (id) => {
        const db = await openDB();
        const transaction = db.transaction(["books"], "readwrite");
        const store = transaction.objectStore("books");
        store.delete(id);
        const updatedBooks = await getBooks();
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
            {books.length > 0 ? (
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
                                    onClick={() => handleDelete(book.id)}
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
            )}
        </div>
    );
}

export default Dashboard;
