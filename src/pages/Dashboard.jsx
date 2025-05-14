import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBooksFromSupabase, uploadToSupabase, deleteFromSupabase, getReadingProgress } from "../components/BookManager";
import { supabase } from "../supabase";
import { v4 as uuidv4 } from "uuid";
import { clearIndexedDB, getAllBooksFromIndexedDB, saveBookToIndexedDB, deleteBookFromIndexedDB } from "../components/IndexedDB";
import {
    Box, Button, Input, Text, VStack, HStack, Card, Heading, useToast, Divider, Badge, useDisclosure,  Select, Progress, FormControl, FormLabel, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter
} from "@chakra-ui/react";
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function Dashboard() {
    const navigate = useNavigate();
    const [books, setBooks] = useState([]);
    const [file, setFile] = useState(null);
    const [category, setCategory] = useState("");
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState("");
    const [stats, setStats] = useState({ total: 0, read: 0, unread: 0, reading: 0 });
    const [searchQuery, setSearchQuery] = useState(""); // 搜尋關鍵字
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(""); // 篩選選擇的分類
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();

    const categories = ["科技", "小說", "教育", "自我提升", "歷史", "其他"];

    // 分類圓餅圖資料
    const getCategoryData = () => {
        const categoryCount = books.reduce((acc, book) => {
            if (book.category) {
                acc[book.category] = (acc[book.category] || 0) + 1;
            }
            return acc;
        }, {});

        return {
            labels: Object.keys(categoryCount),
            datasets: [{
                data: Object.values(categoryCount),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#FF9F40', '#C5E1A5'],
            }]
        };
    };

    // 已讀/未讀/正在讀圓餅圖資料
    const getStatusData = () => {
        const readCount = books.filter(b =>  b.lastPage === b.totalPages ).length;
        const unreadCount = books.filter(b => b.lastPage === 0).length;
        const readingCount = books.filter(b => b.lastPage > 0 && b.lastPage < b.totalPages).length;

        return {
            labels: ["已閱讀", "未閱讀", "正在讀"],
            datasets: [{
                data: [readCount, unreadCount, readingCount],
                backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56'],
            }]
        };
    };

    const getUserId = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserName(user.user_metadata?.full_name || "親愛的用戶");
            return user.id;
        }
        return null;
    };

    useEffect(() => {
        const initialize = async () => {
            setLoading(true);
            const userId = await getUserId();
            
            if (!userId) {
                console.warn("未登入，無法獲取書籍");
                setLoading(false);
                return;
            }


            const isFirstLoad = !sessionStorage.getItem("initialized");
            if (isFirstLoad) {
                console.log("首次載入，清除 IndexedDB...");
                await clearIndexedDB();
                sessionStorage.setItem("initialized", "true");
            }


            const localBooks = await getAllBooksFromIndexedDB();
            const supabaseBooks = await getBooksFromSupabase(userId);
            
            console.log("載入書籍...");

            const missingBooks = supabaseBooks.filter(
                sb => !localBooks.some(lb => lb.id === sb.id)
            );

            for (const book of missingBooks) {
                await saveBookToIndexedDB(book, userId, book.file_url);
            }

            console.log(" supabaseBooks", supabaseBooks);
            console.log(" localBooks", localBooks);
            const allBooks = [...localBooks, ...missingBooks];
            let total = 0, read = 0, unread = 0, reading = 0;

            for (const book of allBooks) {
                const progress = await getReadingProgress (book.id, userId);
                book.lastPage = progress.page_number || 0;
                book.totalPages = progress.total_page  || 100; // 假設每本書有 100 頁
                book.last_read_time = book.last_read_time || new Date().toISOString();
                total += 1;
                if (book.lastPage === 0) unread += 1;
                else if (book.status === 'reading') reading += 1;
                else read += 1;
            }
            console.log("書籍載入完成", allBooks);

            setBooks(allBooks);
            setStats({ total, read, unread, reading });
            setLoading(false);
        };

        initialize();
    }, []);

    // 搜尋功能：過濾書籍名稱
    const filteredBooks = books.filter((book) => {
        return book.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // 篩選功能：根據分類過濾書籍
    const filteredByCategory = filteredBooks.filter((book) => {
        return selectedCategoryFilter ? book.category === selectedCategoryFilter  : true;
    });

    const handleFileUpload = async () => {
    if (!file || !category) {
        toast({
            title: "上傳失敗",
            description: "請選擇檔案和分類標籤。",
            status: "error",
            duration: 2000,
            isClosable: true,
        });
        return;
    }

    setLoading(true);

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

    // 使用 FileReader 讀取檔案
    const reader = new FileReader();
    reader.onload = async (e) => {
        const newBook = {
            id: uuidv4(),
            name: file.name,
            category: category,
            data: e.target.result, // 使用 FileReader 讀取的檔案數據
            // lastPage: 0,
            // totalPages: 100, // TODO: 預設100頁，reader 讀取後更新
        };

        // 上傳檔案至 Supabase
        const fileUrl = await uploadToSupabase(newBook, userId);
        // const fileName = uuidv4() + "-" + file.name;
        // const { data, error } = await supabase.storage.from("ebooks").upload(fileName, file);

        if (!fileUrl) {
            setLoading(false);
            toast({
                title: "上傳失敗",
                description: "檔案上傳失敗，請再試一次。",
                status: "error",
                duration: 2000,
                isClosable: true,
            });
            return;
        }

        // 儲存書籍資料
        // newBook.file_url = data?.Key;

        // 儲存書籍資料到 IndexedDB
        await saveBookToIndexedDB(newBook, userId, fileUrl);

        // 更新書籍列表
        const updatedBooks = await getAllBooksFromIndexedDB();
        setBooks(updatedBooks);

        setFile(null);
        setCategory("");
        setLoading(false);

        toast({
            title: "上傳成功",
            description: "電子書已成功上傳並儲存。",
            status: "success",
            duration: 3000,
            isClosable: true,
        });

        // 關閉彈跳視窗
        onClose();
    };

    reader.readAsDataURL(file);
};

      // 刪除書籍
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
    // 開始閱讀
    const handleRead = (id) => {
        navigate(`/reader/${id}`);
    };

    return (
        <Box p={8} bg="gray.100" minH="100vh">
            <Heading as="h1" size="xl" color="purple.600">電子書目錄</Heading>
            {userName && <Text fontSize="xl" color="purple.500" mb={4}>歡迎回來，{userName}！</Text>}
            <Divider mb={6} />

            {/* 搜尋功能 */}
            <FormControl mb={4}>
                <FormLabel>搜尋書籍</FormLabel>
                <Input
                    type="text"
                    placeholder="輸入書名搜尋"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </FormControl>

            {/* 篩選功能 */}
            <FormControl mb={6}>
                <FormLabel>選擇分類</FormLabel>
                <Select value={selectedCategoryFilter} onChange={(e) => setSelectedCategoryFilter(e.target.value)}>
                    <option value="">所有分類</option>
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </Select>
            </FormControl>

            {/* 上傳電子書按鈕 */}
            <Button colorScheme="teal" onClick={onOpen} mb={6}>
                上傳電子書
            </Button>

            {/* 彈跳視窗 */}
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>上傳電子書</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4}>
                            <FormControl isRequired>
                                <FormLabel>選擇檔案</FormLabel>
                                <Input type="file" onChange={(e) => setFile(e.target.files[0])} />
                            </FormControl>
                            <FormControl isRequired>
                                <FormLabel>選擇分類</FormLabel>
                                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                                    <option value="">選擇分類</option>
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </Select>
                            </FormControl>
                        </VStack>
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme="blue" onClick={handleFileUpload} isLoading={loading}>
                            上傳
                        </Button>
                        <Button colorScheme="gray" onClick={onClose}>取消</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

          {/* 統計資料 */}
            <Text fontSize="lg" mb={4}>總書籍數量: {stats.total} / 已讀: {stats.read} / 未讀: {stats.unread} / 正在讀: {stats.reading}</Text>


            {/* 書籍列表 */}
            <VStack spacing={4} width="100%">
                {filteredByCategory.map((book) => (
                    <Card key={book.id} bg="white" w="100%" p={4} shadow="md">
                        <HStack justify="space-between">
                            <Text fontSize="lg" fontWeight="bold">{book.name}</Text>
                            {/* <Badge colorScheme={book.lastPage > 0 ? "green" : "red"}>
                                {book.lastPage > 0 ? "已閱讀" : "未閱讀"}
                            </Badge> */}
                            <Badge colorScheme={
                                book.lastPage === book.totalPages || book.lastPage === book.totalPages -1 
                                    ? "green"
                                    : book.lastPage > 0
                                    ? "yellow"
                                    : "red"
                            }>
                                {book.lastPage === book.totalPages || book.lastPage === book.totalPages -1 
                                    ? "已閱讀"
                                    : book.lastPage > 0
                                    ? "正在讀"
                                    : "未閱讀"}
                            </Badge>

                            <Badge colorScheme="purple"> 
                                {book.category}
                            </Badge>
                        </HStack>
                        <Progress value={(book.lastPage / book.totalPages) * 100} colorScheme="green" size="sm" mt={2} />
                        <HStack mt={2}>
                            
                            <Button onClick={() => handleRead(book.id)} colorScheme="teal" size="sm">
                                                閱讀
                                            </Button>
                            
                            <Button onClick={() => handleDelete(book.id, book.name)} colorScheme="red" size="sm">
                                                刪除
                                            </Button>
                        </HStack>
                    </Card>
                ))}
            </VStack>       
            {/* 底部圓餅圖 */}
            <HStack mt={8} spacing={8} justify="center">
                <Box width="45%">
                    <Doughnut data={getCategoryData()}
                    options={{
                            responsive: true,
                            plugins: {
                                doughnutlabel: {
                                    labels: [
                                        {
                                            text: '總數',
                                            font: {
                                                size: '20'
                                            },
                                            color: '#36A2EB'
                                        },
                                    ],
                                },
                            },
                        }} />
                </Box>
                <Box width="45%">
                    <Doughnut data={getStatusData()} 
                    options={{
                        responsive: true,
                        plugins: {
                            doughnutlabel: {
                                labels: [
                                    {
                                        text: '總數',
                                        font: {
                                            size: '20'
                                        },
                                        color: '#36A2EB'
                                    },
                                ],
                            },
                        },
                    }} />
                </Box>
            </HStack>
            </Box>
    );
}

export default Dashboard;
