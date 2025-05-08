import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
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
import { openDB } from "../components/IndexedDB";

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
    const { bookId } = useParams();
    const [selectedBook, setSelectedBook] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [darkMode, setDarkMode] = useState(false);
    const toast = useToast();

    const viewerRef = useRef(null);
    const defaultLayoutPluginInstance = defaultLayoutPlugin();

    useEffect(() => {
        const fetchBook = async () => {
            try {
                const book = await getBookById(bookId);
                setSelectedBook(book);

                const bookmark = localStorage.getItem(`bookmark-${bookId}`);
                if (bookmark) {
                    setPageNumber(parseInt(bookmark));
                }
            } catch (error) {
                toast({
                    title: "錯誤",
                    description: "無法載入書籍，請稍後再試。",
                    status: "error",
                    duration: 3000,
                    isClosable: true,
                });
            }
        };
        fetchBook();
    }, [bookId, toast]);

    const isLoading = !selectedBook;

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
                <HStack spacing={4} mt={4}>
                    <Button
                        colorScheme={darkMode ? "gray" : "purple"}
                        onClick={() => setDarkMode(!darkMode)}
                    >
                        {darkMode ? "關閉夜間模式" : "開啟夜間模式"}
                    </Button>
                </HStack>
                <Text mt={4}>
                    {pageNumber} / {totalPages} 頁
                </Text>
                <Progress value={(pageNumber / totalPages) * 100} colorScheme="purple" />
            </Box>

            {isLoading ? (
                <VStack justify="center" align="center" spacing={4} minH="80vh">
                    <Spinner size="xl" color="purple.600" />
                    <Text fontSize="lg" color="purple.700">
                        正在加載書籍...
                    </Text>
                </VStack>
            ) : (
                <Box bg={darkMode ? "gray.700" : "white"} shadow="md" rounded="lg" mx="auto" p={4}>
                    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.6.172/build/pdf.worker.min.js">
                        <Viewer
                            fileUrl={selectedBook.file_url}
                            plugins={[defaultLayoutPluginInstance]}
                            onDocumentLoad={(e) => setTotalPages(e.doc.numPages)}
                            onPageChange={(e) => setPageNumber(e.currentPage + 1)}
                            ref={viewerRef}
                            className="rounded-lg"
                        />
                    </Worker>
                </Box>
            )}
        </Box>
    );
}

export default ReaderPage;
