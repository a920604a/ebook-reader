import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBooksFromSupabase, uploadToSupabase, deleteFromSupabase } from "../components/BookManager";
import { supabase } from '../supabase';
import { v4 as uuidv4 } from "uuid";
import { getAllBooksFromIndexedDB, saveBookToIndexedDB, deleteBookFromIndexedDB } from "../components/IndexedDB";
import { Box, Button, Input, Spinner, Text, VStack, HStack, Card, Heading, useToast } from "@chakra-ui/react";

function Dashboard() {
    const navigate = useNavigate();
    const [books, setBooks] = useState([]);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState(""); // 用戶名稱
    const toast = useToast(); // 用於顯示提示訊息

    const getUserId = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserName(user.user_metadata?.full_name || "親愛的用戶");
            return user.id;
        }
        return null;
    };

    useEffect(() => {
        const fetchBooks = async () => {
            setLoading(true);
            const userId = await getUserId();
            if (!userId) {
                console.warn("未登入，無法獲取書籍");
                setLoading(false);
                return;
            }

            const localBooks = await getAllBooksFromIndexedDB();
            const supabaseBooks = await getBooksFromSupabase(userId);

            const missingBooks = supabaseBooks.filter(
                sb => !localBooks.some(lb => lb.id === sb.id)
            );

            for (const book of missingBooks) {
                await saveBookToIndexedDB(book, userId, book.file_url);
            }

            const allBooks = [...localBooks, ...missingBooks];
            setBooks(allBooks);
            setLoading(false);
        };

        fetchBooks();
    }, []);

    const handleUpload = () => {
        if (file) {
            setLoading(true);
            const reader = new FileReader();
            reader.onload = async (e) => {
                const newBook = {
                    id: uuidv4(),
                    name: file.name,
                    data: e.target.result,
                };

                const userId = await getUserId();
                if (!userId) {
                    toast({
                        title: "未登入",
                        description: "請先登入後再上傳書籍",
                        status: "error",
                        duration: 3000,
                        isClosable: true,
                    });
                    setLoading(false);
                    return;
                }

                const fileUrl = await uploadToSupabase(newBook, userId);
                if (!fileUrl) {
                    toast({
                        title: "上傳失敗",
                        description: "檔案 URL 取得失敗，無法儲存至 IndexedDB",
                        status: "error",
                        duration: 3000,
                        isClosable: true,
                    });
                    setLoading(false);
                    return;
                }

                await saveBookToIndexedDB(newBook, userId, fileUrl);
                const updatedBooks = await getAllBooksFromIndexedDB();
                setBooks(updatedBooks);
                setFile(null);
                setLoading(false);
                toast({
                    title: "上傳成功",
                    description: "電子書已成功上傳並儲存。",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
            };
            reader.readAsDataURL(file);
        } else {
            toast({
                title: "錯誤",
                description: "請選擇一個檔案來上傳！",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
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
        toast({
            title: "刪除成功",
            description: `書籍 ${name} 已成功刪除！`,
            status: "info",
            duration: 3000,
            isClosable: true,
        });
    };

    const handleRead = (id) => {
        navigate(`/reader/${id}`);
    };

    return (
        <Box p={8} bg="gray.100" minH="100vh">
            <VStack spacing={6} align="stretch">
                <Heading as="h1" size="xl" color="purple.600">
                    電子書目錄
                </Heading>

                {/* 歡迎語 */}
                {userName && (
                    <Text fontSize="xl" color="purple.500" mb={4}>
                        歡迎回來，{userName}！
                    </Text>
                )}

                <HStack spacing={4}>
                    <Input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setFile(e.target.files[0])}
                        variant="flushed"
                        size="lg"
                        w="auto"
                    />
                    <Button
                        onClick={handleUpload}
                        colorScheme="purple"
                        size="lg"
                        isLoading={loading}
                    >
                        上傳電子書
                    </Button>
                </HStack>

                {loading ? (
                    <HStack justify="center" align="center" spacing={4}>
                        <Spinner size="xl" color="purple.500" />
                        <Text fontSize="lg" color="gray.600">
                            載入中...
                        </Text>
                    </HStack>
                ) : (
                    <VStack spacing={4} align="stretch">
                        {books.length > 0 ? (
                            books.map((book) => (
                                <Card key={book.id} p={5} shadow="lg" rounded="md" bg="white">
                                    <HStack justify="space-between" align="center">
                                        <Text fontSize="xl" fontWeight="bold">
                                            {book.name}
                                        </Text>
                                        <HStack spacing={4}>
                                            <Button
                                                onClick={() => handleRead(book.id)}
                                                colorScheme="green"
                                                size="sm"
                                            >
                                                閱讀
                                            </Button>
                                            <Button
                                                onClick={() => handleDelete(book.id, book.name)}
                                                colorScheme="red"
                                                size="sm"
                                            >
                                                刪除
                                            </Button>
                                        </HStack>
                                    </HStack>
                                </Card>
                            ))
                        ) : (
                            <Text color="gray.500">目前沒有任何電子書。</Text>
                        )}
                    </VStack>
                )}
            </VStack>
        </Box>
    );
}

export default Dashboard;
