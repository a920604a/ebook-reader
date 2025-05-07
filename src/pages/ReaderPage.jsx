import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { openDB } from "../components/IndexedDB";


const getBookById = async (id) => {
    const db = await openDB();
    const transaction = db.transaction(["books"], "readonly");
    const store = transaction.objectStore("books");
    console.log("getBookById id", id);
    const book = await new Promise((resolve, reject) => {
        const request =  store.get(id);
        request.onsuccess = () => {
            const result = request.result;
            if (result) {
                console.log("取得書籍資料:", result);
                resolve(result);
            } else {
                reject(new Error("找不到書籍"));
            }
        };
        
        request.onerror = (e) => reject(e.target.error);
    });
    console.log("getBookById book", book);
    return book;
};

function ReaderPage() {
    const { bookId } = useParams();
    const [selectedBook, setSelectedBook] = useState(null);
    const defaultLayout = defaultLayoutPlugin(); // 直接调用，移出 useMemo

    useEffect(() => {
        const fetchBook = async () => {
            const book = await getBookById(bookId);
            
            setSelectedBook(book);
        };
        fetchBook();
    }, [bookId]);

    const isLoading = !selectedBook;

    return (
        <div className="p-4 bg-gray-100 min-h-screen">
            {isLoading ? (
                <p>加载中...</p>
            ) : (
                <>
                    <h1 className="text-xl font-bold mb-4">{selectedBook.name}</h1>
                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.6.172/build/pdf.worker.min.js">
                        <Viewer
                            fileUrl={selectedBook.file_url}
                            plugins={[defaultLayout]}
                            className="shadow rounded"
                        />
                    </Worker>

                </>
            )}
        </div>
    );
}

export default ReaderPage;
