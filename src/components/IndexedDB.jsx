export const clearIndexedDB = async () => {
    return new Promise((resolve, reject) => {
    console.log("清除 IndexedDB...");
    const request = indexedDB.deleteDatabase("ebookStore");
    request.onsuccess = () => {
        console.log("IndexedDB 已成功清除");
        resolve();
    };
    request.onerror = (event) => {
        console.error("清除 IndexedDB 失敗", event);
        reject(event);
    };
    request.onblocked = () => {
        console.warn("清除 IndexedDB 被阻止，請關閉所有其他頁籤後再試");
    };
    });
};


// 取得所有書籍
export const getAllBooksFromIndexedDB = async () => {
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

// 儲存書籍 metadata
export const saveBookToIndexedDB = async (book, userId,  fileUrl = "" ) => {
    const db = await openDB();
    const transaction = db.transaction(["books"], "readwrite");
    const store = transaction.objectStore("books");

    const bookMetadata = {
        id: book.id,
        name: book.name,
        user_id: userId,
        // data: book.data, // 這裡保留原始的 data
        // file_url: fileUrl,
        category: book.category || "",
    };
    // 如果 fileUrl 存在，則加入 metadata
    if (fileUrl) {
        bookMetadata.file_url = fileUrl;
    }
    


    console.log("Saving book metadata on IndexedDB:", bookMetadata);
    store.put(bookMetadata);

    return bookMetadata.id;
};

// 刪除書籍
export const deleteBookFromIndexedDB = async (id) => {
    const db = await openDB();
    const transaction = db.transaction(["books"], "readwrite");
    const store = transaction.objectStore("books");
    store.delete(id);
    console.log("Deleting book on IndexedDB:", id);
};


export const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("ebookStore", 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("books")) {
                db.createObjectStore("books", { keyPath: "id" });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
};