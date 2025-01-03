// 打开 IndexedDB 数据库
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
