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
import { pageNavigationPlugin } from "@react-pdf-viewer/page-navigation";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/page-navigation/lib/styles/index.css";

import { saveReadingProgress } from "../components/BookManager";
import { supabase } from "../supabase";
import { openDB } from "../components/IndexedDB";

// IndexedDB 中取得書籍
const getBookById = async (id) => {
    const db = await openDB();
    const transaction = db.transaction(["books"], "readonly");
    const store = transaction.objectStore("books");
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
            const result = request.result;
            if (result) resolve(result);
            else reject(new Error("找不到書籍"));
        };
        request.onerror = (e) => reject(e.target.error);
    });
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

    // 插件
    const defaultLayoutPluginInstance = defaultLayoutPlugin();
    const pageNavigationPluginInstance = pageNavigationPlugin();
    const { jumpToPage } = pageNavigationPluginInstance;

    // 取得使用者 ID
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
            const uid = await getUserId();
            if (!uid) {
                console.warn("未登入，無法取得書籍");
                setLoading(false);
                return;
            }

            try {
                const book = await getBookById(bookId);
                setSelectedBook(book);

                // 讀取上次閱讀頁面
                const { data, error } = await supabase
                    .from("reading_progress")
                    .select("page_number")
                    .eq("user_id", uid)
                    .eq("book_id", bookId)
                    .single();

                if (error && error.code !== "PGRST116") {
                    console.error("無法取得進度:", error.message);
                } else if (data) {
                    setLastReadPage(data.page_number);
                    setPageNumber(data.page_number);
                }
            } catch (err) {
                toast({
                    title: "錯誤",
                    description: "無法載入書籍，請稍後再試。",
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                });
                console.error("載入書籍錯誤:", err);
            } finally {
                setLoading(false);
            }
        };

        initialize();
    }, [bookId]);

    const isLoading = loading || !selectedBook;

    const handleBackToDashboard = () => {
        navigate("/dashboard");
    };

    // 處理頁碼變動
    const handlePageChange = (newPageNumber) => {
        const page = newPageNumber + 1; // PDF 頁碼從 0 開始，顯示從 1 開始
        setPageNumber(page);
        if (userId) {
            saveReadingProgress(userId, bookId, page, totalPages);
        }
    };

    // 當 PDF 載入完畢
    const handleDocumentLoad = (e) => {
        const numPages = e.doc.numPages;
        setTotalPages(numPages);

        if (typeof jumpToPage === "function" && lastReadPage !== null) {
            jumpToPage(lastReadPage - 1); // jumpToPage 是 0-based
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
                <Heading size="xl" color={darkMode ? "white" : "gray.800"}>
                    {selectedBook ? selectedBook.name : "載入中..."}
                </Heading>

                {lastReadPage !== null && (
                    <Text mt={2} color={darkMode ? "gray.300" : "gray.600"}>
                        上次閱讀到第 {lastReadPage} 頁
                    </Text>
                )}

                <HStack spacing={4} mt={4}>
                    <Button
                        colorScheme={darkMode ? "gray" : "purple"}
                        onClick={() => setDarkMode(!darkMode)}
                    >
                        {darkMode ? "關閉夜間模式" : "開啟夜間模式"}
                    </Button>
                    <Button colorScheme="purple" onClick={handleBackToDashboard}>
                        返回 Dashboard
                    </Button>
                </HStack>

                <Text mt={4}>
                    第 {pageNumber} / {totalPages} 頁
                </Text>
                <Progress value={(pageNumber / totalPages) * 100} colorScheme="purple" mt={2} />
            </Box>

            <VStack spacing={4} px={4}>
                {isLoading ? (
                    <Spinner size="xl" />
                ) : (
                    <Box w="full" h="600px" overflow="hidden">
                        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.6.172/build/pdf.worker.min.js">
                            <Viewer
                                fileUrl={selectedBook.file_url}
                                ref={viewerRef}
                                plugins={[defaultLayoutPluginInstance, pageNavigationPluginInstance]}
                                onPageChange={({ currentPage }) => handlePageChange(currentPage)}
                                onDocumentLoad={handleDocumentLoad}
                            />
                        </Worker>
                    </Box>
                )}
            </VStack>
        </Box>
    );
}

export default ReaderPage;
