import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Box,
    Heading,
    Spinner,
    Text,
    VStack,
    HStack,
    Button,
    Progress,
    useToast,
} from "@chakra-ui/react";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { saveReadingProgress } from '../components/BookManager';
import { supabase } from '../supabase';
import { openDB } from "../components/IndexedDB";

// 取得書籍的函式
const getBookById = async (id) => {
    const db = await openDB();
    const transaction = db.transaction(["books"], "readonly");
    const store = transaction.objectStore("books");
    const book = await new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            const result = request.result;
            if (result) {
                resolve(result);
            } else {
                reject(new Error("找不到書籍"));
            }
        };
        request.onerror = (e) => reject(e.target.error);
    });
    return book;
};

function ReaderPage() {
    const navigate = useNavigate();
    const { bookId } = useParams();
    const [selectedBook, setSelectedBook] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [darkMode, setDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [lastReadPage, setLastReadPage] = useState(null);
    const toast = useToast();
    const viewerRef = useRef(null);
    const defaultLayoutPluginInstance = defaultLayoutPlugin();

    // 取得用戶 ID 的函式
    const getUserId = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            return user.id;
        }
        return null;
    };

    useEffect(() => {
        const initialize = async () => {
            const userId = await getUserId();
            if (!userId) {
                console.warn("未登入，無法獲取書籍");
                setLoading(false);
                return;
            }

            try {
                const book = await getBookById(bookId);
                setSelectedBook(book);

                // 取得上次瀏覽進度
                const { data, error } = await supabase
                    .from("reading_progress")
                    .select("page_number")
                    .eq("user_id", userId)
                    .eq("book_id", bookId)
                    .single();

                if (error && error.code !== "PGRST116") {
                    console.error("無法取得進度:", error.message);
                } else if (data) {
                    setLastReadPage(data.page_number);
                    setPageNumber(data.page_number);
                }

            } catch (error) {
                toast({
                    title: "錯誤",
                    description: "無法載入書籍，請稍後再試。",
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                });
            } finally {
                setLoading(false);
            }
        };

        initialize();
    }, [bookId, toast]);

    const isLoading = loading || !selectedBook;

    // 返回到 Dashboard 頁面
    const handleBackToDashboard = () => {
        navigate('/dashboard');
    };

    // 處理頁面變更
    const handlePageChange = (newPageNumber) => {
        if (userId) {
            setPageNumber(newPageNumber);
            saveReadingProgress(userId, bookId, newPageNumber, totalPages);
        }
    };

    return (
        <Box
            bg={darkMode ? "gray.800" : "gray.100"}
            color={darkMode ? "white" : "black"}
            minH="100vh"
            pb={8}
        >
            <Box
                position="sticky"
                top="0"
                zIndex="10"
                bg={darkMode ? "gray.900" : "white"}
                shadow="md"
                p={4}
                mb={4}
            >
                <Heading size="xl" fontWeight="bold" color={darkMode ? "white" : "gray.800"}>
                    {selectedBook ? selectedBook.name : "載入中..."}
                </Heading>

                {lastReadPage !== null && (
                    <Text mt={2} color={darkMode ? "gray.300" : "gray.600"}>
                        上次瀏覽到第 {lastReadPage} 頁
                    </Text>
                )}
                
                <HStack spacing={4} mt={4}>
                    <Button
                        colorScheme={darkMode ? "gray" : "purple"}
                        onClick={() => setDarkMode(!darkMode)}
                    >
                        {darkMode ? "關閉夜間模式" : "開啟夜間模式"}
                    </Button>
                    <Button
                        colorScheme="purple"
                        onClick={handleBackToDashboard}
                    >
                        返回 Dashboard
                    </Button>
                </HStack>

                <Text mt={4}>
                    {pageNumber} / {totalPages} 頁
                </Text>
                <Progress value={(pageNumber / totalPages) * 100} colorScheme="purple" mt={2} />
            </Box>
            <VStack spacing={4} px={4}>
                {isLoading ? (
                    <Spinner />
                ) : (
                    <Box w="full" h="600px" overflow="hidden">
                        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.6.172/build/pdf.worker.min.js">
                            <Viewer
                                fileUrl={selectedBook.file_url}
                                ref={viewerRef}
                                plugins={[defaultLayoutPluginInstance]}
                                onPageChange={({ currentPage }) => handlePageChange(currentPage)}
                                onDocumentLoad={(e) => setTotalPages(e.doc.numPages)}
                                className="rounded-lg"
                            />
                        </Worker>
                    </Box>
                )}
            </VStack>
        </Box>
    );
}

export default ReaderPage;
